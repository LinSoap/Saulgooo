import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { join } from 'path';
import { homedir } from 'os';
import { redisConnection } from './queue';
import { subscriptionManager } from '~/server/api/routers/agent';

const prisma = new PrismaClient();

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
    const { id, sessionId, query: queryText, workspaceId, userId } = job.data;

    console.log(`🚀 Starting job ${job.id} for session ${id}`);
    console.log('🔍 Worker - Job data:', {
      id,
      sessionId: sessionId || '(null - new session)',
      queryText: queryText.substring(0, 50) + '...',
      workspaceId,
      userId
    });

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
      console.log('🔍 Worker - Creating query instance');
      console.log('🔍 Worker - Resume sessionId:', sessionId || 'none (new conversation)');
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
      console.log('🔍 Worker - Query instance created, starting to process messages...');

      let realSessionId = sessionId;

      // 6. 处理消息流
      let messageCount = 0;
      console.log('🔍 Worker - Starting message processing loop');
      for await (const message of queryInstance) {
        messageCount++;
        console.log(`🔍 Worker - Message #${messageCount}:`, {
          type: message.type,
          subtype: (message as any).subtype,
          has_session_id: 'session_id' in message,
          session_id: (message as any).session_id
        });

        if (message.type === 'system' && message.subtype === 'init') {
          const sessionId = message.session_id
          console.log('🔍 Worker init - Claude sessionId:', sessionId);
          console.log('🔍 Worker init - Job data id:', job.data.id);

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
          // 不再需要收集消息到本地数组，消息已保存到数据库

          // await prisma.agentSession.create({
          //   data: {
          //     sessionId,
          //     workspaceId,
          //     userId,
          //     title: queryText.slice(0, 30),
          //     messages: JSON.stringify([userMessage]),
          //   }
          // });
          const currentSession = await prisma.agentSession.findUnique({
            where: { id: job.data.id },
            select: { messages: true, sessionId: true, id: true }
          });
          console.log('🔍 Worker init - Current session found:', !!currentSession);
          console.log('🔍 Worker init - Current session db sessionId:', currentSession?.sessionId);
          if (currentSession) {
            // 统一处理：数据库中 messages 始终是 JSON 字符串
            const messagesStr = typeof currentSession.messages === 'string'
              ? currentSession.messages
              : '[]'; // 兜底处理，正常情况下不会走到这里
            const currentMessages = JSON.parse(messagesStr) as SDKMessage[];
            const updatedMessages = [...currentMessages, userMessage];

            // 更新messages和sessionId到数据库
            const updateResult = await prisma.agentSession.update({
              where: { id: job.data.id },
              data: {
                sessionId: message.session_id, // 更新Claude的sessionId
                messages: JSON.stringify(updatedMessages),
              }
            });
            console.log('🔍 Worker init - Update result sessionId:', updateResult.sessionId);
            console.log('🔍 Worker init - Update result id:', updateResult.id);

            // 推送消息更新 - 使用数据库主键作为id
            subscriptionManager.emit(job.data.id, {
              type: 'message_update',
              id: job.data.id, // 使用数据库主键
              sessionId: message.session_id, // Claude的sessionId
              messages: updatedMessages,
              timestamp: new Date()
            });
            console.log('🔍 Worker init - Emitted message_update with id:', job.data.id);
          }

        }
        if (message.type === 'user') {
          // 消息已通过数据库更新，无需本地收集
        }
        if (message.type === "assistant") {
          // 消息已通过数据库更新，无需本地收集
          console.log('🔍 Worker assistant - Message session_id:', message.session_id);

          // 获取当前session的messages
          const currentSession = await prisma.agentSession.findUnique({
            where: { sessionId: message.session_id },
            select: { messages: true, id: true, sessionId: true }
          });
          console.log('🔍 Worker assistant - Found session by sessionId:', !!currentSession);

          if (currentSession) {
            // 统一处理：数据库中 messages 始终是 JSON 字符串
            const messagesStr = typeof currentSession.messages === 'string'
              ? currentSession.messages
              : '[]'; // 兜底处理，正常情况下不会走到这里
            const currentMessages = JSON.parse(messagesStr) as SDKMessage[];
            const updatedMessages = [...currentMessages, message];

            await prisma.agentSession.update({
              where: { sessionId: message.session_id },
              data: {
                messages: JSON.stringify(updatedMessages),
              }
            });

            console.log('🔍 Worker assistant - Session database id:', currentSession.id);
            console.log('🔍 Worker assistant - Session database sessionId:', currentSession.sessionId);
            // 推送消息更新 - 需要先获取数据库主键id
            const sessionWithId = await prisma.agentSession.findUnique({
              where: { sessionId: message.session_id },
              select: { id: true }
            });
            if (sessionWithId) {
              subscriptionManager.emit(sessionWithId.id, {
                type: 'message_update',
                id: sessionWithId.id, // 使用数据库主键
                sessionId: message.session_id, // Claude的sessionId
                messages: updatedMessages,
                timestamp: new Date()
              });
              console.log('🔍 Worker assistant - Emitted message_update with id:', sessionWithId.id);
            }
          }
        }
        if (message.type === "result") {
          // 消息已通过数据库更新，无需本地收集
        }

        // 更新任务进度
        if (message.type === 'assistant') {
          await job.updateProgress(50);
        }
      }

      console.log(`✅ Job ${job.id} completed successfully`);
      console.log(`🔍 Worker - Total messages processed: ${messageCount}`);
      console.log('🔍 Worker - Final realSessionId:', realSessionId);

      // 返回结果 - 只返回基本信息，消息数据通过 watchQuery 从数据库获取
      return {
        success: true,
        id,
        sessionId: realSessionId
      };

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      console.error('🔍 Worker - Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        sessionId,
        queryText: queryText.substring(0, 100)
      });

      // 更新错误信息到数据库
      try {
        await prisma.agentSession.update({
          where: { id },
          data: {
            updatedAt: new Date()
          }
        });
        console.log('🔍 Worker - Updated session error timestamp');
      } catch (updateError) {
        console.error('🔍 Worker - Failed to update session error timestamp:', updateError);
      }

      // 重新抛出错误让 BullMQ 处理重试
      throw error;
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