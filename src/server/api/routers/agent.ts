import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { addAgentTask, getTaskStatus, cancelTask, getWorkspaceSessionsWithStatus } from "~/lib/queue-utils";
import { QueueEvents } from "bullmq";
import { redisConnection } from "~/lib/queue";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { JobState } from "bullmq";

// 业务逻辑状态类型（扩展BullMQ状态）
type TaskStatus = JobState | 'idle' | 'error' | 'init' | 'unknown';

// 推送消息类型（与前端契约）
// 推送消息类型
type PushMessage = {
  type: 'init' | 'waiting' | 'active' | 'completed' | 'failed' | 'sessionIdChanged';
  sessionId: string;
  status?: TaskStatus;
  progress?: number;
  messages?: SDKMessage[];
  lastMessage?: SDKMessage;
  timestamp?: Date;
  title?: string;
  createdAt?: Date;
  oldSessionId?: string;
  newSessionId?: string;
};

// 会话状态信息类型
type SessionWithStatus = {
  sessionId: string;
  title: string;
  lastQuery: string | null;
  bullJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  progress: number;
  isActive: boolean;
  attemptsMade: number;
  attemptsRemaining: number;
  processedAt: number | null;
  finishedAt: number | null;
  failedReason: string | null;
};

// 全局subscription管理器
class SubscriptionManager {
  private subscriptions = new Map<string, (message: PushMessage) => void>();

  // 注册subscription
  register(sessionId: string, emitter: (message: PushMessage) => void) {
    this.subscriptions.set(sessionId, emitter);
  }

  // 注销subscription
  unregister(sessionId: string) {
    this.subscriptions.delete(sessionId);
  }

  // 推送消息给特定的subscription
  emit(sessionId: string, message: PushMessage) {
    const emitter = this.subscriptions.get(sessionId);
    if (emitter) {
      emitter(message);
    }
  }

  // 检查subscription是否存在
  has(sessionId: string): boolean {
    return this.subscriptions.has(sessionId);
  }
}

// 创建全局subscription管理器
export const subscriptionManager = new SubscriptionManager();

// JobId到SessionId的映射缓存
const jobSessionMap = new Map<string, string>();

// 注册jobId和sessionId的映射
export function registerJobSession(jobId: string | undefined, sessionId: string | undefined) {
  if (jobId && sessionId) {
    jobSessionMap.set(jobId, sessionId);
  }
}

// 通过jobId找到sessionId
function findSessionIdByJobId(jobId: string): string | null {
  return jobSessionMap.get(jobId) ?? null;
}

// 清理job-session映射
export function cleanupJobSession(jobId: string) {
  jobSessionMap.delete(jobId);
}

// 更新job-session映射（当sessionId改变时）
export function updateJobSession(jobId: string, newSessionId: string) {
  if (jobSessionMap.has(jobId)) {
    jobSessionMap.set(jobId, newSessionId);
  }
}

// 创建队列事件监听器
export const queueEvents = new QueueEvents('agent-tasks', {
  connection: redisConnection,
});

// 监听队列事件并转发给subscriptions
queueEvents.on('waiting', ({ jobId }) => {
  console.log(`⏳ Job ${jobId} waiting`);
  const sessionId = findSessionIdByJobId(jobId);
  if (sessionId) {
    subscriptionManager.emit(sessionId, {
      type: 'waiting',
      sessionId,
      status: 'waiting',
      timestamp: new Date()
    });
  }
});

queueEvents.on('active', ({ jobId, prev: _prev }) => {
  console.log(`🚀 Job ${jobId} active`);
  const sessionId = findSessionIdByJobId(jobId);
  if (sessionId) {
    subscriptionManager.emit(sessionId, {
      type: 'active',
      sessionId,
      status: 'active',
      timestamp: new Date()
    });
  }
});

