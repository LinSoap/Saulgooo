/**
 * BullMQ 配置 - KISS 原则
 * 核心 BullMQ 设置
 */

import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { createAgentWorker, getPrisma } from './bullmq-worker';

// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  maxRetriesPerRequest: null,
  lazyConnect: true,
};

// 创建 Redis 连接
export const redisConnection = new Redis(redisConfig);

// 创建队列
export const agentQueue = new Queue('agent-tasks', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

// 队列事件监听
export const queueEvents = new QueueEvents('agent-tasks', {
  connection: redisConnection,
});

queueEvents.on('completed', ({ jobId }) => console.log(`✅ Job ${jobId} completed`));
queueEvents.on('failed', ({ jobId, failedReason }) => console.error(`❌ Job ${jobId} failed:`, failedReason));
queueEvents.on('progress', ({ jobId, data }) => console.log(`📊 Job ${jobId} progress:`, data));

// 初始化函数
let initialized = false;
export function initializeBullMQ() {
  if (initialized) return;

  console.log('🚀 Initializing BullMQ...');

  // 创建 Worker
  const worker = createAgentWorker(redisConnection);

  // Worker 事件监听
  worker.on('completed', (job) => console.log(`🎉 Worker completed job ${job?.id}`));
  worker.on('failed', (job, err) => console.error(`💥 Worker failed:`, err.message));
  worker.on('error', (err) => console.error('Worker error:', err));

  console.log('✅ BullMQ initialized');
  console.log('   - Queue: agent-tasks');
  console.log('   - Worker: running with concurrency 2');

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n🔄 Closing BullMQ...');
    (async () => {
      await Promise.all([
        agentQueue.close(),
        queueEvents.close(),
        worker.close(),
        redisConnection.quit(),
        getPrisma().$disconnect(),
      ]);
      process.exit(0);
    })().catch(err => {
      console.error('Error during shutdown:', err);
      process.exit(1);
    });
  });

  initialized = true;
}