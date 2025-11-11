/**
 * 队列操作服务
 */

import { createId } from '@paralleldrive/cuid2';
import { agentQueue } from './bullmq';
import { getPrisma } from './bullmq-worker';
import { subscriptionManager } from '~/server/api/routers/agent';
import type { AddTaskParams, SessionWithStatus } from '~/types/queue';
import type { TaskStatus } from '~/types/status';
import type { Job } from 'bullmq';

// 辅助函数：检查是否有消息
function hasMessages(messages: unknown): boolean {
  if (!messages) return false;
  if (typeof messages === 'string') {
    try {
      const parsed = JSON.parse(messages) as unknown[];
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
  return Array.isArray(messages) && (messages as unknown[]).length > 0;
}

/**
 * 添加任务
 */
export async function addAgentTask({
  id,
  workspaceId,
  userId,
  query,
}: AddTaskParams) {
  const userIdStr = String(userId);
  const prisma = getPrisma();
  let session;
  let mutableId = id;

  if (mutableId) {
    session = await prisma.agentSession.findUnique({
      where: { id: mutableId },
      select: { sessionId: true, bullJobId: true }
    });
  }

  if (session) {
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

  const job = await agentQueue.add(
    'execute-query',
    { id: mutableId, sessionId: session?.sessionId, query, workspaceId, userId: userIdStr },
    { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
  );

  await prisma.agentSession.update({
    where: { id: mutableId },
    data: { bullJobId: job.id! }
  });

  return { id: mutableId, jobId: job.id, sessionId: session?.sessionId };
}

/**
 * 获取任务状态
 */
export async function getTaskStatus(sessionId: string): Promise<SessionWithStatus | null> {
  const prisma = getPrisma();
  const session = await prisma.agentSession.findUnique({ where: { id: sessionId } });

  if (!session) return null;

  let jobState: string | null = null;
  let jobProgress = 0;
  let attemptsMade = 0;
  let failedReason = null;

  if (session.bullJobId) {
    const job = await agentQueue.getJob(session.bullJobId);
    if (job) {
      try {
        jobState = await job.getState();
        jobProgress = typeof job.progress === 'number' ? job.progress : 0;
        attemptsMade = job.attemptsMade ?? 0;
        failedReason = job.failedReason;
      } catch {
        // Job 状态获取失败，根据消息判断
        jobState = hasMessages(session.messages) ? 'completed' : 'failed';
      }
    } else {
      // Job 已被清理，根据消息判断
      jobState = hasMessages(session.messages) ? 'completed' : 'failed';
    }
  }

  let finalStatus: TaskStatus = 'idle';

  if (jobState) {
    switch (jobState) {
      case 'active': finalStatus = 'running'; break;
      case 'waiting':
      case 'delayed': finalStatus = 'idle'; break;
      case 'completed': finalStatus = 'completed'; break;
      case 'failed': finalStatus = 'failed'; break;
    }
  } else if (session.bullJobId) {
    finalStatus = hasMessages(session.messages) ? 'completed' : 'failed';
  }

  return {
    ...session,
    status: finalStatus,
    progress: jobProgress,
    isActive: finalStatus === 'running',
    attemptsMade,
    attemptsRemaining: Math.max(0, 3 - attemptsMade),
    failedReason,
    processedAt: null,
    finishedAt: null,
  } as SessionWithStatus;
}

/**
 * 取消任务
 */
export async function cancelTask(sessionId: string): Promise<boolean> {
  try {
    const prisma = getPrisma();
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { bullJobId: true }
    });

    if (!session?.bullJobId) return false;

    const job = await agentQueue.getJob(session.bullJobId);
    if (!job) return false;

    const state = await job.getState();

    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      await prisma.agentSession.update({
        where: { id: sessionId },
        data: { bullJobId: null }
      });
      return true;
    }

    if (state === 'active') {
      subscriptionManager.unregisterQuery(sessionId);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to cancel task:', error);
    return false;
  }
}

/**
 * 获取工作区的所有会话
 */
export async function getWorkspaceSessionsWithStatus(
  workspaceId: string,
  userId: string
): Promise<SessionWithStatus[]> {
  const prisma = getPrisma();
  const sessions = await prisma.agentSession.findMany({
    where: { workspaceId, userId: String(userId) },
    orderBy: { updatedAt: 'desc' },
  });

  const jobIds = sessions
    .map(s => s.bullJobId)
    .filter((id): id is string => id !== null);

  const activeJobs: Array<{
    job: Job;
    state: string;
    progress: number;
    attemptsMade: number;
    failedReason: string | null;
  }> = [];

  if (jobIds.length > 0) {
    const allJobs = await Promise.all(jobIds.map(id => agentQueue.getJob(id)));
    const jobs = allJobs.filter((job): job is Job => job !== null);

    const jobStates = await Promise.all(
      jobs.map(async job => {
        try {
          return {
            job,
            state: await job.getState(),
            progress: typeof job.progress === 'number' ? job.progress : 0,
            attemptsMade: job.attemptsMade ?? 0,
            failedReason: job.failedReason,
          };
        } catch {
          return null;
        }
      })
    );

    activeJobs.push(...jobStates.filter((job): job is NonNullable<typeof job> => job !== null));
  }

  return sessions.map((session) => {
    const activeJob = activeJobs.find(aj => aj.job.id === session.bullJobId);

    let status: TaskStatus = 'idle';
    let progress = 0;
    let isActive = false;
    let attemptsMade = 0;
    let failedReason = null;

    if (activeJob) {
      switch (activeJob.state) {
        case 'active': status = 'running'; isActive = true; break;
        case 'waiting':
        case 'delayed': status = 'idle'; break;
        case 'completed': status = 'completed'; break;
        case 'failed': status = 'failed'; break;
      }
      progress = activeJob.progress;
      attemptsMade = activeJob.attemptsMade;
      failedReason = activeJob.failedReason;
    } else if (session.bullJobId) {
      // Job 已被清理，根据消息判断状态
      status = hasMessages(session.messages) ? 'completed' : 'failed';
    }

    return {
      ...session,
      status,
      progress,
      isActive,
      attemptsMade,
      attemptsRemaining: Math.max(0, 3 - attemptsMade),
      failedReason,
      processedAt: null,
      finishedAt: null,
    } as SessionWithStatus;
  });
}