import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { join } from 'path';
import { homedir } from 'os';
import { redisConnection } from './queue';

const prisma = new PrismaClient();

// JobId到SessionId的映射缓存（worker本地）
const jobSessionMap = new Map<string, string>();

// 定义任务数据类型
interface AgentTaskData {
  sessionId: string; // 这是一个临时ID，用于数据库查找
  query: string;
  workspaceId: string;
  userId: string;
}

// Agent Task Worker - 在服务器启动时自动运行
export const agentWorker = new Worker<AgentTaskData>(
  'agent-tasks',
  async (job: Job<AgentTaskData>) => {
    const { sessionId: tempSessionId, query: queryText, workspaceId } = job.data;

    console.log(`🚀 Starting job ${job.id} for temp session ${tempSessionId}`);

    let realSessionId: string | null = null;

    try {
      // 1. 更新任务状态为运行中
      await prisma.agentSession.update({
        where: { sessionId: tempSessionId },
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

      // 3. 准备消息数组
      const messages: SDKMessage[] = [];

      console.log("Temp SessionId:", tempSessionId);

      // 4. 执行查询 - 不使用resume参数，让Claude生成新的sessionId
      const queryInstance = query({
        prompt: queryText,
        options: {
          maxTurns: 30,
          permissionMode: 'bypassPermissions',
          // 不使用resume，让Claude创建新的会话
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

      // 5. 处理消息流
      for await (const message of queryInstance) {
        messages.push(message);

        // 从init消息中获取真正的sessionId
        if (message.type === 'system' && message.subtype === 'init') {
          realSessionId = message.session_id;
          console.log(`🎯 Real session ID from Claude: ${realSessionId}`);

          // 更新数据库中的sessionId
          await prisma.agentSession.update({
            where: { sessionId: tempSessionId },
            data: {
              sessionId: realSessionId,
              updatedAt: new Date()
            }
          });

          // 更新本地job-session映射
          jobSessionMap.set(job.id!, realSessionId);

          // 发送sessionId更新通知（通过progress事件）
          await job.updateProgress({ type: 'sessionIdUpdate', oldSessionId: tempSessionId, newSessionId: realSessionId });
        }

        // 更新任务进度
        if (message.type === 'assistant') {
          await job.updateProgress(50);
        }

        // 如果是用户消息，添加到数据库
        if (message.type === 'user') {
          const currentSessionId = realSessionId ?? tempSessionId;
          const currentSession = await prisma.agentSession.findUnique({
            where: { sessionId: currentSessionId },
            select: { messages: true }
          });

          if (currentSession) {
            const parsedMessages: unknown = JSON.parse((currentSession.messages as string) ?? '[]');
            const existingMessages: SDKMessage[] = Array.isArray(parsedMessages)
              ? parsedMessages.filter((msg): msg is SDKMessage =>
                typeof msg === 'object' && msg !== null &&
                'type' in msg && 'content' in msg
              )
              : [];
            existingMessages.push(message);

            await prisma.agentSession.update({
              where: { sessionId: currentSessionId },
              data: {
                messages: JSON.stringify(existingMessages),
                updatedAt: new Date()
              }
            });
          }
        }
      }

      // 6. 任务完成，更新数据库
      const finalSessionId = realSessionId ?? tempSessionId;
      await prisma.agentSession.update({
        where: { sessionId: finalSessionId },
        data: {
          messages: JSON.stringify(messages),
          lastQuery: queryText,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Job ${job.id} completed successfully`);

      // 返回结果
      return {
        success: true,
        tempSessionId,
        realSessionId,
        sessionId: finalSessionId ?? tempSessionId,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1],
        messages
      };

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);

      // 更新错误信息到数据库
      const errorSessionId = realSessionId ?? tempSessionId;
      await prisma.agentSession.update({
        where: { sessionId: errorSessionId },
        data: {
          updatedAt: new Date()
        }
      });

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