import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { addAgentTask, getTaskStatus, cancelTask, getWorkspaceSessionsWithStatus } from "~/lib/queue-service";
import { PrismaClient } from '@prisma/client';
import type { SDKMessage, Query } from "@anthropic-ai/claude-agent-sdk";
import type { Message } from "~/types/subscription";
import type { TaskStatus } from "~/types/status";

// 导出TaskStatus供其他模块使用
export type { TaskStatus } from "~/types/status";


// 简化的subscription管理器
const subscriptions = new Map<string, (data: Message) => void>();
const queries = new Map<string, Query>();

export const subscriptionManager = {
  // 基础subscription管理
  register: (id: string, fn: (data: Message) => void) => subscriptions.set(id, fn),
  unregister: (id: string) => subscriptions.delete(id),
  emit: (id: string, data: Message) => subscriptions.get(id)?.(data),

  // Query管理（保留必要的功能）
  registerQuery: (id: string, query: Query) => queries.set(id, query),
  unregisterQuery: (id: string) => queries.delete(id),  // 保留，虽然当前未使用
  interruptQuery: async (id: string): Promise<boolean> => {
    const query = queries.get(id);
    if (query) {
      queries.delete(id);
      try {
        await query.interrupt();
        return true;
      } catch {
        return true; // 已从Map中移除
      }
    }
    return false;
  },
  hasActiveQuery: (id: string) => queries.has(id)  // 用于worker.ts中的检查
};

// 安全的JSON解析函数
function safeParseMessages(messages: unknown): SDKMessage[] {
  if (!messages) return [];
  if (typeof messages === 'string') {
    try {
      return JSON.parse(messages) as SDKMessage[];
    } catch {
      return [];
    }
  }
  return Array.isArray(messages) ? messages as SDKMessage[] : [];
}

// 创建 Prisma 客户端
const prisma = new PrismaClient();

// 公共函数：验证session归属
async function validateSession(id: string, userId: string, selectFields?: Record<string, boolean>) {
  return await prisma.agentSession.findUnique({
    where: { id, userId },
    select: selectFields ?? {
      id: true,
      userId: true,
      messages: true,
      title: true,
      createdAt: true,
      bullJobId: true,
      sessionId: true
    }
  });
}

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


      return {
        id: result.id, // 返回数据库 session ID
        jobId: result.jobId,
        sessionId: result.sessionId,
        status: 'idle' as TaskStatus // 新创建的任务初始状态为 idle
      };
    }),

  // 监听任务状态（subscription）- 简化版本
  watchQuery: protectedProcedure
    .input(z.object({
      id: z.string()  // 使用内部 ID
    }))
    .subscription(async function* ({ ctx, input }) {
      const { id } = input;

      // 验证 session 属于当前用户
      const session = await validateSession(id, ctx.session.user.id, {
        messages: true,
        title: true,
        createdAt: true,
        bullJobId: true,
        sessionId: true
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // 获取当前任务状态
      let status: TaskStatus = 'idle';
      if (session.bullJobId) {
        try {
          const taskResult = await getTaskStatus(id);
          if (taskResult) {
            status = taskResult.status;  // 已经是TaskStatus类型，不需要转换
          }
        } catch {
          status = 'idle';
        }
      }

      // 初始状态推送
      yield {
        type: 'init' as const,
        id,
        sessionId: session.sessionId,
        status,
        messages: safeParseMessages(session.messages),
        title: session.title,
        createdAt: session.createdAt,
        timestamp: new Date()
      };

      // 如果没有活跃任务，结束
      if (!session.bullJobId || status === 'idle') {
        return;
      }

      // 简单的事件监听
      const messageQueue: Message[] = [];
      let hasNewMessage = false;

      const handler = (message: Message) => {
        messageQueue.push(message);
        hasNewMessage = true;
      };

      subscriptionManager.register(id, handler);

      try {
        while (true) {
          // 等待新消息
          while (messageQueue.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!hasNewMessage) continue;
            break;
          }

          if (messageQueue.length > 0) {
            const message = messageQueue.shift()!;
            hasNewMessage = false;
            yield message;
          }
        }
      } finally {
        subscriptionManager.unregister(id);
      }
    }),


  // 获取工作区的所有 sessions（增强版）
  getSessions: protectedProcedure
    .input(z.object({
      workspaceId: z.string()
    }))
    .query(async ({ input, ctx }) => {
      // 使用 BullMQ 工具函数获取带状态的会话列表
      return await getWorkspaceSessionsWithStatus(input.workspaceId, ctx.session.user.id);
    }),

  // 取消任务
  cancelQuery: protectedProcedure
    .input(z.object({
      id: z.string()  // 使用内部 ID
    }))
    .mutation(async ({ ctx, input }) => {
      // 验证 session 属于当前用户
      const session = await validateSession(input.id, ctx.session.user.id, {
        bullJobId: true
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // 尝试优雅中断查询
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

      // 如果优雅中断失败，使用原有的 job.remove()
      if (session.bullJobId) {
        const result = await cancelTask(input.id);
        return {
          success: result,
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
      const session = await validateSession(input.id, ctx.session.user.id, {
        userId: true,
        bullJobId: true
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // 如果有正在运行的任务，先取消
      if (session.bullJobId) {
        try {
          await cancelTask(input.id);
        } catch {
          // 忽略取消错误，继续删除
        }
      }

      // 物理删除
      return await ctx.db.agentSession.delete({
        where: { id: input.id }
      });
    }),
});