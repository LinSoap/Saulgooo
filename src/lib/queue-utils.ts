import { agentQueue } from './queue';
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

/**
 * 添加一个新的 Agent 任务到队列
 */
export async function addAgentTask({
  id,
  workspaceId,
  userId,
  query,
}: {
  id?: string;
  workspaceId: string;
  userId: string;
  query: string;
}) {
  // 确保 userId 是字符串类型
  const userIdStr = String(userId);
  let session;
  // 确保 id 是可变的（用于新会话创建）
  let mutableId = id;

  // 1. 如果提供了 id，查找现有会话
  if (mutableId) {
    session = await prisma.agentSession.findUnique({
      where: { id: mutableId },
      select: { sessionId: true, bullJobId: true }
    });
    console.log('🔍 addAgentTask - Found existing session');
    console.log('🔍 addAgentTask - Session ID:', mutableId);
    console.log('🔍 addAgentTask - Session sessionId:', session?.sessionId);
    console.log('🔍 addAgentTask - Session bullJobId:', session?.bullJobId);
  }

  // 2. 如果找到了现有会话，使用它；否则创建新会话
  if (session) {
    // 检查是否有正在运行的任务
    if (session.bullJobId) {
      const job = await agentQueue.getJob(session.bullJobId);
      if (job) {
        const state = await job.getState();
        if (state === 'active' || state === 'waiting') {
          throw new Error('Session already has a running task');
        }
      }
    }
  } else {
    // 创建新会话
    const newId = createId(); // 使用 cuid2 生成 ID
    session = await prisma.agentSession.create({
      data: {
        id: newId,
        sessionId: null, // 可能为空（新对话）
        workspaceId,
        userId: userIdStr,
        title: query.slice(0, 50),
        messages: [],
      }
    });
    // 更新 id 为新创建的 ID
    mutableId = newId;
  }

  // 3. 创建任务
  const job = await agentQueue.add(
    'execute-query',
    {
      id: mutableId, // 传递数据库主键
      sessionId: session?.sessionId, // 传递实际的 sessionId
      query,
      workspaceId,
      userId: userIdStr,
    },
    {
      // 任务选项
      priority: 0,
      delay: 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      // 使用 ID 生成 jobId
      jobId: `task_${mutableId}_${Date.now()}`,
    }
  );

  // 4. 更新会话的 bullJobId
  await prisma.agentSession.update({
    where: { id: mutableId },
    data: {
      bullJobId: job.id,
      updatedAt: new Date()
    }
  });

  return {
    id: mutableId, // 返回数据库主键
    jobId: job.id,
    status: 'running' as const, // 任务进入运行状态
  };
}

/**
 * 获取任务状态 - 增强版，包含更多状态信息
 */
