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
  Send,
  Loader2,
  MessageSquarePlus,
  History,
  Trash2,
  Square,
} from "lucide-react";
import { api } from "~/trpc/react";
import { MessageRenderer } from "~/components/MessageRenderer";
import type { ContentBlock } from "@anthropic-ai/sdk/resources/messages";

interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
  timestamp?: string;
}

interface StreamData {
  type: "session_id" | "message" | "error" | "request_id" | "done";
  sessionId?: string;
  content?: ContentBlock;
  error?: string;
  requestId?: string;
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
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  // 重置加载状态
  const resetLoadingState = () => {
    setIsLoading(false);
    setCurrentRequestId(null);
  };

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
        enabled: !!currentSessionId && !isLoading, // 发送消息时不查询
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
      const formattedSessions = sessionsData.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      }));
      setSessions(formattedSessions);

      // 只在sessions初始化时自动选择最新的会话
      if (
        sessions.length === 0 &&
        formattedSessions.length > 0 &&
        formattedSessions[0]
      ) {
        setCurrentSessionId(formattedSessions[0].sessionId);
      }
    }
  }, [sessionsData]);

  // 终止当前查询
  const handleStopQuery = async () => {
    if (currentRequestId) {
      try {
        await fetch("/api/agent/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "stop",
            requestId: currentRequestId,
          }),
        });
      } catch (error) {
        console.error("Failed to stop query:", error);
      }
    }

    // 无论是否有 requestId 或请求是否成功，都重置状态
    resetLoadingState();

    // 添加终止提示消息
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === "assistant") {
        const existingContent = Array.isArray(lastMessage.content)
          ? lastMessage.content
          : [{ type: "text", text: lastMessage.content }];

        return [
          ...prev.slice(0, -1),
          {
            ...lastMessage,
            content: [
              ...existingContent,
              {
                type: "text",
                text: "\n\n*[对话已被用户终止]*",
                citations: null,
              },
            ] as ContentBlock[],
          },
        ];
      }
      return prev;
    });
  };

  // 处理流式消息的函数
  const subscription = api.agent.query.useSubscription(
      { query: inputMessage, workspaceId: workspaceId ?? "", sessionId: currentSessionId ?? undefined },
      {
        onData(message) {
          // 处理接收到的消息
          console.log("Received message:", message);
        },
        onError(err) {
          console.error("Subscription error:", err);
          resetLoadingState();
        },
        onComplete() {
          console.log("Subscription complete");
          resetLoadingState();
          void onAgentComplete?.();
        },
      },
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !workspaceId) return;

    const query = inputMessage.trim();
    setInputMessage("");
    await handleStreamQuery(query, workspaceId);
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
      const messagesData = sessionData.messages as unknown as Message[];

      // 调试：详细输出从数据库读取的消息格式
      if (process.env.NODE_ENV === "development") {
        console.log("[DB Debug] Loading messages from database:");
        messagesData.forEach((msg, idx) => {
          console.log(`[DB Debug] Message ${idx}:`, {
            role: msg.role,
            contentType: Array.isArray(msg.content)
              ? "ContentBlock[]"
              : typeof msg.content,
            contentPreview: Array.isArray(msg.content)
              ? msg.content.map((c: unknown) => {
                  const contentBlock = c as Record<string, unknown>;
                  return {
                    type: contentBlock.type,
                    hasText: !!contentBlock.text,
                    hasName: !!contentBlock.name,
                    textPreview: contentBlock.text
                      ? (contentBlock.text as string).substring(0, 50) + "..."
                      : null,
                  };
                })
              : msg.content,
          });
        });
      }

      setMessages(Array.isArray(messagesData) ? messagesData : []);
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
          <div className="space-y-2">
            {(() => {
              return messages.map((message, index) => {
                return (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[85%] rounded-lg wrap-break-word ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto p-3"
                          : "mr-auto px-3 py-1"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <MessageRenderer message={message} />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">
                          {typeof message.content === "string"
                            ? message.content
                            : Array.isArray(message.content) &&
                                message.content.length > 0 &&
                                message.content[0]?.type === "text"
                              ? message.content[0].text
                              : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
            {/* AI正在回复的提示显示在回复内容底部 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="mr-auto max-w-[85%] rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="text-primary h-4 w-4 animate-spin" />
                    <p className="text-muted-foreground text-sm">
                      AI 正在思考中...
                    </p>
                  </div>
                </div>
              </div>
            )}
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
            onClick={isLoading ? handleStopQuery : handleSendMessage}
            disabled={!isLoading && !inputMessage.trim()}
            size="icon"
            variant={isLoading ? "destructive" : "default"}
          >
            {isLoading ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
