import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis 连接配置
const redisConfig = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  // 如果使用本地 Redis
  lazyConnect: true,
  // 在开发环境使用简单的配置
  ...(process.env.NODE_ENV === 'development' && {
    family: 4,
    keepAlive: 30000,
  })
};

// 创建 Redis 连接
export const redisConnection = new Redis(redisConfig);

// 创建队列
export const agentQueue = new Queue('agent-tasks', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,  // 保留最近100个完成的任务
    removeOnFail: 50,       // 保留最近50个失败的任务
    attempts: 3,            // 默认重试3次
    backoff: {
      type: 'exponential',
      delay: 2000,          // 初始延迟2秒
    },
  },
});

// 队列事件监听器（用于调试和监控）
export const queueEvents = new QueueEvents('agent-tasks', {
  connection: redisConnection,
});

// 监听队列事件
queueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Job ${jobId} failed:`, failedReason);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`📊 Job ${jobId} progress:`, data);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🔄 Closing BullMQ connections...');
  Promise.all([
    agentQueue.close(),
    queueEvents.close(),
    redisConnection.quit(),
  ]).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Error closing connections:', error);
    process.exit(1);
  });
});

export default agentQueue;