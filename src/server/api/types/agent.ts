// Agent SDK 相关的类型定义

export interface AgentQueryRequest {
  query: string;
  sessionId?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface AgentMessage {
  type: 'text' | 'tool_use' | 'tool_result' | 'agent_message' | 'result';
  content: string;
  text?: string;
  tool_use?: {
    id: string;
    name: string;
    input: Record<string, any>;
  };
  tool_result?: {
    tool_use_id: string;
    content: string;
    is_error?: boolean;
  };
  result?: any;
}

export interface AgentQueryResponse {
  id: string;
  type: 'query';
  status: 'completed' | 'failed' | 'running';
  started_at: string;
  completed_at?: string;
  messages: AgentMessage[];
  tools?: AgentTool[];
  error?: string;
}

export interface AgentSession {
  id: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'error';
  messages: AgentMessage[];
}