queueEvents.on('completed', ({ jobId, returnvalue: _returnvalue }) => {
  console.log(`✅ Job ${jobId} completed`);
  const sessionId = findSessionIdByJobId(jobId);
  if (sessionId) {
    // 清理映射
    cleanupJobSession(jobId);

    subscriptionManager.emit(sessionId, {
      type: 'completed',
      sessionId,
      status: 'completed',
      progress: 100,
      timestamp: new Date()
    });
  }
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Job ${jobId} failed:`, failedReason);
  const sessionId = findSessionIdByJobId(jobId);
  if (sessionId) {
    // 清理映射
    cleanupJobSession(jobId);

    subscriptionManager.emit(sessionId, {
      type: 'failed',
      sessionId,
      status: 'failed',
      progress: 0,
      timestamp: new Date()
    });
  }
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`📊 Job ${jobId} progress:`, data);
  const sessionId = findSessionIdByJobId(jobId);
  if (sessionId) {
    // 检查是否是sessionId更新消息
    if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'sessionIdUpdate') {
      const updateData = data as unknown as { oldSessionId: string; newSessionId: string };
      const { oldSessionId, newSessionId } = updateData;
      console.log(`🔄 Session ID updated: ${oldSessionId} -> ${newSessionId}`);

      // 更新映射
      updateJobSession(jobId, newSessionId);

      // 通知旧的sessionId的订阅者
      subscriptionManager.emit(oldSessionId, {
        type: 'sessionIdChanged',
        sessionId: oldSessionId,
        oldSessionId,
        newSessionId,
        timestamp: new Date()
      });

      // 同时发送给新的sessionId（以防前端已经切换）
      subscriptionManager.emit(newSessionId, {
        type: 'active',
        sessionId: newSessionId,
        status: 'active',
        progress: 0,
        timestamp: new Date()
      });
    } else {
      // 普通进度更新
      subscriptionManager.emit(sessionId, {
        type: 'active',
        sessionId,
        status: 'active',
        progress: typeof data === 'number' ? data : 0,
        timestamp: new Date()
      });
    }
  }
});

export const agentRouter = createTRPCRouter({
  // 启动后台查询任务
  startQuery: protectedProcedure
    .input(z.object({
      query: z.string(),
      workspaceId: z.string(),
      sessionId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // 添加任务到队列
      const result = await addAgentTask({
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
        query: input.query,
        sessionId: input.sessionId
      });

      // 注册jobId到sessionId的映射，用于事件驱动推送
      registerJobSession(result.jobId, result.sessionId);

      return {
        sessionId: result.sessionId,
        jobId: result.jobId,
        status: result.status
      };
    }),

  // 监听任务状态（subscription）- 事件驱动版本
  watchQuery: protectedProcedure
    .input(z.object({
      sessionId: z.string()
    }))
    .subscription(async function* ({ ctx, input }) {
      const { sessionId } = input;

      // 验证 session 属于当前用户
      const session = await ctx.db.agentSession.findUnique({
        where: { sessionId, userId: ctx.session.user.id },
        select: { messages: true, title: true, createdAt: true, bullJobId: true }
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // 获取当前任务状态
      let currentTaskStatus = { status: 'idle' as TaskStatus, progress: 0 };
      let jobId = session.bullJobId ?? undefined;

      // 如果有活跃任务，获取真实状态
      if (session.bullJobId) {
        try {
          currentTaskStatus = await getTaskStatus(sessionId);
          jobId = session.bullJobId;
        } catch (error) {
          console.error('Error getting task status:', error);
          // 任务可能已经完成或出错
          currentTaskStatus = { status: 'idle', progress: 0 };
          jobId = undefined;
        }
      }

      // 解析历史消息
      const parsedMessages: unknown = JSON.parse((session.messages as string) ?? '[]');
      const messages: SDKMessage[] = Array.isArray(parsedMessages)
        ? parsedMessages.filter((msg): msg is SDKMessage =>
          typeof msg === 'object' && msg !== null &&
          'type' in msg && 'content' in msg
        )
        : [];

      // 发送初始状态和历史消息
      yield {
        type: 'init',
        sessionId,
        status: currentTaskStatus.status,
        messages,
        title: session.title,
        createdAt: session.createdAt
      };

      // 如果没有活跃任务，直接结束
      if (!jobId) {
        console.log(`ℹ️ No active job for session ${sessionId}, ending subscription`);
        return;
      }

      // 注册 jobId 到 sessionId 的映射（如果还没有的话）
      registerJobSession(jobId, sessionId);

      // 创建一个Promise来处理事件驱动的推送
      let resolveSubscription: ((value: PushMessage) => void) | null = null;

      const eventPromise = new Promise<PushMessage>((resolve, reject) => {
        resolveSubscription = resolve;
        // reject is not used in current implementation
        void reject;
      });

      // 注册到subscription管理器
      const eventEmitter = (message: PushMessage) => {
        if (resolveSubscription) {
          resolveSubscription(message);
          // 重置Promise以便接收下一个事件
          resolveSubscription = null;
        }
      };

      subscriptionManager.register(sessionId, eventEmitter);

      try {
        // 持续监听事件
        while (true) {
          // 等待事件发生
          const message = await eventPromise;

          // 检查是否是终止状态
          if (message.status === 'completed' || message.status === 'failed') {
            yield message;
            break;
          }

          yield message;

          // 为下一个事件创建新的Promise
          void new Promise<PushMessage>((resolve) => {
            resolveSubscription = resolve;
          });
        }
      } finally {
        // 清理：取消注册subscription
        subscriptionManager.unregister(sessionId);
      }
    }),

  // 获取会话历史消息（query）
  getSessionHistory: protectedProcedure
    .input(z.object({
      sessionId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.agentSession.findUnique({
        where: {
          sessionId: input.sessionId,
          userId: ctx.session.user.id
        },
        select: {
          messages: true,
          title: true,
          lastQuery: true,
          createdAt: true,
          updatedAt: true,
          bullJobId: true
        }
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      const parsedMessages: unknown = JSON.parse((session.messages as string) ?? '[]');
      const messages: SDKMessage[] = Array.isArray(parsedMessages)
        ? parsedMessages.filter((msg): msg is SDKMessage =>
          typeof msg === 'object' && msg !== null &&
          'type' in msg && 'content' in msg
        )
        : [];
      let status = 'idle';

      if (session.bullJobId) {
        const taskStatus = await getTaskStatus(input.sessionId);
        status = taskStatus.status ?? 'idle';
      }

      return {
        sessionId: input.sessionId,
        title: session.title,
        lastQuery: session.lastQuery,
        messages,
        status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };
    }),

  // 获取工作区的所有 sessions（增强版）
  getSessions: protectedProcedure
    .input(z.object({
      workspaceId: z.string()
    }))
    .query(async ({ input }): Promise<SessionWithStatus[]> => {
      // 使用 BullMQ 工具函数获取带状态的会话列表
      return await getWorkspaceSessionsWithStatus(input.workspaceId);
    }),

  // 取消任务
  cancelQuery: protectedProcedure
    .input(z.object({
      sessionId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证 session 属于当前用户
      const session = await ctx.db.agentSession.findUnique({
        where: { sessionId: input.sessionId, userId: ctx.session.user.id },
        select: { bullJobId: true }
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      if (session.bullJobId) {
        const result = await cancelTask(input.sessionId);
        // 清理job-session映射
        cleanupJobSession(session.bullJobId);
        return result;
      } else {
        throw new Error("No active task to cancel");
      }
    }),

  // 删除 session
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 验证 session 属于当前用户
      const session = await ctx.db.agentSession.findUnique({
        where: { sessionId: input.sessionId },
        select: { userId: true, bullJobId: true }
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new Error("Session not found or access denied");
      }

      // 如果有正在运行的任务，先取消
      if (session.bullJobId) {
        try {
          await cancelTask(input.sessionId);
        } catch (e) {
          // 忽略取消错误，继续删除
          console.error('Error cancelling task:', e);
        }
      }

      // 物理删除
      return await ctx.db.agentSession.delete({
        where: { sessionId: input.sessionId }
      });
    }),
});