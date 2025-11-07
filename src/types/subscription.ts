import type { Query, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { TaskStatus } from './status';

/**
 * 消息类型定义
 * 用于 agent 与前端之间的通信
 */
export interface Message {
  type: 'init' | 'message_update' | 'completed' | 'failed';
  id: string;  // 数据库内部 ID
  sessionId: string | null;  // Claude 的 sessionId
  status?: TaskStatus;  // 使用统一的 TaskStatus
  progress?: number;
  messages?: SDKMessage[];  // 最新消息列表
  title?: string;
  createdAt?: Date;
  timestamp?: Date;
  error?: string;  // 错误信息，用于 failed 状态
}

// SubscriptionManager 类型
export interface SubscriptionManager {
  register: (id: string, fn: (data: Message) => void) => void;
  unregister: (id: string) => void;
  emit: (id: string, data: Message) => void;
  registerQuery: (id: string, query: Query) => void;
  unregisterQuery: (id: string) => void;
  interruptQuery: (id: string) => Promise<boolean>;
  hasActiveQuery: (id: string) => boolean;
}