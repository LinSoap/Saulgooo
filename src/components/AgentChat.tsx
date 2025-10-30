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
} from "lucide-react";
import { api } from "~/trpc/react";
import { MessageBubble } from "~/components/MessageRenderer";
import { useAgentQuery } from "~/app/(dashboard)/workspace/[id]/hooks";

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
  const [inputMessage, setInputMessage] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // 使用新的 hook
  const { messages, isLoading, sendQuery, reset } = useAgentQuery(
    workspaceId ?? "",
    currentSessionId,
  );

  // 获取 sessions 列表
  const { data: sessionsData, refetch: refetchSessions } =
    api.agent.getSessions.useQuery(
      { workspaceId: workspaceId ?? "" },
      { enabled: !!workspaceId },
    );

  // 删除 session
  const deleteSessionMutation = api.agent.deleteSession.useMutation({
    onSuccess: () => {
      void refetchSessions();
      if (currentSessionId) {
        // 如果删除的是当前会话，重置到新对话状态
        setCurrentSessionId(null);
        reset();
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
  }, [sessionsData, sessions.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !workspaceId) return;

    const query = inputMessage.trim();
    setInputMessage("");
    sendQuery(query, onAgentComplete);
  };

  // 开始新对话
  const handleNewConversation = () => {
    setCurrentSessionId(null);
    reset();
  };

  // 切换到指定会话
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    reset();
  };

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
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
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
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            size="icon"
            variant="default"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
