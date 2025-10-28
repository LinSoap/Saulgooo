"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Bot,
  User,
  Send,
  Loader2,
  MessageSquarePlus,
  History,
  Trash2,
} from "lucide-react";
import { api } from "~/trpc/react";
import { MessageRenderer } from "~/components/MessageRenderer";
import type { ContentBlock } from "@anthropic-ai/sdk/resources/messages";

interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
  timestamp?: string;
}

interface Session {
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentChatProps {
  workspaceId?: string;
  onAgentComplete?: () => Promise<void>;
}

export function AgentChat({ workspaceId, onAgentComplete }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false); // 是否正在发送消息
  const [processedMessageHashes, setProcessedMessageHashes] = useState<
    Set<string>
  >(new Set()); // 用于去重

  // 获取 sessions 列表
  const { data: sessionsData, refetch: refetchSessions } =
    api.agent.getSessions.useQuery(
      { workspaceId: workspaceId ?? "" },
      { enabled: !!workspaceId },
    );

  // 获取特定 session
  const { data: sessionData, isLoading: isLoadingSession } =
    api.agent.getSession.useQuery(
      { sessionId: currentSessionId ?? "" },
      {
        enabled: !!currentSessionId && !isSending, // 发送消息时不查询
        retry: false,
      },
    );

  // 删除 session
  const deleteSessionMutation = api.agent.deleteSession.useMutation({
    onSuccess: () => {
      void refetchSessions();
      if (currentSessionId) {
        // 如果删除的是当前会话，重置到新对话状态
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
  });

  // 更新 sessions 列表
  useEffect(() => {
    if (sessionsData) {
      setSessions(
        sessionsData.map((session) => ({
          ...session,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
        })),
      );
    }
  }, [sessionsData]);

  // 处理流式消息的函数
  const handleStreamQuery = async (query: string, workspaceId: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setIsSending(true); // 标记正在发送消息

    // 重置已处理的消息哈希集合
    setProcessedMessageHashes(new Set());

    // 添加用户消息和助手消息容器（使用一次更新）
    setMessages((prev) => [
      ...prev,
      { role: "user", content: query },
      {
        role: "assistant",
        content: [], // 初始为空数组，用于收集流式内容
      },
    ]);

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          workspaceId,
          sessionId: currentSessionId ?? undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start stream");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let sessionId: string | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case "session_id":
                    sessionId = data.sessionId;
                    // 如果是新会话，更新当前会话ID
                    if (sessionId && !currentSessionId) {
                      setCurrentSessionId(sessionId);
                    }
                    break;

                  case "message":
                    // 检查是否有 messageId
                    if (data.messageId) {
                      // 检查是否已处理过此消息 ID
                      if (processedMessageHashes.has(data.messageId)) {
                        console.log("跳过重复消息:", data.messageId);
                        break;
                      }

                      // 标记为已处理
                      setProcessedMessageHashes((prev) =>
                        new Set(prev).add(data.messageId),
                      );
                    }

                    // 更新最后一条助手消息
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];

                      if (lastMessage?.role === "assistant") {
                        const content = data.content;

                        if (Array.isArray(lastMessage.content)) {
                          lastMessage.content.push(content);
                        } else {
                          lastMessage.content = [content];
                        }
                      }

                      return newMessages;
                    });
                    break;

