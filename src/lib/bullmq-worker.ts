/**
 * BullMQ Worker 处理逻辑
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { HookInput, HookJSONOutput, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { join } from 'path';
import type { TaskStatus } from '~/types/status';
import { getWorkspaceBaseDir } from './workspace-config';
import type { AgentTaskData } from '~/types/queue';
import type { Redis } from 'ioredis';
import type { BashInput } from '~/types/tools';
import { buildSystemPrompt, type AIPreferences } from './prompt';

// PrismaClient 单例
let prismaInstance: PrismaClient | null = null;
export const getPrisma = () => {
  prismaInstance ??= new PrismaClient();
  return prismaInstance;
};

async function checkBashCommand(
  input_data: HookInput,
): Promise<HookJSONOutput> {

  if (input_data.hook_event_name === 'PreToolUse') {
    const bashinput = input_data.tool_input as BashInput
    const command = bashinput.command;

    // 只允许 srt 命令
    if (!command.startsWith('srt')) {
      return {
        reason: "Only srt commands are allowed",
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: "Security policy: only srt commands permitted"
        }
      };
    }
  }

  // 允许 srt 命令
  return {};
}

// 公共方法：更新会话消息
async function updateSessionMessages(
  where: { id: string } | { sessionId: string },
  newMessage: SDKMessage,
  additionalData?: Record<string, unknown>
) {
  const prisma = getPrisma();
  const currentSession = await prisma.agentSession.findUnique({
    where,
    select: { messages: true, id: true, sessionId: true }
  });

  if (!currentSession) return null;

  const messagesStr = typeof currentSession.messages === 'string'
    ? currentSession.messages
    : '[]';
  const currentMessages = JSON.parse(messagesStr) as SDKMessage[];
  const updatedMessages = [...currentMessages, newMessage];

  await prisma.agentSession.update({
    where,
    data: {
      messages: JSON.stringify(updatedMessages),
      ...additionalData
    }
  });

  return { currentSession, updatedMessages };
}

// Worker 处理函数
export async function processAgentTask(job: Job<AgentTaskData>) {
  const { id, sessionId, query: queryText, workspaceId, userId } = job.data;
  const prisma = getPrisma();

  // 延迟导入 subscriptionManager
  const { subscriptionManager } = await import('~/server/api/routers/agent');

  console.log(`🚀 Starting job ${job.id} for session ${id}`);

  try {
    // 1. 更新任务状态为运行中（先清理可能已有相同 bullJobId 的 session，防止唯一约束冲突）
    await prisma.$transaction([
      prisma.agentSession.updateMany({ where: { bullJobId: job.id }, data: { bullJobId: null } }),
      prisma.agentSession.update({
        where: { id },
        data: {
          bullJobId: job.id,
          updatedAt: new Date(),
        }
      })
    ]);

    // 2. 获取工作区路径和用户偏好
    const [workspace, user] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { path: true }
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      })
    ]);

    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const cwd = join(getWorkspaceBaseDir(), workspace.path);

    let userPreferences: AIPreferences | null = null;
    if (user?.preferences) {
      try {
        userPreferences = JSON.parse(user.preferences) as AIPreferences;
      } catch (e) {
        console.warn('Failed to parse user preferences:', e);
      }
    }

    const systemPromptAppend = buildSystemPrompt(userPreferences);

    // 3. 执行查询
    const queryInstance = query({
      prompt: queryText,
      options: {
        maxTurns: 30,
        permissionMode: 'bypassPermissions',
        settingSources: ['project'],
        hooks: {
          PreToolUse: [
            { matcher: "Bash", hooks: [checkBashCommand] }
          ]
        },
        resume: sessionId,
        cwd,
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          append: systemPromptAppend
        },
      }
    });

    // 4. 注册查询实例到 SubscriptionManager
    subscriptionManager.registerQuery(id, queryInstance);
    let realSessionId = sessionId;

    // 5. 处理消息流
    for await (const message of queryInstance) {
      // 检查是否被中断
      if (!subscriptionManager.hasActiveQuery(id)) {
        console.log(`⚠️ Query interrupted for session ${id}, breaking out of message loop`);
        break;
      }

      // 更新任务进度
      await job.updateProgress(50);

      if (message.type === 'system' && message.subtype === 'init') {
        const sessionId = message.session_id;

        await updateSessionMessages(
          { id: job.data.id },
          message,
          { sessionId: message.session_id }
        );

        const userMessage: SDKUserMessage = {
          type: "user",
          message: {
            role: "user",
            content: queryText,
          },
          session_id: sessionId,
          parent_tool_use_id: null,
        };

        realSessionId = sessionId;

        const result = await updateSessionMessages(
          { id: job.data.id },
          userMessage,
          { sessionId: message.session_id }
        );

        if (result) {
          subscriptionManager.emit(job.data.id, {
            type: 'message_update',
            id: job.data.id,
            sessionId: result.currentSession.sessionId,
            messages: result.updatedMessages,
            status: 'running' as TaskStatus,
            timestamp: new Date()
          });
        }
      }

      if (message.type === 'user') {
        const result = await updateSessionMessages(
          { sessionId: message.session_id },
          message
        );

        if (result) {
          subscriptionManager.emit(job.data.id, {
            type: 'message_update',
            id: job.data.id,
            sessionId: message.session_id,
            messages: result.updatedMessages,
            status: 'running' as TaskStatus,
            timestamp: new Date()
          });
        }
      }

      if (message.type === "assistant") {
        const result = await updateSessionMessages(
          { sessionId: message.session_id },
          message
        );

        if (result) {
          subscriptionManager.emit(job.data.id, {
            type: 'message_update',
            id: job.data.id,
            sessionId: message.session_id,
            messages: result.updatedMessages,
            status: 'running' as TaskStatus,
            timestamp: new Date()
          });
        }
      }

      if (message.type === "result") {
        const result = await updateSessionMessages(
          { sessionId: message.session_id },
          message
        );

        if (result) {
          const success = message.subtype === 'success';
          subscriptionManager.emit(job.data.id, {
            type: 'message_update',
            id: job.data.id,
            sessionId: message.session_id,
            messages: result.updatedMessages,
            status: (success ? 'completed' : 'failed') as TaskStatus,
            timestamp: new Date()
          });
        }
      }
    }

    // 返回结果
    return {
      success: true,
      id,
      sessionId: realSessionId
    };

  } catch (error) {
    // 推送失败状态
    const { subscriptionManager } = await import('~/server/api/routers/agent');
    subscriptionManager.emit(id, {
      type: 'message_update',
      id,
      sessionId: null,
      messages: [],
      status: 'failed' as TaskStatus,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date()
    });

    // 更新错误信息到数据库
    try {
      await prisma.agentSession.update({
        where: { id },
        data: {
          updatedAt: new Date()
        }
      });
    } catch {
      throw error;
    }
  } finally {
    // 清理：注销查询实例
    const { subscriptionManager } = await import('~/server/api/routers/agent');
    subscriptionManager.unregisterQuery(id);
  }
}

// 创建 Worker
export function createAgentWorker(connection: Redis) {
  return new Worker<AgentTaskData>(
    'agent-tasks',
    processAgentTask,
    {
      connection,
      concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '2'),
    }
  );
}