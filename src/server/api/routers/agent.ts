import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { addAgentTask, getTaskStatus, cancelTask, getWorkspaceSessionsWithStatus } from "~/lib/queue-utils";
import { queueEvents } from "~/lib/queue";
import { PrismaClient } from '@prisma/client';
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Query } from "@anthropic-ai/claude-agent-sdk";

// 业务逻辑状态类型
export type TaskStatus = 'idle' | 'running' | 'completed' | 'failed';

// 推送消息类型（与前端契约）
// 注意：这个类型必须与 watchQuery 实际 yield 的数据完全匹配
type PushMessage = {
  type: 'init' | 'waiting' | 'active' | 'completed' | 'failed' | 'message_update';
  id: string;  // 数据库内部 ID
  sessionId: string | null;  // Claude 的 sessionId
  status?: TaskStatus;
  progress?: number;
  messages?: SDKMessage[];  // 总是包含最新的消息
  lastMessage?: SDKMessage;
  timestamp?: Date;
  title?: string;
  createdAt?: Date | string;  // Date 或 ISO 字符串
  error?: string;  // 错误信息
};

// 会话状态信息类型
type SessionWithStatus = {
  id: string; // 数据库主键
  sessionId: string | null; // Claude 的 sessionId
  title: string;
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
  private queries = new Map<string, Query>();  // 新增：管理查询实例

  // 注册subscription
  register(id: string, emitter: (message: PushMessage) => void) {
    this.subscriptions.set(id, emitter);
  }

  // 注销subscription
  unregister(id: string) {
    this.subscriptions.delete(id);
  }

  // 推送消息给特定的subscription
  emit(id: string, message: PushMessage) {
    const emitter = this.subscriptions.get(id);

    if (emitter) {
      emitter(message);
    } else {
      console.log('🔍 SubscriptionManager emit - No emitter found for id:', id);
    }
  }

  // 检查subscription是否存在
  has(id: string): boolean {
    return this.subscriptions.has(id);
  }

  // ===== 新增：查询实例管理方法 =====

  // 注册查询实例
  registerQuery(id: string, queryInstance: Query) {
    this.queries.set(id, queryInstance);
  }

  // 注销查询实例
  unregisterQuery(id: string) {
    this.queries.delete(id);
  }

  // 中断查询
  async interruptQuery(id: string): Promise<boolean> {
    const queryInstance = this.queries.get(id);
    if (queryInstance) {
      try {
        await queryInstance.interrupt();
        this.queries.delete(id);
        return true;
      } catch (error) {
        console.error(`Failed to interrupt query for session ${id}:`, error);
        this.queries.delete(id);
        return false;
      }
    }
    return false;
  }

  // 检查是否有活跃的查询
  hasActiveQuery(id: string): boolean {
    return this.queries.has(id);
  }
}

// 创建全局subscription管理器
export const subscriptionManager = new SubscriptionManager();

// 安全的JSON解析函数
function safeParseMessages(messages: unknown): SDKMessage[] {
  try {
    if (!messages) return [];
    if (typeof messages === 'string') {
      return messages.trim() === '' ? [] : JSON.parse(messages) as SDKMessage[];
    }
    if (Array.isArray(messages)) return messages as SDKMessage[];
    return [];
  } catch (error) {
    console.error('Error parsing messages:', error);
    return [];
  }
}

// 创建 Prisma 客户端
const prisma = new PrismaClient();

// 监听队列事件并转发给subscriptions（通过数据库查找session）
queueEvents.on('waiting', ({ jobId }) => {
  console.log(`⏳ Job ${jobId} waiting`);
  // 通过jobId查找session
  prisma.agentSession.findUnique({
    where: { bullJobId: jobId },
    select: { id: true, sessionId: true, messages: true }
  }).then((session) => {
    if (session) {
      const messages: SDKMessage[] = safeParseMessages(session.messages);
      subscriptionManager.emit(session.id, {
        type: 'waiting',
        id: session.id,
        sessionId: session.sessionId,
        status: 'running',  // 等待中也是运行状态
        messages,
        timestamp: new Date()
      });
    }
  }).catch((error) => {
    console.error('Error in waiting event handler:', error);
  });
});

