/**
 * 队列工具函数
 * 重新导出 queue-service 中的函数，保持向后兼容
 */

export {
  addAgentTask,
  getTaskStatus,
  cancelTask,
  getWorkspaceSessionsWithStatus,
} from './queue-service';

// 导出类型
export type { SessionWithStatus } from '../types/queue';