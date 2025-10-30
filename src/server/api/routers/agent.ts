import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { query, type SDKMessage, type SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { join } from "path";
import { homedir } from "os";


export const agentRouter = createTRPCRouter({
  query: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      workspaceId: z.string(),
      sessionId: z.string().optional()
    })).subscription(async function* ({ ctx, input }) {
      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { path: true },
      });

      if (!workspace) {
        throw new Error("Workspace not found");
      }
      const cwd = join(homedir(), 'workspaces', workspace.path);

      if (input.sessionId && !input.query) {
        const historyMessages = await ctx.db.agentSession.findUnique({
          where: { sessionId: input.sessionId, userId: ctx.session.user.id },
          select: { messages: true },
        });
        if (historyMessages?.messages) {
          // 统一处理：数据库中 messages 始终是 JSON 字符串
          const messagesStr = typeof historyMessages.messages === 'string'
            ? historyMessages.messages
            : '[]'; // 兜底处理，正常情况下不会走到这里
          const messages = JSON.parse(messagesStr) as SDKMessage[];

          for (const msg of messages) {
            yield msg;
          }
        }
      }

      // 如果没有新query，只是加载历史消息，则yield结果并返回
      if (!input.query) {
        yield {
          type: 'result' as const,
          session_id: input.sessionId,
        };
        return;
      }

      if (input.query) {
        const queryInstance = query({
          prompt: input.query,
          options: {
            maxTurns: 30,
            permissionMode: 'bypassPermissions',
            resume: input.sessionId ?? undefined,
            cwd,
            systemPrompt: {
              type: "preset",
              preset: "claude_code",
              append:
                ` - 始终在workspace目录下操作，严格遵守文件读写权限，不要尝试访问未授权的文件或目录。
                - workspace目录是你能够访问的唯一文件系统位置。
                - 禁止在非workspace目录下读写文件。`,
            },
          }
        });


        for await (const message of queryInstance) {
          if (message.type === 'system' && message.subtype === 'init') {
            const sessionId = message.session_id
            const userMessage: SDKUserMessage = {
              type: "user",
              message: {
                role: "user",
                content: input.query,
              },
              session_id: sessionId,
              parent_tool_use_id: null,
            }


            if (!input.sessionId) {
              await ctx.db.agentSession.create({
                data: {
                  sessionId,
                  workspaceId: input.workspaceId,
                  userId: ctx.session.user.id,
                  title: input.query.slice(0, 30),
                  messages: JSON.stringify([userMessage]),
                }
              });
            } else {
              const currentSession = await ctx.db.agentSession.findUnique({
                where: { sessionId: message.session_id },
                select: { messages: true }
              });
              if (currentSession) {
                // 统一处理：数据库中 messages 始终是 JSON 字符串
                const messagesStr = typeof currentSession.messages === 'string'
                  ? currentSession.messages
                  : '[]'; // 兜底处理，正常情况下不会走到这里
                const currentMessages = JSON.parse(messagesStr) as SDKMessage[];
                const updatedMessages = [...currentMessages, userMessage];

                await ctx.db.agentSession.update({
                  where: { sessionId: message.session_id },
                  data: {
                    messages: JSON.stringify(updatedMessages),
                  }
                });
              }

            }
            yield userMessage;
          }
          if (message.type === 'user') {
            yield message;
          }
          if (message.type === "assistant") {
            // 获取当前session的messages
            const currentSession = await ctx.db.agentSession.findUnique({
              where: { sessionId: message.session_id },
              select: { messages: true }
            });

            if (currentSession) {
              // 统一处理：数据库中 messages 始终是 JSON 字符串
              const messagesStr = typeof currentSession.messages === 'string'
                ? currentSession.messages
                : '[]'; // 兜底处理，正常情况下不会走到这里
              const currentMessages = JSON.parse(messagesStr) as SDKMessage[];
              const updatedMessages = [...currentMessages, message];

              await ctx.db.agentSession.update({
                where: { sessionId: message.session_id },
                data: {
                  messages: JSON.stringify(updatedMessages),
                }
              });
            }

            yield message;
          }
          if (message.type === "result") {
            yield message;
          }

        }
      }
    }),
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