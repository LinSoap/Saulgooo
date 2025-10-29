import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";


export const agentRouter = createTRPCRouter({

  // 获取工作区的所有 sessions
  getSessions: protectedProcedure
    .input(z.object({
      workspaceId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.agentSession.findMany({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          sessionId: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    }),

  // 获取 session 的所有消息
  getSession: protectedProcedure
    .input(z.object({
      sessionId: z.string() // Claude SDK 的 session ID (现在也是主键)
    }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.agentSession.findUnique({
        where: {
          sessionId: input.sessionId,
          userId: ctx.session.user.id // 确保用户只能访问自己的 session
        },
        select: {
          sessionId: true,
          title: true,
          messages: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!session) {
        throw new Error("Session not found");
      }

      // 直接返回，保持原始数据结构
      return session;
    }),

  // 删除 session
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 验证 session 属于当前用户
      const session = await ctx.db.agentSession.findUnique({
        where: { sessionId: input.sessionId },
        select: { userId: true }
      });

      if (!session || session.userId !== ctx.session.user.id) {
        throw new Error("Session not found or access denied");
      }

      // 物理删除
      return await ctx.db.agentSession.delete({
        where: { sessionId: input.sessionId }
      });
    }),
});