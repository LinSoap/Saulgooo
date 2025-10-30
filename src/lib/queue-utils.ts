import { agentQueue } from './queue';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/**
 * 添加一个新的 Agent 任务到队列
 */
export async function addAgentTask({
  workspaceId,
  userId,
  query,
  sessionId,
}: {
  workspaceId: string;
  userId: string;
  query: string;
  sessionId?: string;
}) {
  // 如果没有 sessionId，创建一个新的
  const finalSessionId = sessionId ?? randomUUID();

  // 检查会话是否已经有一个正在运行的任务
  const existingSession = await prisma.agentSession.findUnique({
    where: { sessionId: finalSessionId },
    select: { bullJobId: true }
  });

  if (existingSession?.bullJobId) {
    // 检查任务是否还在运行
    const job = await agentQueue.getJob(existingSession.bullJobId);
    if (job) {
      const state = await job.getState();
      if (state === 'active' || state === 'waiting') {
        throw new Error('Session already has a running task');
      }
    }
  }

  // 创建或更新会话
  await prisma.agentSession.upsert({
    where: { sessionId: finalSessionId },
    update: {
      lastQuery: query,
      updatedAt: new Date()
    },
    create: {
      sessionId: finalSessionId,
      workspaceId,
      userId,
      title: query.slice(0, 50), // 使用查询的前50个字符作为标题
      messages: JSON.stringify([]),
      lastQuery: query,
    }
  });

  // 添加任务到队列
  const job = await agentQueue.add(
    'execute-query',
    {
      sessionId: finalSessionId,
      query,
      workspaceId,
      userId,
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
      // 可选：设置任务ID以便追踪
      jobId: `task_${finalSessionId}_${Date.now()}`,
    }
  );

  // 更新会话的 bullJobId
  await prisma.agentSession.update({
    where: { sessionId: finalSessionId },
    data: {
      bullJobId: job.id,
    }
  });

  return {
    sessionId: finalSessionId,
    jobId: job.id,
    status: 'queued',
  };
}

/**
 * 获取任务状态
 */
export async function getTaskStatus(sessionId: string) {
  const session = await prisma.agentSession.findUnique({
    where: { sessionId },
    select: {
      sessionId: true,
      bullJobId: true,
      lastQuery: true,
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
      status: 'idle',
      progress: 0,
      isActive: false,
    };
  }

  // 从 BullMQ 获取实时状态
  try {
    const job = await agentQueue.getJob(session.bullJobId);
    if (!job) {
      return {
        ...session,
        status: 'completed',
        progress: 100,
        isActive: false,
      };
    }

    const state = await job.getState();
    const progress = job.progress || 0;

    return {
      ...session,
      status: state,
      progress,
      isActive: state === 'active',
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  } catch (error) {
    console.error('Error getting job status:', error);
    return {
      ...session,
      status: 'error',
      progress: 0,
      isActive: false,
    };
  }
}

/**
 * 取消任务
 */
export async function cancelTask(sessionId: string) {
  const session = await prisma.agentSession.findUnique({
    where: { sessionId },
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
    where: { sessionId },
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
      sessionId: true,
      title: true,
      lastQuery: true,
      bullJobId: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  // 批量获取状态
  const sessionsWithStatus = await Promise.all(
    sessions.map(async (session) => {
      if (session.bullJobId) {
        try {
          const job = await agentQueue.getJob(session.bullJobId);
          if (job) {
            const state = await job.getState();
            return {
              ...session,
              status: state,
              isActive: state === 'active',
            };
          }
        } catch (error) {
          // 忽略错误，继续处理
        }
      }

      return {
        ...session,
        status: 'idle',
        isActive: false,
      };
    })
  );

  return sessionsWithStatus;
}

/**
 * 清理旧的完成任务（定期任务）
 */
export async function cleanCompletedJobs() {
  const completedJobs = await agentQueue.getCompleted();
  const failedJobs = await agentQueue.getFailed();

  console.log(`Cleaning up ${completedJobs.length} completed and ${failedJobs.length} failed jobs`);

  // BullMQ 会自动清理（根据 defaultJobOptions 配置）
  // 这里可以添加额外的清理逻辑
}