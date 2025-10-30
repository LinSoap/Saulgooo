import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { join } from 'path';
import { homedir } from 'os';
import { redisConnection } from './queue';

const prisma = new PrismaClient();

// Agent Task Worker - 在服务器启动时自动运行
export const agentWorker = new Worker(
  'agent-tasks',
  async (job) => {
    const { sessionId, query: queryText, workspaceId } = job.data as {
      sessionId: string;
      query: string;
      workspaceId: string;
    };

    console.log(`🚀 Starting job ${job.id} for session ${sessionId}`);

    try {
      // 1. 更新任务状态为运行中
      await prisma.agentSession.update({
        where: { sessionId },
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

      // 4. 执行查询
      const queryInstance = query({
        prompt: queryText,
        options: {
          maxTurns: 30,
          permissionMode: 'bypassPermissions',
          resume: sessionId,
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

        // 更新任务进度
        if (message.type === 'assistant') {
          await job.updateProgress(50);
        }

        // 如果是用户消息，添加到数据库
        if (message.type === 'user') {
          const currentSession = await prisma.agentSession.findUnique({
            where: { sessionId },
            select: { messages: true }
          });

          if (currentSession) {
            const existingMessages = JSON.parse((currentSession.messages as string) ?? '[]') as SDKMessage[];
            existingMessages.push(message);

            await prisma.agentSession.update({
              where: { sessionId },
              data: {
                messages: JSON.stringify(existingMessages),
                updatedAt: new Date()
              }
            });
          }
        }
      }

      // 6. 任务完成，更新数据库
      await prisma.agentSession.update({
        where: { sessionId },
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
        sessionId,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]
      };

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);

      // 更新错误信息到数据库
      await prisma.agentSession.update({
        where: { sessionId },
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