queueEvents.on('active', ({ jobId, prev: _prev }) => {
  console.log(`🚀 Job ${jobId} active`);
  // 通过jobId查找session
  prisma.agentSession.findUnique({
    where: { bullJobId: jobId },
    select: { id: true, sessionId: true, messages: true }
  }).then((session) => {
    if (session) {
      const messages: SDKMessage[] = safeParseMessages(session.messages);
      subscriptionManager.emit(session.id, {
        type: 'active',
        id: session.id,
        sessionId: session.sessionId,
        status: 'running',  // 活跃状态就是运行中
        messages,
        timestamp: new Date()
      });
    }
  }).catch((error) => {
    console.error('Error in active event handler:', error);
  });
});

queueEvents.on('completed', ({ jobId, returnvalue: _returnvalue }) => {
  console.log(`✅ Job ${jobId} completed`);
  // 通过jobId查找session
  prisma.agentSession.findUnique({
    where: { bullJobId: jobId },
    select: { id: true, sessionId: true, messages: true }
  }).then((session) => {
    if (session) {
      const messages: SDKMessage[] = safeParseMessages(session.messages);
      console.log('🔍 Agent completed - Session id:', session.id);
      console.log('🔍 Agent completed - Session sessionId:', session.sessionId);
      console.log('🔍 Agent completed - Messages count:', messages.length);
      subscriptionManager.emit(session.id, {
        type: 'completed',
        id: session.id,
        sessionId: session.sessionId,
        status: 'completed',
        progress: 100,
        messages,
        timestamp: new Date()
      });
      console.log('🔍 Agent completed - Emitted completed event');
    }
  }).catch((error) => {
    console.error('Error in completed event handler:', error);
  });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Job ${jobId} failed:`, failedReason);
  // 通过jobId查找session
  prisma.agentSession.findUnique({
    where: { bullJobId: jobId },
    select: { id: true, sessionId: true, messages: true }
  }).then((session) => {
    if (session) {
      const messages: SDKMessage[] = safeParseMessages(session.messages);
      subscriptionManager.emit(session.id, {
        type: 'failed',
        id: session.id,
        sessionId: session.sessionId,
        status: 'failed',
        progress: 0,
        messages,
        timestamp: new Date()
      });
    }
  }).catch((error) => {
    console.error('Error in failed event handler:', error);
  });
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`📊 Job ${jobId} progress:`, data);
  // 通过jobId查找session
  prisma.agentSession.findUnique({
    where: { bullJobId: jobId },
    select: { id: true, sessionId: true, messages: true }
  }).then((session) => {
    if (session) {
      const messages: SDKMessage[] = safeParseMessages(session.messages);
      // 普通进度更新
      subscriptionManager.emit(session.id, {
        type: 'active',
        id: session.id,
        sessionId: session.sessionId,
        status: 'running',  // 进度更新也是运行中
        progress: typeof data === 'number' ? data : 0,
        messages,
        timestamp: new Date()
      });
    }
  }).catch((error) => {
    console.error('Error in progress event handler:', error);
  });
});

export const agentRouter = createTRPCRouter({
  // 启动后台查询任务
  startQuery: protectedProcedure
    .input(z.object({
      query: z.string(),
      workspaceId: z.string(),
      id: z.string().optional() // 现在接收数据库 session ID
    }))
    .mutation(async ({ ctx, input }) => {
      // 添加任务到队列
      const result = await addAgentTask({
        id: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
        query: input.query,
      });

      console.log("✅ Query started:", result);

      return {
        id: result.id, // 返回数据库 session ID
        jobId: result.jobId,
        status: result.status
      };
    }),

  // 监听任务状态（subscription）- 事件驱动版本
  watchQuery: protectedProcedure
    .input(z.object({
      id: z.string()  // 使用内部 ID
    }))
    .subscription(async function* ({ ctx, input }) {
      const { id } = input;

      // 验证 session 属于当前用户
      const session = await ctx.db.agentSession.findUnique({
        where: { id, userId: ctx.session.user.id },
        select: { messages: true, title: true, createdAt: true, bullJobId: true, sessionId: true }
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
          const taskResult = await getTaskStatus(id);
          // 将 BullMQ 状态映射到我们的简化状态
          const status = taskResult.status === 'active' || taskResult.status === 'waiting'
            ? 'running' as TaskStatus
            : taskResult.status as TaskStatus;
          currentTaskStatus = { status, progress: taskResult.progress };
          jobId = session.bullJobId;
        } catch (error) {
          console.error('Error getting task status:', error);
          // 任务可能已经完成或出错
          currentTaskStatus = { status: 'idle', progress: 0 };
          jobId = undefined;
        }
      }

      // 解析历史消息
      const messages: SDKMessage[] = safeParseMessages(session.messages);

      // 初始状态推送
      yield {
        type: 'init' as const,
        id,  // 使用内部 ID
        sessionId: session.sessionId,  // Claude 的 sessionId（可能为空）
        status: currentTaskStatus.status,
        messages,
        title: session.title,
        createdAt: session.createdAt,
        timestamp: new Date()
      };

      // 如果没有活跃任务，只发送历史消息后结束
      if (!jobId) {
        console.log(`ℹ️ No active job for session ${id}, history sent, ending subscription`);
        return;
      }

      // 使用一个队列来处理事件
      const eventQueue: PushMessage[] = [];
      let resolveNext: ((value: PushMessage) => void) | null = null;

      // 注册到subscription管理器
      const eventEmitter = (message: PushMessage) => {
        if (resolveNext) {
          // 如果有等待的 Promise，直接解析
          resolveNext(message);
          resolveNext = null;
        } else {
          // 否则将消息加入队列
          eventQueue.push(message);
        }
      };

      subscriptionManager.register(id, eventEmitter);

      try {
        // 持续监听事件 - 不再因为 completed/failed 而退出
        while (true) {
          // 先检查队列中是否有消息
          if (eventQueue.length > 0) {
            const message = eventQueue.shift()!;
            yield message;

            // 不再因为 completed/failed 而退出，继续监听新消息
            // 这样可以支持同一会话的多次查询
          }

          // 如果队列中没有消息，创建新的 Promise 等待下一个事件
          const message = await new Promise<PushMessage>((resolve) => {
            resolveNext = resolve;
          });

          yield message;

          // 不再因为 completed/failed 而退出，继续监听
        }
      } finally {
        // 清理：取消注册subscription
        subscriptionManager.unregister(id);
      }
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
      id: z.string()  // 使用内部 ID
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证 session 属于当前用户
      const session = await ctx.db.agentSession.findUnique({
        where: { id: input.id, userId: ctx.session.user.id },
        select: { bullJobId: true }
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // 首先尝试优雅中断查询
      const interrupted = await subscriptionManager.interruptQuery(input.id);

      if (interrupted) {
        // 成功中断，更新数据库状态
        await prisma.agentSession.update({
          where: { id: input.id },
          data: {
            bullJobId: null,
            updatedAt: new Date()
          }
        });

        return {
          success: true,
          message: 'Query interrupted gracefully',
          method: 'interrupt'
        };
      }

      // 如果优雅中断失败（可能任务已完成或不在当前进程中），使用原有的 job.remove()
      if (session.bullJobId) {
        const result = await cancelTask(input.id);
        return {
          ...result,
          method: 'job_remove'
        };
      } else {
        throw new Error("No active task to cancel");
      }
    }),

  
  // 删除 session
  deleteSession: protectedProcedure
    .input(z.object({ id: z.string() }))  // 使用内部 ID
    .mutation(async ({ ctx, input }) => {
      // 验证 session 属于当前用户
      const session = await ctx.db.agentSession.findUnique({
        where: { id: input.id },
        select: { userId: true, bullJobId: true }
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new Error("Session not found or access denied");
      }

      // 如果有正在运行的任务，先取消
      if (session.bullJobId) {
        try {
          await cancelTask(input.id);
        } catch (e) {
          // 忽略取消错误，继续删除
          console.error('Error cancelling task:', e);
        }
      }

      // 物理删除
      return await ctx.db.agentSession.delete({
        where: { id: input.id }
      });
    }),
});