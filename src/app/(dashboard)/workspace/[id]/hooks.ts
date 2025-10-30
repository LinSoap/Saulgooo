import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '~/trpc/react';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

// 任务状态类型
type TaskStatus = 'idle' | 'waiting' | 'active' | 'completed' | 'failed' | 'error' | 'unknown' | 'init';

// 订阅数据类型（匹配后端返回）
// 订阅数据类型 - 与 tRPC 返回类型匹配
interface SubscriptionData {
  status?: 'active' | 'completed' | 'failed' | 'waiting' | 'unknown';
  progress?: number;
  messages?: unknown[];
  lastMessage?: unknown;
  [key: string]: unknown; // 允许其他字段
}

// Hook 返回类型
interface UseBackgroundQueryReturn {
  messages: SDKMessage[];
  isLoading: boolean;
  status: TaskStatus;
  progress: number;
  error: string | null;
  sessionId: string | null;
  jobId: string | null;
  sendQuery: (query: string) => Promise<void>;
  cancelQuery: () => Promise<void>;
  reset: () => void;
}

export function useBackgroundQuery(
  workspaceId: string,
  initialSessionId?: string | null
): UseBackgroundQueryReturn {
  // 本地状态
  const [messages, setMessages] = useState<SDKMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<TaskStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Refs 用于跟踪当前任务
  const currentSessionRef = useRef<string | null>(initialSessionId ?? null);
  const currentJobRef = useRef<string | null>(null);

  // API hooks
  const startQueryMutation = api.agent.startQuery.useMutation();
  const cancelQueryMutation = api.agent.cancelQuery.useMutation();
  const getSessionHistoryQuery = api.agent.getSessionHistory.useQuery(
    { sessionId: sessionId! },
    {
      enabled: !!sessionId && !currentJobRef.current, // 只有在没有活跃任务时才获取历史消息
      refetchOnWindowFocus: false,
    }
  );

  // 监听 sessionId 变化
  useEffect(() => {
    if (initialSessionId !== currentSessionRef.current) {
      setSessionId(initialSessionId ?? null);
      currentSessionRef.current = initialSessionId ?? null;
      currentJobRef.current = null;
      setJobId(null);
      setStatus('idle');
      setProgress(0);
      setError(null);
      setMessages([]);
    }
  }, [initialSessionId]);

  // 加载历史消息
  useEffect(() => {
    if (getSessionHistoryQuery.data && !currentJobRef.current) {
      const parsedMessages: unknown = getSessionHistoryQuery.data.messages;
      const safeMessages: SDKMessage[] = Array.isArray(parsedMessages)
        ? parsedMessages.filter((msg): msg is SDKMessage =>
          typeof msg === 'object' && msg !== null &&
          'type' in msg && 'content' in msg
        )
        : [];
      setMessages(safeMessages);
      setStatus((getSessionHistoryQuery.data.status ?? 'idle') as TaskStatus);
    }
  }, [getSessionHistoryQuery.data]);

  // 当前活跃的订阅状态
  const [activeSubscription, setActiveSubscription] = useState<{
    sessionId: string;
    jobId: string;
  } | null>(null);

  // 动态订阅 - 只有当有活跃任务时才启用
  const _subscription = api.agent.watchQuery.useSubscription(
    activeSubscription ? {
      sessionId: activeSubscription.sessionId,
      jobId: activeSubscription.jobId
    } : { sessionId: '', jobId: '' }, // 空值当未激活时
    {
      enabled: !!activeSubscription, // 只有当有活跃订阅时才启用
      onData: (data: unknown) => {
        const subscriptionData = data as SubscriptionData;
        console.log('📡 Received subscription data:', subscriptionData);

        // 更新状态
        setStatus(subscriptionData.status ?? 'unknown');
        setProgress(subscriptionData.progress ?? 0);

        // 处理消息更新
        if (subscriptionData.messages && Array.isArray(subscriptionData.messages)) {
          const safeMessages = subscriptionData.messages.filter((msg): msg is SDKMessage =>
            typeof msg === 'object' && msg !== null &&
            'type' in msg && 'content' in msg
          );
          setMessages(safeMessages);
        } else if (subscriptionData.lastMessage) {
          const lastMsg = subscriptionData.lastMessage;
          if (typeof lastMsg === 'object' && lastMsg !== null &&
            'type' in lastMsg && 'content' in lastMsg) {
            setMessages(prev => [...prev, lastMsg as unknown as SDKMessage]);
          }
        }

        // 处理错误状态
        if (subscriptionData.status === 'failed') {
          setError('任务执行失败');
          setIsLoading(false);
        } else if (subscriptionData.status === 'completed') {
          setIsLoading(false);
          setError(null);
        } else if (subscriptionData.status === 'active') {
          setIsLoading(true);
          setError(null);
        }

        // 处理sessionId变化
        if (subscriptionData.type === 'sessionIdChanged' && subscriptionData.newSessionId && typeof subscriptionData.newSessionId === 'string') {
          const oldSessionIdStr = subscriptionData.oldSessionId && typeof subscriptionData.oldSessionId === 'string' ? subscriptionData.oldSessionId : 'unknown';
          console.log(`🔄 Session ID changed from ${oldSessionIdStr} to ${subscriptionData.newSessionId}`);
          setSessionId(subscriptionData.newSessionId);
          currentSessionRef.current = subscriptionData.newSessionId;
          // 更新活跃订阅
          if (activeSubscription) {
            setActiveSubscription({
              ...activeSubscription,
              sessionId: subscriptionData.newSessionId
            });
          }
        }
      },
      onError: (err: unknown) => {
        const error = err as { message?: string };
        console.error('Subscription error:', error);
        setError(error?.message ?? '订阅连接错误');
        setIsLoading(false);
        setStatus('error');
      },
      onComplete: () => {
        console.log('Subscription completed');
        setIsLoading(false);
      },
    }
  );

  // 发送查询
  const sendQuery = useCallback(async (query: string) => {
    if (!workspaceId || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);
      setStatus('waiting');

      // 启动任务
      const result = await startQueryMutation.mutateAsync({
        query,
        workspaceId,
        sessionId: sessionId ?? undefined,
      });

      if (!result.sessionId || !result.jobId) {
        throw new Error('Invalid response from server');
      }

      // 更新状态
      setSessionId(result.sessionId);
      setJobId(result.jobId);
      currentSessionRef.current = result.sessionId;
      currentJobRef.current = result.jobId;
      setStatus(result.status as TaskStatus);

      // 激活订阅
      setActiveSubscription({
        sessionId: result.sessionId,
        jobId: result.jobId
      });

    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Failed to start query:', error);
      setError(error?.message ?? '启动任务失败');
      setIsLoading(false);
      setStatus('error');
    }
  }, [workspaceId, sessionId, isLoading, startQueryMutation]);

  // 取消查询
  const cancelQuery = useCallback(async () => {
    if (!sessionId || !currentJobRef.current) return;

    try {
      await cancelQueryMutation.mutateAsync({ sessionId });
      setIsLoading(false);
      setStatus('idle');
      setProgress(0);
      setError(null);

      // 停用订阅
      setActiveSubscription(null);
      currentJobRef.current = null;
      setJobId(null);

    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Failed to cancel query:', error);
      setError(error?.message ?? '取消任务失败');
    }
  }, [sessionId, cancelQueryMutation]);

  // 重置状态
  const reset = useCallback(() => {
    // 停用订阅
    setActiveSubscription(null);

    setMessages([]);
    setIsLoading(false);
    setStatus('idle');
    setProgress(0);
    setError(null);
    setJobId(null);
    currentJobRef.current = null;
  }, []);

  // 清理副作用
  useEffect(() => {
    return () => {
      // 组件卸载时停用订阅
      setActiveSubscription(null);
    };
  }, []);

  return {
    messages,
    isLoading,
    status,
    progress,
    error,
    sessionId,
    jobId,
    sendQuery,
    cancelQuery,
    reset,
  };
}