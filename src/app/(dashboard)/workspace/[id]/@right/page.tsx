"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { useSession } from "next-auth/react";

interface Session {
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AgentChatPage({ params }: AgentChatPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [inputMessage, setInputMessage] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);

  // 获取 tRPC utils 用于手动获取数据
  const utils = api.useUtils();

  // 从URL读取sessionId
  const currentSessionId = searchParams?.get("sessionId");

  // 使用新的 hook
  const { messages, isLoading, sendQuery, reset } = useAgentQuery(
    id ?? "",
    currentSessionId,
  );

  // 滚动相关 refs - 必须在 messages 声明之后
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取 sessions 列表
  const { data: sessionsData, refetch: refetchSessions } =
    api.agent.getSessions.useQuery(
      { workspaceId: id ?? "" },
      { enabled: !!id },
    );

  // 删除 session
  const deleteSessionMutation = api.agent.deleteSession.useMutation({
    onSuccess: () => {
      void refetchSessions();
      // 如果删除的是当前会话，移除URL中的sessionId
      if (currentSessionId) {
        const newParams = new URLSearchParams(searchParams?.toString() || "");
        newParams.delete("sessionId");
        const newUrl = `${pathname}?${newParams.toString()}`;
        router.push(newUrl);
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
    }
  }, [sessionsData]);

  // 滚动到底部
  const scrollToBottom = () => {
    // 稍微延迟一下，确保内容渲染完成
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !id) return;

    const query = inputMessage.trim();
    setInputMessage("");
    sendQuery(query, onAgentComplete);
  };

  // 开始新对话
  const handleNewConversation = () => {
    // 移除URL中的sessionId
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    newParams.delete("sessionId");
    const newUrl = `${pathname}?${newParams.toString()}`;
    router.push(newUrl);
    reset();
  };

  // 切换到指定会话 - 修改URL
  const handleSelectSession = (sessionId: string) => {
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    newParams.set("sessionId", sessionId);
    const newUrl = `${pathname}?${newParams.toString()}`;
    router.push(newUrl);
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

  // 智能刷新函数 - Agent操作完成后调用
  const onAgentComplete = async () => {
    const currentFilePath = searchParams?.get("file");

    try {
      // 1. 刷新文件树
      await utils.workspace.getFileTree.invalidate({ workspaceId: id });

      // 2. 如果有打开的文件，刷新文件内容
      if (currentFilePath) {
        await utils.workspace.getFileContent.invalidate({
          workspaceId: id,
          filePath: currentFilePath,
        });
      }
    } catch {
      // 刷新失败
    }
  };

  if (!session?.user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Please log in to use the AI assistant</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col border-l">
      {/* 对话框头部 */}
      <div className="border-b p-4">
        <div className="flex h-8 items-center justify-between">
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
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </DropdownMenuItem>
                  ))}
                </>
              ) : (
                <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                  暂无历史对话
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 消息列表 */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {messages.length > 0
            ? messages.map((message, index) => (
                <MessageBubble
                  key={`${message.type}-${index}`}
                  message={message}
                />
              ))
            : null}

          {isLoading && (
            <div className="flex items-center gap-2 p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-sm">
                正在思考中...
              </span>
            </div>
          )}

          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 输入框 */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="输入您的问题..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
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
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
