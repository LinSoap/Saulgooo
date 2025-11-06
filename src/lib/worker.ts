import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { join } from 'path';
import { homedir } from 'os';
import { redisConnection } from './queue';
import { subscriptionManager } from '~/server/api/routers/agent';

const prisma = new PrismaClient();

// 公共方法：更新会话消息（只负责数据库操作）
async function updateSessionMessages(
  where: Prisma.AgentSessionWhereUniqueInput,
  newMessage: SDKMessage,
  additionalData?: Record<string, unknown>
) {
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

// 定义任务数据类型
interface AgentTaskData {
  id: string; // 数据库主键
  sessionId?: string; // Claude 的 sessionId（用于恢复对话）
  query: string;
  workspaceId: string;
  userId: string;
}

// Agent Task Worker - 在服务器启动时自动运行
export const agentWorker = new Worker<AgentTaskData>(
  'agent-tasks',
  async (job: Job<AgentTaskData>) => {
    const { id, sessionId, query: queryText, workspaceId } = job.data;

    console.log(`🚀 Starting job ${job.id} for session ${id}`);



    try {
      // 1. 更新任务状态为运行中
      await prisma.agentSession.update({
        where: { id },
        data: {
          bullJobId: job.id,
          updatedAt: new Date(),
        }
      });

      // 2. 获取工作区路径
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { path: true }
      });

      if (!workspace) {
        throw new Error(`Workspace ${workspaceId} not found`);
      }

      const cwd = join(homedir(), 'workspaces', workspace.path);


      // 5. 执行查询
      const queryInstance = query({
        prompt: queryText,
        options: {
          maxTurns: 30,
          permissionMode: 'bypassPermissions',
          // 如果有 sessionId，恢复对话
          resume: sessionId ?? undefined,
          cwd,
          systemPrompt: {
            type: "preset",
            preset: "claude_code",
            append: ` - 始终在workspace目录下操作，严格遵守文件读写权限，不要尝试访问未授权的文件或目录。
              - workspace目录是你能够访问的唯一文件系统位置。
              - 禁止在非workspace目录下读写文件。`,
          },
        }
      });

      // 注册查询实例到 SubscriptionManager（用于优雅中断）
      subscriptionManager.registerQuery(id, queryInstance);

      let realSessionId = sessionId;

      // 6. 处理消息流
      for await (const message of queryInstance) {
        // 更新任务进度
        await job.updateProgress(50);
        if (message.type === 'system' && message.subtype === 'init') {
          const sessionId = message.session_id

          const userMessage: SDKUserMessage = {
            type: "user",
            message: {
              role: "user",
              content: queryText,
            },
            session_id: sessionId,
            parent_tool_use_id: null,
          }

          realSessionId = sessionId;

          const result = await updateSessionMessages(
            { id: job.data.id },
            userMessage,
            { sessionId: message.session_id }
          );

          if (result) {
            const { currentSession, updatedMessages } = result;
            // 推送消息更新 - 使用数据库主键作为id
            subscriptionManager.emit(job.data.id, {
              type: 'message_update',
              id: job.data.id, // 使用数据库主键
              sessionId: currentSession.sessionId, // Claude的sessionId
              messages: updatedMessages,
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
            const { currentSession, updatedMessages } = result;
            subscriptionManager.emit(currentSession.id, {
              type: 'message_update',
              id: currentSession.id,
              sessionId: message.session_id,
              messages: updatedMessages,
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
            const { currentSession, updatedMessages } = result;
            subscriptionManager.emit(currentSession.id, {
              type: 'message_update',
              id: currentSession.id,
              sessionId: message.session_id,
              messages: updatedMessages,
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
            const { currentSession, updatedMessages } = result;
            subscriptionManager.emit(currentSession.id, {
              type: 'message_update',
              id: currentSession.id,
              sessionId: message.session_id,
              messages: updatedMessages,
              timestamp: new Date()
            });
          }
        }
      }

      console.log(`✅ Job ${job.id} completed successfully`);

      // 返回结果 - 只返回基本信息，消息数据通过 watchQuery 从数据库获取
      return {
        success: true,
        id,
        sessionId: realSessionId
      };

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);

      // 更新错误信息到数据库
      try {
        await prisma.agentSession.update({
          where: { id },
          data: {
            updatedAt: new Date()
          }
        });
      } catch {
        // 重新抛出错误让 BullMQ 处理重试
        throw error;
      }
    } finally {
      // 清理：注销查询实例
      if (subscriptionManager.hasActiveQuery(id)) {
        subscriptionManager.unregisterQuery(id);
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '2'),
    limiter: {
      max: 10,
      duration: 10000,
    },
  }
);

// Worker 事件监听
agentWorker.on('completed', (job) => {
  console.log(`🎉 Worker completed job ${job?.id ?? 'unknown'}`);
});

agentWorker.on('failed', (job, err) => {
  console.error(`💥 Worker failed job ${job?.id ?? 'unknown'}:`, err.message);
});

agentWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🔄 Closing worker...');
  Promise.all([
    agentWorker.close(),
    prisma.$disconnect(),
  ]).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Error closing worker:', error);
    process.exit(1);
  });
});

// 导出 worker 实例（如果需要手动控制）
export default agentWorker;