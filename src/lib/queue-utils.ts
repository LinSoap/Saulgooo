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
  let mutableId = id;

  // 1. 如果提供了 id，查找现有会话
  if (mutableId) {
    session = await prisma.agentSession.findUnique({
      where: { id: mutableId },
      select: { sessionId: true, bullJobId: true }
    });
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
    const newId = createId();
    session = await prisma.agentSession.create({
      data: {
        id: newId,
        sessionId: null,
        workspaceId,
        userId: userIdStr,
        title: query.slice(0, 50),
        messages: [],
      }
    });
    mutableId = newId;
  }

  // 3. 创建任务
  const job = await agentQueue.add(
    'execute-query',
    {
      id: mutableId,
      sessionId: session?.sessionId,
      query,
      workspaceId,
      userId: userIdStr,
    },
    {
      priority: 0,
      delay: 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
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
    id: mutableId,
    jobId: job.id,
    status: 'running' as const,
  };
}

/**
 * 获取任务状态
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
    };
  }

  // 从 BullMQ 获取实时状态
  try {
    const job = await agentQueue.getJob(session.bullJobId);
    if (!job) {
      return {
        ...session,
        status: 'completed' as const,
        progress: 100,
        isActive: false,
        attemptsMade: 3,
        attemptsRemaining: 0,
      };
    }

    const state = await job.getState();
    const progress = typeof job.progress === 'number' ? job.progress : 0;
    const attemptsMade = job.attemptsMade ?? 0;
    const attemptsRemaining = Math.max(0, (job.opts?.attempts ?? 3) - attemptsMade);

    return {
      ...session,
      status: state,
      progress,
      isActive: state === 'active',
      attemptsMade,
      attemptsRemaining,
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
 * 获取工作区的所有会话及其状态
 */
export async function getWorkspaceSessionsWithStatus(workspaceId: string) {
  const sessions = await prisma.agentSession.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      sessionId: true,
      title: true,
      bullJobId: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  // 批量获取活跃任务的状态
  const activeJobIds = sessions
    .map(session => session.bullJobId)
    .filter((jobId): jobId is string => jobId !== null);

  const jobStatuses = new Map<string, any>();

  if (activeJobIds.length > 0) {
    const jobs = await Promise.allSettled(
      activeJobIds.map(jobId => agentQueue.getJob(jobId))
    );

    for (const result of jobs) {
      if (result.status === 'fulfilled' && result.value) {
        const job = result.value;
        try {
          const state = await job.getState();
          jobStatuses.set(job.id!, {
            status: state,
            progress: typeof job.progress === 'number' ? job.progress : 0,
            isActive: state === 'active',
            attemptsMade: job.attemptsMade ?? 0,
            attemptsRemaining: Math.max(0, (job.opts?.attempts ?? 3) - (job.attemptsMade ?? 0)),
            failedReason: job.failedReason,
          });
        } catch (error) {
          jobStatuses.set(job.id!, {
            status: 'error',
            progress: 0,
            isActive: false,
            attemptsMade: 0,
            attemptsRemaining: 0,
            failedReason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
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
      failedReason: null,
    };
  });
}