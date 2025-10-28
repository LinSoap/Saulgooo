import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { join } from "node:path";
import { homedir } from "node:os";
import { db } from "~/server/db";

export const agentRouter = createTRPCRouter({
  // 执行 Agent 查询
  query: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1, "查询内容不能为空"),
        workspaceId: z.string().optional(),
      })
    )
    .mutation(async ({ input }): Promise<{ content: string }> => {
      try {
        // 获取工作路径
        let cwd = process.cwd();
        if (input.workspaceId) {
          const workspace = await db.workspace.findUnique({
            where: { id: input.workspaceId },
            select: { path: true },
          });

          if (workspace?.path) {
            cwd = join(homedir(), 'workspaces', workspace.path);
          }
        }

        let result: unknown = null;

        // 使用 Agent SDK 的 query 方法
        for await (const message of query({
          prompt: input.query,
          options: {
            maxTurns: 10,
            permissionMode: 'bypassPermissions',
            continue: true,
            cwd, // 设置工作目录
          }
        })) {
          // 只获取结果
          if (message.type === "result" && message.subtype === "success" && message.result) {
            result = message.result;
          }
        }

        // 返回简单的内容字符串
        return {
          content: typeof result === 'string' ? result : JSON.stringify(result)
        };
      } catch (error) {
        console.error("Agent query error:", error);
        throw new Error(error instanceof Error ? error.message : "查询失败");
      }
    }),
});