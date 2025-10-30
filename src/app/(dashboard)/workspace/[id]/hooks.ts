import { skipToken } from '@tanstack/react-query';
import { api } from '~/trpc/react';
import * as React from 'react';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';



export function useWorkspaceHooks() {

}

export function useAgentQuery(workspaceId: string, sessionId?: string | null) {
    const [messages, setMessages] = React.useState<SDKMessage[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [currentQuery, setCurrentQuery] = React.useState<string | null>(null);
    const [onCompleteCallback, setOnCompleteCallback] = React.useState<(() => void) | undefined>();


    const utils = api.useUtils();

    // 获取 session 数据（如果有 sessionId）
    const { data: sessionData, isLoading: isSessionLoading } = api.agent.getSession.useQuery(
        sessionId ? { sessionId } : skipToken,
        {
            enabled: !!sessionId,
        }
    );

    // 当 session 数据加载时，设置 messages
    React.useEffect(() => {
        if (sessionData?.messages) {
            setMessages(sessionData.messages as SDKMessage[]);
        }
    }, [sessionData]);



    // 发送查询的函数
    const sendQuery = React.useCallback((query: string, onComplete?: () => void) => {

        setCurrentQuery(query);
        setOnCompleteCallback(() => onComplete);
        setIsLoading(true);
    }, []);

    // Subscription - 只在有 currentQuery 时激活
    const subscription = api.agent.query.useSubscription(
        currentQuery ? {
            query: currentQuery,
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
                    setCurrentQuery(null);
                    onCompleteCallback?.();
                    setOnCompleteCallback(undefined);
                }
            },
            onError(err) {
                console.error('Agent query error:', err);
                setIsLoading(false);
                setCurrentQuery(null);
                setOnCompleteCallback(undefined);
            },
            onComplete() {
                console.log('Agent query complete');
                setIsLoading(false);
                setCurrentQuery(null);
                onCompleteCallback?.();
                setOnCompleteCallback(undefined);
            },
        }
    );

    // 重置状态
    const reset = React.useCallback(() => {
        setMessages([]);
        setIsLoading(false);
        setCurrentQuery(null);
        setOnCompleteCallback(undefined);
    }, []);

    return {
        messages,
        isLoading: isLoading || isSessionLoading,
        sendQuery,
        reset,
        subscription,
    };
}