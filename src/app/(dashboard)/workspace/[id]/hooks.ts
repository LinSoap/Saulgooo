import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { api } from '~/trpc/react';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { TaskStatus } from '~/server/api/routers/agent';

// Hook 返回类型 - 直接使用推断类型
interface UseBackgroundQueryReturn {
  messages: SDKMessage[];
  isLoading: boolean;
  status: TaskStatus;
  error: string | null;
  id: string | null;
  sessionId: string | null; // 保持向后兼容，但现在返回数据库 ID
  jobId: string | null;
  sendQuery: (query: string) => Promise<void>;
  cancelQuery: () => Promise<void>;
  reset: () => void;
}

export function useBackgroundQuery(
  workspaceId: string,
  initialId?: string | null,
  onMessageCompleted?: () => void  // 新增回调函数
): UseBackgroundQueryReturn {
  const route = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 本地状态
  const [messages, setMessages] = useState<SDKMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<TaskStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(initialId ?? null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Refs 用于跟踪当前任务
  const currentIdRef = useRef<string | null>(initialId ?? null);
  const currentJobRef = useRef<string | null>(null);

  // API hooks
  const startQueryMutation = api.agent.startQuery.useMutation();
  const cancelQueryMutation = api.agent.cancelQuery.useMutation();

  // 更新URL中的id参数
  const updateIdInUrl = useCallback((newId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', newId);
    route.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, route]);

  // 监听 id 变化
  useEffect(() => {
    if (initialId !== currentIdRef.current) {
      setId(initialId ?? null);
      currentIdRef.current = initialId ?? null;
      currentJobRef.current = null;
      setJobId(null);
      setStatus('idle');
      setError(null);
      setMessages([]);
    }
  }, [initialId]);

  // 动态订阅 - watchQuery 作为唯一的数据源
  api.agent.watchQuery.useSubscription(
    { id: id ?? '' },
    {
      enabled: !!id, // 只要有 id 就启用订阅
      onData: (data) => {
        console.log('📡 Received subscription data:', data);

        // 处理消息更新 - 无论是否有 sessionId 都要更新消息
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }


        // 处理状态更新 - 直接从 data 中获取
        if (data.status) {
          setStatus(data.status);

          // 根据状态更新 loading 和 error
          if (data.status === 'running') {
            setIsLoading(true);
            setError(null);
          } else if (data.status === 'completed') {
            setIsLoading(false);
            setError(null);
            // 当消息完成时，刷新 session 列表
            if (onMessageCompleted) {
              onMessageCompleted();
            }
          } else if (data.status === 'failed') {
            setIsLoading(false);
            setError(data.error ?? '任务执行失败');
          }
        }

        // 原有的状态处理逻辑保持不变（兼容旧逻辑）
        if (data.status === 'running') {
          setIsLoading(true);
          setError(null);
        } else if (!data.status || data.status === 'idle') {
          setIsLoading(false);
        }
      },
      onError: (err) => {
        // tRPC 自动推断错误类型
        console.error('Subscription error:', err);
        const errorMessage = err instanceof Error ? err.message : '订阅连接错误';
        setError(errorMessage);
        setIsLoading(false);
        setStatus('failed');
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
      setStatus('running');

      // 启动任务 - 传入数据库 session ID
      const result = await startQueryMutation.mutateAsync({
        query,
        workspaceId,
        id: id ?? undefined, // 发送数据库 session ID
      });

      if (!result.id || !result.jobId) {
        throw new Error('Invalid response from server');
      }


      // 更新状态 - 返回的 id 是数据库 session ID
      setId(result.id);
      setJobId(result.jobId);
      currentIdRef.current = result.id;
      currentJobRef.current = result.jobId;
      setStatus(result.status);

      // 如果URL中的id与返回的id不同，更新URL
      const currentUrlId = searchParams.get('id');

      if (currentUrlId !== result.id) {
        updateIdInUrl(result.id);
      }

    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Failed to start query:', error);
      setError(error?.message ?? '启动任务失败');
      setIsLoading(false);
      setStatus('failed');
    }
  }, [workspaceId, isLoading, startQueryMutation, id, searchParams, updateIdInUrl]);

  // 取消查询
  const cancelQuery = useCallback(async () => {
    if (!id || !currentJobRef.current) return;

    try {
      await cancelQueryMutation.mutateAsync({ id });
      setIsLoading(false);
      setStatus('idle');
      setError(null);

      currentJobRef.current = null;
      setJobId(null);

    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Failed to cancel query:', error);
      setError(error?.message ?? '取消任务失败');
    }
  }, [id, cancelQueryMutation]);

  // 重置状态
  const reset = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setStatus('idle');
    setError(null);
    setJobId(null);
    currentIdRef.current = null;
    setId(null);
  }, []);

  return {
    messages,
    isLoading,
    status,
    error,
    id, // 数据库主键
    sessionId: id, // 向后兼容，返回数据库 ID
    jobId,
    sendQuery,
    cancelQuery,
    reset,
  };
}