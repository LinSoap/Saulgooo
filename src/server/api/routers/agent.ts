import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { ContentBlock } from "@anthropic-ai/sdk/resources/messages";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Prisma } from "@prisma/client";

// 使用 Anthropic SDK 的类型
type ContentItem = ContentBlock;

interface StoredMessage {
  role: "user" | "assistant";
  content: string | ContentItem[];
  timestamp: string;
}

// 将消息转换为 Prisma JsonValue 格式
const toPrismaJson = (messages: StoredMessage[]): Prisma.InputJsonValue => {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp
  })) as Prisma.InputJsonValue;
};


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

  // 执行 Agent 查询（带 session 支持）
  query: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, "查询内容不能为空"),
        workspaceId: z.string(),
        sessionId: z.string().optional(), // Claude SDK 的 session ID，用于恢复对话
      })
    )
    .mutation(async ({ ctx, input }): Promise<{ content: string; sessionId?: string }> => {
      try {
        // 获取工作路径
        let cwd = process.cwd();
        if (input.workspaceId) {
          const workspace = await ctx.db.workspace.findUnique({
            where: { id: input.workspaceId },
            select: { path: true },
          });

          if (workspace?.path) {
            cwd = join(homedir(), 'workspaces', workspace.path);
          } else {
            throw new Error("工作区路径未配置");
          }
        }

        let result: unknown = null;
        let claudeSessionId: string | undefined;
        const messageContents: ContentItem[] = []; // 收集所有助手消息内容

        // 使用 Agent SDK 的 query 方法
        try {
          for await (const message of query({
            prompt: input.query,
            options: {
              maxTurns: 30,
              permissionMode: 'bypassPermissions',
              resume: input.sessionId ?? undefined,
              cwd, // 设置工作目录
              systemPrompt: {
                type: "preset",
                preset: "claude_code",
                append:
                  ` - 始终在workspace目录下操作，严格遵守文件读写权限，不要尝试访问未授权的文件或目录。
                    - workspace目录是你能够访问的唯一文件系统位置。
                    - 禁止在非workspace目录下读写文件。`,
              },
            }
          })) {
            // 获取 session ID
            if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
              claudeSessionId = message.session_id;
            }

            // 收集助手消息内容
            if (message.type === 'assistant' && message.message?.content) {
              if (Array.isArray(message.message.content)) {
                // 将 Beta 类型转换为标准类型
                messageContents.push(...(message.message.content as ContentItem[]));
              } else {
                messageContents.push(message.message.content as ContentItem);
              }
            }

            // 获取最终结果
            if (message.type === "result" && message.subtype === "success" && message.result) {
              result = message.result;
            }
          }
        } catch (sdkError) {
          throw sdkError;
        }

        // 转换结果为字符串
        const content = typeof result === 'string' ? result : JSON.stringify(result);

        // 准备保存的消息
        const messagesToSave: StoredMessage[] = [
          {
            role: "user",
            content: input.query,
            timestamp: new Date().toISOString()
          }
        ];

        // 如果有助手消息内容，保存它们
        if (messageContents.length > 0) {
          // 如果有最终结果，添加到内容末尾
          if (content?.trim?.()) {
            messageContents.push({
              type: 'text',
              text: content,
              citations: null
            } as ContentItem);
          }

          messagesToSave.push({
            role: "assistant",
            content: messageContents,
            timestamp: new Date().toISOString()
          });
        } else if (content?.trim?.()) {
          // 如果没有收集到消息内容，只保存最终结果
          messagesToSave.push({
            role: "assistant",
            content: content,
            timestamp: new Date().toISOString()
          });
        }

        // 保存或更新会话
        if (!input.sessionId && claudeSessionId) {
          // 创建新会话
          const title = input.query.length > 20 ? input.query.substring(0, 20) + "..." : input.query;

          await ctx.db.agentSession.create({
            data: {
              workspaceId: input.workspaceId,
              userId: ctx.session.user.id,
              title,
              sessionId: claudeSessionId,
              messages: toPrismaJson(messagesToSave),
            }
          });
        } else if (input.sessionId) {
          // 更新现有会话
          const existingSession = await ctx.db.agentSession.findUnique({
            where: { sessionId: input.sessionId },
            select: { messages: true }
          });

          if (existingSession) {
            const existingMessages: StoredMessage[] = Array.isArray(existingSession.messages)
              ? (existingSession.messages)
                .filter((msg): msg is Prisma.JsonObject => {
                  if (!msg || typeof msg !== 'object') return false;
                  const messageObj = msg as Record<string, unknown>;
                  return (
                    'role' in messageObj &&
                    'content' in messageObj &&
                    'timestamp' in messageObj &&
                    (messageObj.role === 'user' || messageObj.role === 'assistant')
                  );
                })
                .map((msg) => {
                  const messageObj = msg as Record<string, unknown>;
                  return {
                    role: messageObj.role as "user" | "assistant",
                    content: messageObj.content as string | ContentItem[],
                    timestamp: messageObj.timestamp as string
                  };
                })
              : [];

            await ctx.db.agentSession.update({
              where: { sessionId: input.sessionId },
              data: {
                messages: toPrismaJson([...existingMessages, ...messagesToSave]),
                updatedAt: new Date()
              }
            });
          }
        }

        return {
          content,
          sessionId: claudeSessionId
        };
      } catch (error) {

        // 提供更友好的错误信息
        let errorMessage = "查询失败";
        if (error instanceof Error) {
          if (error.message.includes("code 1")) {
            errorMessage = "AI 服务暂时不可用，请稍后再试";
          } else if (error.message.includes("ENOENT")) {
            errorMessage = "工作目录不存在，请检查工作区配置";
          } else if (error.message.includes("EACCES")) {
            errorMessage = "没有权限访问工作目录";
          } else {
            errorMessage = error.message;
          }
        }

        throw new Error(errorMessage);
      }
    }),
});