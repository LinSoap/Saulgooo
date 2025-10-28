import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentQueryResponse, AgentSession } from "../types/agent";

// Agent SDK - 需要安装 @anthropic-ai/claude-agent-sdk-typescript

export const agentRouter = createTRPCRouter({
  // 执行 Agent 查询
  query: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, "查询内容不能为空"),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }): Promise<AgentQueryResponse> => {
      try {
        const startTime = new Date().toISOString();
        let result: any = null;

        // 使用 Agent SDK 的 query 方法
        for await (const message of query({
          prompt: input.query,
          options: {
            maxTurns: 10,
            allowedTools: ["Read", "Grep"]
          }
        })) {
          // 只获取结果
          if (message.type === "result") {
            // @ts-ignore
            result = message.result;
          }
        }

        const endTime = new Date().toISOString();

        return {
          id: `query_${Date.now()}`,
          type: "query",
          status: "completed",
          started_at: startTime,
          completed_at: endTime,
          messages: [
            {
              type: "text",
              content: typeof result === 'string' ? result : JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        console.error("Agent query error:", error);
        throw new Error(error instanceof Error ? error.message : "查询失败");
      }
    }),

  // 获取 Agent 会话历史
  getSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }): Promise<AgentSession> => {
      // TODO: 实现获取会话历史的逻辑
      return {
        id: input.sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "active",
        messages: [],
      };
    }),
});