                  case "error":
                    throw new Error(data.error);
                }
              } catch (parseError) {
                console.error("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      }

      // 刷新 sessions 列表
      setTimeout(() => {
        void refetchSessions();
      }, 500);

      // Agent操作完成后，调用刷新回调
      if (onAgentComplete) {
        try {
          await onAgentComplete();
        } catch (error) {
          console.error("Failed to refresh after agent completion:", error);
        }
      }
    } catch (error) {
      console.error("Stream error:", error);

      // 添加错误消息
      setMessages((prev) => [
        ...prev.slice(0, -1), // 移除空的助手消息
        {
          role: "assistant",
          content: "抱歉，处理您的请求时出现了错误。请稍后再试。",
        },
      ]);

      // 即使出错也尝试刷新
      if (onAgentComplete) {
        try {
          await onAgentComplete();
        } catch (refreshError) {
          console.error("Failed to refresh after agent error:", refreshError);
        }
      }
    } finally {
      setIsLoading(false);
      setIsSending(false); // 重置发送状态
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !workspaceId) return;

    const userMessage = inputMessage;
    setInputMessage("");

    // 调用流式查询
    await handleStreamQuery(userMessage, workspaceId);
  };

  // 开始新对话
  const handleNewConversation = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  // 切换到指定会话
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]); // 先清空，避免旧消息显示
  };

  // 加载历史消息
  useEffect(() => {
    if (sessionData?.messages && sessionData.sessionId === currentSessionId) {
      // 将 JsonValue 类型转换为 Message 数组
      const messagesData = sessionData.messages as unknown;
      if (Array.isArray(messagesData)) {
        const messages: Message[] = messagesData.filter(
          (msg): msg is Message => {
            if (!msg || typeof msg !== "object") return false;
            const messageObj = msg as Record<string, unknown>;
            return (
              "role" in messageObj &&
              "content" in messageObj &&
              (messageObj.role === "user" || messageObj.role === "assistant")
            );
          },
        );
        setMessages(messages);
      }
    }
  }, [sessionData, currentSessionId]);

  // 删除会话
  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (confirm("确定要删除这个对话吗？")) {
      void deleteSessionMutation.mutateAsync({ sessionId });
    }
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    if (!dateString) return "未知时间";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}天前`;
    } else if (diffHours > 0) {
      return `${diffHours}小时前`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes > 0 ? `${diffMinutes}分钟前` : "刚刚";
    }
  };

  return (
    <div className="flex h-full flex-col border-l">
      {/* 对话框头部 */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="text-primary h-5 w-5" />
            <h3 className="font-semibold">工作区助手</h3>
          </div>

          {/* 会话管理下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <History className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuItem
                onClick={handleNewConversation}
                className="cursor-pointer"
              >
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                发起新对话
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {sessions.length > 0 ? (
                <>
                  <div className="text-muted-foreground px-2 py-1.5 text-sm font-medium">
                    历史对话
                  </div>
                  {sessions.slice(0, 20).map((session) => (
                    <DropdownMenuItem
                      key={session.sessionId}
                      onClick={() => handleSelectSession(session.sessionId)}
                      className={`group flex cursor-pointer items-center justify-between ${
                        currentSessionId === session.sessionId
                          ? "bg-accent"
                          : ""
                      }`}
                    >
                      <div className="mr-2 flex min-w-0 flex-1 flex-col items-start">
                        <span
                          className="max-w-[260px] truncate text-sm font-medium"
                          title={session.title}
                        >
                          {session.title}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatDate(session.updatedAt)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) =>
                          handleDeleteSession(session.sessionId, e)
                        }
                      >
                        <Trash2 className="text-destructive h-3 w-3" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                  {sessions.length > 20 && (
                    <div className="text-muted-foreground border-t px-2 py-1.5 text-center text-xs">
                      还有 {sessions.length - 20} 个历史对话...
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                  暂无历史对话
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          与 AI 助手对话，获取帮助和建议
        </p>
      </div>

      {/* 对话框内容区域 */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Bot className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">开始对话</h3>
              <p className="text-muted-foreground text-sm">
                向 AI 助手询问关于工作区的任何问题
              </p>
            </div>
          </div>
        ) : isLoadingSession ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
              <span className="text-muted-foreground">加载历史对话中...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`relative max-w-[85%] rounded-lg p-3 wrap-break-word ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "mr-auto"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MessageRenderer message={message} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {typeof message.content === "string"
                        ? message.content
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 对话框输入区域 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="输入您的问题..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {isLoading && (
          <p className="text-muted-foreground mt-2 text-sm">AI 正在思考中...</p>
        )}
      </div>
    </div>
  );
}
