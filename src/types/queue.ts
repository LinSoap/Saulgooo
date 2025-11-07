import type { TaskStatus } from './status';

/**
 * Agent 任务数据
 * BullMQ job 的数据结构
 */
export interface AgentTaskData {
  id: string; // 数据库主键
  sessionId?: string; // Claude 的 sessionId（用于恢复对话）
  query: string;
  workspaceId: string;
  userId: string;
}

/**
 * Session with status information
 * 避免循环导入的类型定义
 */
export type SessionWithStatus = {
  id: string;
  sessionId: string | null;
  title: string;
  bullJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
  status: TaskStatus;
  progress: number;
  isActive: boolean;
  attemptsMade: number;
  attemptsRemaining: number;
  failedReason: string | null;
  processedAt?: number | null;
  finishedAt?: number | null;
} & Record<string, unknown>;

/**
 * 创建任务的参数
 */
export interface AddTaskParams {
  id?: string;
  workspaceId: string;
  userId: string;
  query: string;
}