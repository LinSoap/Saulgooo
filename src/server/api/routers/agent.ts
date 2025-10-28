import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { join } from "node:path";
import { homedir } from "node:os";

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

        // 使用 Agent SDK 的 query 方法
        try {
          for await (const message of query({
            prompt: input.query,
            options: {
              maxTurns: 10,
              permissionMode: 'bypassPermissions',
              // continue: true,
              resume: input.sessionId ?? undefined,
              cwd, // 设置工作目录
            }

          })) {
            // 记录所有消息类型用于调试

            // 初始化时获取 session ID
            if (message.type === 'system' && message.subtype === 'init' && message.session_id) {
              claudeSessionId = message.session_id;
              console.log("Got Claude session ID:", claudeSessionId);
            }

            // 获取结果
            if (message.type === "result" && message.subtype === "success" && message.result) {
              result = message.result;
            }
          }
        } catch (sdkError) {
          console.error("Agent SDK error:", sdkError);
          throw sdkError;
        }

        // 转换结果
        const content = typeof result === 'string' ? result : JSON.stringify(result);

        // 如果是新 session（没有传入 sessionId），保存到数据库
        if (!input.sessionId && claudeSessionId) {
          console.log("Creating new session with Claude session ID:", claudeSessionId);
          try {
            // 生成会话标题（取查询的前20个字符）
            const title = input.query.length > 20 ? input.query.substring(0, 20) + "..." : input.query;

            const newSession = await ctx.db.agentSession.create({
              data: {
                workspaceId: input.workspaceId,
                userId: ctx.session.user.id,
                title: title,
                sessionId: claudeSessionId,
                messages: [{
                  role: "user",
                  content: input.query,
                  timestamp: new Date().toISOString()
                }, {
                  role: "assistant",
                  content: content,
                  timestamp: new Date().toISOString()
                }],
              }
            });
            console.log("Session created successfully with sessionId:", newSession.sessionId);
          } catch (error) {
            console.error("Failed to save session:", error);
          }
        } else if (input.sessionId) {
          // 继续现有会话，需要更新数据库中的消息
          console.log("Continuing existing session. input.sessionId:", input.sessionId);
          try {
            // 先获取现有会话
            const existingSession = await ctx.db.agentSession.findUnique({
              where: { sessionId: input.sessionId },
              select: { messages: true }
            });

            if (existingSession) {
              // 获取现有消息数组
              const existingMessages = existingSession.messages as Array<{
                role: string;
                content: string;
                timestamp: string;
              }> || [];

              // 添加新的用户消息和AI回复
              const updatedMessages = [
                ...existingMessages,
                {
                  role: "user",
                  content: input.query,
                  timestamp: new Date().toISOString()
                },
                {
                  role: "assistant",
                  content: content,
                  timestamp: new Date().toISOString()
                }
              ];

              // 更新数据库
              await ctx.db.agentSession.update({
                where: { sessionId: input.sessionId },
                data: {
                  messages: updatedMessages,
                  updatedAt: new Date()
                }
              });

              console.log("Session messages updated successfully for sessionId:", input.sessionId);
            }
          } catch (error) {
            console.error("Failed to update session messages:", error);
          }
        }

        return {
          content,
          sessionId: claudeSessionId  // 返回 Claude 的 session ID
        };
      } catch (error) {
        console.error("Agent query error:", error);

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