export async function getTaskStatus(id: string) {
  const session = await prisma.agentSession.findUnique({
    where: { id },
    select: {
      id: true,
      sessionId: true,
      bullJobId: true,
      messages: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  if (!session) {
    throw new Error('Session not found');
  }

  // 如果没有 job ID，说明没有任务
  if (!session.bullJobId) {
    return {
      ...session,
      status: 'idle' as const,
      progress: 0,
      isActive: false,
      attemptsMade: 0,
      attemptsRemaining: 3,
      processedAt: null,
      finishedAt: null,
      failedReason: null,
    };
  }

  // 从 BullMQ 获取实时状态
  try {
    const job = await agentQueue.getJob(session.bullJobId);
    if (!job) {
      // 任务已被清理，认为是完成状态
      return {
        ...session,
        status: 'completed' as const,
        progress: 100,
        isActive: false,
        attemptsMade: 3,
        attemptsRemaining: 0,
        processedAt: session.updatedAt,
        finishedAt: session.updatedAt,
        failedReason: null,
      };
    }

    const state = await job.getState();
    const progress = typeof job.progress === 'number' ? job.progress : 0;

    // 获取任务的尝试信息
    const attemptsMade = job.attemptsMade ?? 0;
    const attemptsRemaining = Math.max(0, (job.opts?.attempts ?? 3) - attemptsMade);

    return {
      ...session,
      status: state,
      progress,
      isActive: state === 'active',
      attemptsMade,
      attemptsRemaining,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
      failedReason: job.failedReason,
    };
  } catch (error) {
    console.error('Error getting job status:', error);
    return {
      ...session,
      status: 'error' as const,
      progress: 0,
      isActive: false,
      attemptsMade: 0,
      attemptsRemaining: 0,
      processedAt: null,
      finishedAt: null,
      failedReason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 取消任务
 */
export async function cancelTask(id: string) {
  const session = await prisma.agentSession.findUnique({
    where: { id },
    select: { bullJobId: true }
  });

  if (!session?.bullJobId) {
    throw new Error('No active task to cancel');
  }

  const job = await agentQueue.getJob(session.bullJobId);
  if (!job) {
    throw new Error('Task not found');
  }

  // 取消任务
  await job.remove();

  // 清理会话的 bullJobId
  await prisma.agentSession.update({
    where: { id },
    data: {
      bullJobId: null,
      updatedAt: new Date()
    }
  });

  return { success: true, message: 'Task cancelled' };
}

/**
 * 获取工作区的所有会话及其状态 - 优化版
 */
export async function getWorkspaceSessionsWithStatus(workspaceId: string) {
  const sessions = await prisma.agentSession.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,  // 添加内部 ID
      sessionId: true,  // Claude 的 sessionId
      title: true,
      bullJobId: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  if (sessions.length === 0) {
    return [];
  }

  // 批量获取所有活跃任务的状态
  const activeJobIds = sessions
    .map(session => session.bullJobId)
    .filter((jobId): jobId is string => jobId !== null);

  const jobStatuses = new Map<string, {
    status: string;
    progress: number;
    isActive: boolean;
    attemptsMade: number;
    attemptsRemaining: number;
    processedAt: number | null;
    finishedAt: number | null;
    failedReason: string | null;
  }>();

  if (activeJobIds.length > 0) {
    // 批量获取任务状态，避免N+1查询
    const jobs = await Promise.allSettled(
      activeJobIds.map(jobId => agentQueue.getJob(jobId))
    );

    // 并行获取状态
    const statusPromises = jobs.map(async (result, _index) => {
      if (result.status === 'fulfilled' && result.value) {
        const job = result.value;
        try {
          const state = await job.getState();
          const progress = typeof job.progress === 'number' ? job.progress : 0;
          const attemptsMade = job.attemptsMade ?? 0;
          const attemptsRemaining = Math.max(0, (job.opts?.attempts ?? 3) - attemptsMade);

          jobStatuses.set(job.id!, {
            status: state,
            progress,
            isActive: state === 'active',
            attemptsMade,
            attemptsRemaining,
            processedAt: job.processedOn ?? null,
            finishedAt: job.finishedOn ?? null,
            failedReason: job.failedReason,
          });
        } catch (error) {
          jobStatuses.set(job.id!, {
            status: 'error',
            progress: 0,
            isActive: false,
            attemptsMade: 0,
            attemptsRemaining: 0,
            processedAt: null,
            finishedAt: null,
            failedReason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    await Promise.all(statusPromises);
  }

  // 构建结果
  return sessions.map(session => {
    if (session.bullJobId && jobStatuses.has(session.bullJobId)) {
      return {
        ...session,
        ...jobStatuses.get(session.bullJobId)!,
      };
    }

    // 没有活跃任务的会话
    return {
      ...session,
      status: 'idle' as const,
      progress: 0,
      isActive: false,
      attemptsMade: 0,
      attemptsRemaining: 3,
      processedAt: null,
      finishedAt: null,
      failedReason: null,
    };
  });
}

/**
 * 记录任务状态变化历史
 */
export async function recordTaskStatusChange(
  sessionId: string,
  jobId: string,
  oldStatus: string,
  newStatus: string,
  metadata?: Record<string, unknown>
) {
  // 这里可以扩展为将状态变化记录到数据库
  // 目前先记录到日志，将来可以存储到专门的状态历史表
  console.log(`📊 Task ${jobId} status changed: ${oldStatus} -> ${newStatus}`, {
    sessionId,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

/**
 * 获取任务的完整状态信息，包括历史和统计
 */
export async function getTaskDetailedStatus(sessionId: string) {
  const basicStatus = await getTaskStatus(sessionId);

  // 获取任务统计信息
  if (basicStatus.bullJobId) {
    try {
      const job = await agentQueue.getJob(basicStatus.bullJobId);
      if (job) {
        const stats = {
          ...basicStatus,
          jobStats: {
            attemptsMade: job.attemptsMade ?? 0,
            attemptsRemaining: Math.max(0, (job.opts?.attempts ?? 3) - (job.attemptsMade ?? 0)),
            priority: job.opts?.priority ?? 0,
            delay: job.opts?.delay ?? 0,
            createdAt: job.timestamp,
            processedAt: job.processedOn,
            finishedAt: job.finishedOn,
            duration: job.finishedOn && job.processedOn
              ? Number(job.finishedOn) - Number(job.processedOn)
              : null,
          }
        };
        return stats;
      }
    } catch (error) {
      console.error('Error getting detailed job stats:', error);
    }
  }

  return {
    ...basicStatus,
    jobStats: null,
  };
}

/**
 * 批量获取多个任务的状态（优化版本，避免 N+1 查询）
 */
export async function getBulkTaskStatus(ids: string[]) {
  if (ids.length === 0) return {};

  // 批量从数据库获取会话信息
  const sessions = await prisma.agentSession.findMany({
    where: {
      id: { in: ids }
    },
    select: {
      id: true,
      sessionId: true,
      bullJobId: true,
      createdAt: true,
      updatedAt: true,
      messages: true, // messages 是 Json 类型
    }
  });

  // 批量获取 BullMQ 作业状态
  const jobIds = sessions
    .map(s => s.bullJobId)
    .filter(Boolean) as string[];

  const jobs = jobIds.length > 0
    ? await Promise.all(
      jobIds.map(jobId => agentQueue.getJob(jobId).catch(() => null))
    )
    : [];

  // 构建结果映射
  const jobMap = new Map(jobs.filter(Boolean).map(job => [job!.id, job]));

  const results: Record<string, {
    sessionId: string;
    bullJobId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastMessage: unknown;
    jobState: string;
    progress: number;
    attemptsMade: number;
    attemptsRemaining: number;
    processedAt: number | undefined;
    finishedAt: number | undefined;
    failedReason: string | undefined;
    duration: number | null;
  }> = {};

  for (const session of sessions) {
    const job = session.bullJobId ? jobMap.get(session.bullJobId) : null;

    // 从 messages JSON 中提取最后一条消息
    const messages = Array.isArray(session.messages) ? session.messages : [];
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    results[session.id] = {
      sessionId: session.id,  // 使用数据库 ID 作为 sessionId
      bullJobId: session.bullJobId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastMessage,
      jobState: job ? await job.getState() : 'unknown',
      progress: typeof job?.progress === 'number' ? job.progress : 0,
      attemptsMade: job?.attemptsMade ?? 0,
      attemptsRemaining: Math.max(0, (job?.opts?.attempts ?? 3) - (job?.attemptsMade ?? 0)),
      processedAt: job?.processedOn,
      finishedAt: job?.finishedOn,
      failedReason: job?.failedReason ?? undefined,
      duration: job?.finishedOn && job?.processedOn
        ? Number(job.finishedOn) - Number(job.processedOn)
        : null,
    };
  }

  return results;
}

/**
 * 获取工作区的活跃任务统计
 */
export async function getWorkspaceTaskStats(workspaceId: string) {
  const sessions = await prisma.agentSession.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      bullJobId: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  const stats = {
    total: sessions.length,
    averageDuration: 0,
    oldestSession: null as Date | null,
  };

  // 计算平均持续时间
  if (sessions.length > 0) {
    const totalDuration = sessions.reduce((sum, session) => {
      const duration = session.updatedAt.getTime() - session.createdAt.getTime();
      return sum + duration;
    }, 0);
    stats.averageDuration = totalDuration / sessions.length;
  }

  // 找到最老的会话
  if (sessions.length > 0) {
    stats.oldestSession = sessions
      .map(s => s.createdAt)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  }

  return stats;
}