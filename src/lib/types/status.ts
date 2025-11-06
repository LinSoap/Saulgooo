/**
 * 统一的任务状态定义
 * 整个项目只使用这4种状态，不直接暴露BullMQ的内部状态
 */
export type TaskStatus = 'idle' | 'running' | 'completed' | 'failed';

// 状态常量，避免手误
export const TASK_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

// 辅助函数：检查状态
export const TaskStatusHelper = {
  isRunning: (status: TaskStatus): boolean => status === 'running',
  isCompleted: (status: TaskStatus): boolean => status === 'completed',
  isFailed: (status: TaskStatus): boolean => status === 'failed',
  isFinished: (status: TaskStatus): boolean =>
    status === 'completed' || status === 'failed',
  canStart: (status: TaskStatus): boolean => status === 'idle'
} as const;