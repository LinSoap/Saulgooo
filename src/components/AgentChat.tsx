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
import { MarkdownPreview } from "~/components/MarkdownPreview";

interface Message {
  role: "user" | "assistant";
  content: string;
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

  // 获取 sessions 列表
  const { data: sessionsData, refetch: refetchSessions } =
    api.agent.getSessions.useQuery(
      { workspaceId: workspaceId || "" },
      { enabled: !!workspaceId },
    );

  // 获取特定 session
  const { data: sessionData } = api.agent.getSession.useQuery(
    { sessionId: currentSessionId || "" },
    { enabled: !!currentSessionId },
  );

  // 删除 session
  const deleteSessionMutation = api.agent.deleteSession.useMutation({
    onSuccess: () => {
      refetchSessions();
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

  // 加载 session 的消息
  useEffect(() => {
    if (sessionData && sessionData.messages) {
      // 将 JsonValue 类型转换为 Message 数组
      const messagesData = sessionData.messages as unknown;
      if (Array.isArray(messagesData)) {
        const messages: Message[] = messagesData.filter(
          (msg): msg is Message =>
            msg &&
            typeof msg === "object" &&
            "role" in msg &&
            "content" in msg &&
            (msg.role === "user" || msg.role === "assistant"),
        );
        setMessages(messages);
      }
    }
  }, [sessionData]);

  const agentQuery = api.agent.query.useMutation({
    onSuccess: async (data) => {
      // 直接添加AI回复
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.content,
        },
      ]);

      // 如果是新会话，更新当前会话ID
      if (data.sessionId && !currentSessionId) {
        setCurrentSessionId(data.sessionId);

        // 为新对话生成标题
        const userMessage = messages[messages.length - 1]?.content || "新对话";
        const title =
          userMessage.length > 20
            ? userMessage.substring(0, 20) + "..."
            : userMessage;

        // 这里可以调用API更新会话标题，暂时使用本地生成的标题
        setTimeout(() => {
          refetchSessions();
        }, 500);
      }

      // Agent操作完成后，调用刷新回调
      if (onAgentComplete) {
        try {
          await onAgentComplete();
        } catch (error) {
          console.error("Failed to refresh after agent completion:", error);
        }
      }

      // 刷新 sessions 列表
      refetchSessions();
    },
    onError: async (error) => {
      // 添加错误消息
      setMessages((prev) => [
        ...prev,
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
    },
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || agentQuery.isPending || !workspaceId) return;

    // 添加用户消息
    const userMessage = inputMessage;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInputMessage("");

    // 调用 tRPC query
    await agentQuery.mutate({
      query: userMessage,
      workspaceId,
      sessionId: currentSessionId || undefined,
    });
  };

  // 开始新对话
  const handleNewConversation = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  // 切换到指定会话
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  // 删除会话
  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (confirm("确定要删除这个对话吗？")) {
      await deleteSessionMutation.mutateAsync({ sessionId });
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
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <Bot className="text-primary h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] overflow-auto rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownPreview
                      content={message.content}
                      className="prose-sm max-w-none [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-2 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <User className="text-primary-foreground h-4 w-4" />
                  </div>
                )}
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
                handleSendMessage();
              }
            }}
            disabled={agentQuery.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || agentQuery.isPending}
            size="icon"
          >
            {agentQuery.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {agentQuery.isPending && (
          <p className="text-muted-foreground mt-2 text-sm">AI 正在思考中...</p>
        )}
      </div>
    </div>
  );
}
