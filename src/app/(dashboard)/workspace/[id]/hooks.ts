import { skipToken } from '@tanstack/react-query';
import { api } from '~/trpc/react';
import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';



export function useWorkspaceHooks() {

}

export function useAgentQuery(workspaceId: string, sessionId?: string | null) {
    const route = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [messages, setMessages] = React.useState<SDKMessage[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [currentQuery, setCurrentQuery] = React.useState<string | null>(null);
    const [loadingHistoryMessages, setLoadingHistoryMessages] = React.useState(false);
    const [onCompleteCallback, setOnCompleteCallback] = React.useState<(() => void) | undefined>();


    // 更新URL参数而不刷新页面
    const updateSessionIdInUrl = React.useCallback((newSessionId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sessionId', newSessionId);
        route.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [searchParams, pathname, route]);


    // 当sessionId变化时，触发subscription来加载历史消息
    React.useEffect(() => {
        if (sessionId) {
            setLoadingHistoryMessages(true);
            setMessages([]); // 清空当前消息
            // 直接设置query来触发subscription重新连接
            setCurrentQuery(`__LOAD_HISTORY_${sessionId}`);
        }
    }, [sessionId]);


    // 发送查询的函数
    const sendQuery = React.useCallback((query: string, onComplete?: () => void) => {
        setCurrentQuery(query);
        setOnCompleteCallback(() => onComplete);
        setIsLoading(true);
    }, []);

    // Subscription - 用于加载历史消息和发送新查询
    const subscription = api.agent.query.useSubscription(
        currentQuery ? {
            query: currentQuery.startsWith('__LOAD_HISTORY_') ? undefined : currentQuery,
            workspaceId,
            sessionId: sessionId ?? undefined
        } : skipToken,
        {
            onData(message) {
                // 处理不同类型的消息
                if (message.type === "user") {
                    if (message.message.role === "user" && typeof message.message.content === "string") {
                        setMessages((prev) => [...prev, message]);
                    }
                }
                if (message.type === "assistant") {
                    setMessages((prev) => [...prev, message]);
                } else if (message.type === "result") {
                    // 查询完成
                    setIsLoading(false);
                    setLoadingHistoryMessages(false);
                    setCurrentQuery(null);
                    onCompleteCallback?.();
                    setOnCompleteCallback(undefined);
                }
            },
            onError(err) {
                console.error('Agent query error:', err);
                setIsLoading(false);
                setLoadingHistoryMessages(false);
                setCurrentQuery(null);
                setOnCompleteCallback(undefined);
                // 如果URL中没有sessionId且有消息，说明是新会话，需要更新URL
                if (!searchParams.get('sessionId') && messages.length > 0) {
                    const sessionIdFromMessages = messages.find(msg => msg.session_id)?.session_id;
                    if (sessionIdFromMessages) {
                        updateSessionIdInUrl(sessionIdFromMessages);
                    }
                }
            },
            onComplete() {
                setIsLoading(false);
                setLoadingHistoryMessages(false);
                setCurrentQuery(null);
                onCompleteCallback?.();
                setOnCompleteCallback(undefined);
                // 如果URL中没有sessionId且有消息，说明是新会话，需要更新URL
                if (!searchParams.get('sessionId') && messages.length > 0) {
                    const sessionIdFromMessages = messages.find(msg => msg.session_id)?.session_id;
                    if (sessionIdFromMessages) {
                        updateSessionIdInUrl(sessionIdFromMessages);
                    }
                }
            },
        }
    );

    // 重置状态
    const reset = React.useCallback(() => {
        setMessages([]);
        setIsLoading(false);
        setLoadingHistoryMessages(false);
        setCurrentQuery(null);
        setOnCompleteCallback(undefined);
    }, []);

    return {
        messages,
        isLoading: isLoading || loadingHistoryMessages,
        sendQuery,
        reset,
        subscription,
    };
}