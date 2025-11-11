"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ChatInput } from "~/components/chat/ChatInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Bot,
  Loader2,
  MessageSquarePlus,
  History,
  Trash2,
  ArrowDown,
} from "lucide-react";
import { api } from "~/trpc/react";
import { MessageBubble } from "~/components/features/chat/MessageBubble";
import { SystemInfo } from "~/components/chat/SystemInfo";
import { useBackgroundQuery } from "~/hooks/use-background-query";
import { useSession } from "next-auth/react";
import type {
  SDKMessage,
  SDKSystemMessage,
} from "@anthropic-ai/claude-agent-sdk";

interface Session {
  id: string; // 数据库主键
  sessionId: string | null; // Claude 的 sessionId
  title: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  progress: number;
  isActive: boolean;
  attemptsMade: number;
  attemptsRemaining: number;
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
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // 从URL读取id（数据库主键）
  const currentId = searchParams?.get("id");

  const isInitialLoadRef = useRef(!currentId); // 跟踪是否是首次加载，只有当没有sessionId时才设置为true

  // 获取 sessions 列表
  const { data: sessionsData, refetch: refetchSessions } =
    api.agent.getSessions.useQuery(
      { workspaceId: id ?? "" },
      { enabled: !!id },
    );

  // 使用新的 hook
  // id 是 workspaceId，currentId 是要加载的会话 ID（数据库主键）
  const { messages, isLoading, status, error, sendQuery, cancelQuery, reset } =
    useBackgroundQuery(id ?? "", currentId, () => {
      // 当消息完成时，刷新 session 列表
      void refetchSessions();
    });

  // 滚动相关 refs - 必须在 messages 声明之后
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 删除 session
  const deleteSessionMutation = api.agent.deleteSession.useMutation({
    onSuccess: () => {
      void refetchSessions();
      // 如果删除的是当前会话，移除URL中的id
      if (currentId) {
        const newParams = new URLSearchParams(searchParams?.toString() || "");
        newParams.delete("id");
        const newUrl = `${pathname}?${newParams.toString()}`;
        router.push(newUrl);
        reset();
      }
    },
  });

  // 切换到指定会话 - 修改URL（使用数据库主键）
  const handleSelectSession = useCallback(
    (selectedId: string) => {
      const newParams = new URLSearchParams(searchParams?.toString() || "");
      newParams.set("id", selectedId);
      const newUrl = `${pathname}?${newParams.toString()}`;
      router.push(newUrl);
      reset();
      setConfirmingDelete(null);
    },
    [searchParams, pathname, router, reset],
  );

  // 更新 sessions 列表
  useEffect(() => {
    if (sessionsData) {
      const formattedSessions = sessionsData.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      }));
      setSessions(formattedSessions);

      // 只在首次加载且没有指定session ID时自动选择最近的session
      if (
        isInitialLoadRef.current &&
        !currentId &&
        formattedSessions.length > 0
      ) {
        const latestSession = formattedSessions[0]; // sessionsData已经按updatedAt降序排列
        if (latestSession) {
          handleSelectSession(latestSession.id);
        }
        isInitialLoadRef.current = false; // 标记为非首次加载
      }
    }
  }, [sessionsData, currentId, handleSelectSession]);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 监听滚动事件，显示/隐藏滚动按钮
  useEffect(() => {
    const checkScroll = () => {
      // 查找可滚动的子元素
      const findScrollableElement = (container: HTMLElement) => {
        const elements = container.querySelectorAll("*");
        for (const el of elements) {
          const element = el as HTMLElement;
          if (element.scrollHeight > element.clientHeight) {
            return element;
          }
        }
        return null;
      };

      const scrollArea = scrollAreaRef.current;
      if (!scrollArea) return;

      const viewport = findScrollableElement(scrollArea);

      if (viewport) {
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 50);
      }
    };

    // 全局滚动监听
    const handleScroll = () => checkScroll();
    document.addEventListener("scroll", handleScroll, { passive: true });

    // 定时检查
    const interval = setInterval(checkScroll, 200);
    checkScroll(); // 初始检查

    return () => {
      document.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, []);

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !id) return;

    const query = inputMessage.trim();
    setInputMessage("");
    try {
      await sendQuery(query);
    } catch (error) {
      console.error("Failed to send query:", error);
      // 可以在这里显示错误提示
    }
  };

  // 开始新对话
  const handleNewConversation = () => {
    // 移除URL中的id
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    newParams.delete("id");
    const newUrl = `${pathname}?${newParams.toString()}`;
    router.push(newUrl);
    reset();
    setConfirmingDelete(null);
  };

  // 删除会话
  const handleDeleteSession = async (
    selectedId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    if (confirmingDelete === selectedId) {
      // 第二次点击，执行删除
      await deleteSessionMutation.mutateAsync({ id: selectedId });
      setConfirmingDelete(null);
    } else {
      // 第一次点击，显示确认状态
      setConfirmingDelete(selectedId);
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

  // 查找系统初始化消息
  const getSystemMessage = (): SDKSystemMessage | null => {
    return (
      messages.find(
        (msg): msg is SDKSystemMessage =>
          msg.type === "system" && msg.subtype === "init",
      ) ?? null
    );
  };

  const systemMessage = getSystemMessage();

  if (!session?.user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>Please log in to use the AI assistant</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-l">
      {/* 对话框头部 */}
      <div className="border-b p-4">
        <div className="flex h-8 items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="text-primary h-5 w-5" />
            <h3 className="font-semibold">工作区助手</h3>
          </div>

          <div className="flex gap-1">
            {systemMessage && <SystemInfo systemMessage={systemMessage} />}

            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) {
                  setConfirmingDelete(null);
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <History className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[90vw] max-w-80">
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
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`group flex cursor-pointer items-center justify-between ${
                          currentId === session.id ? "bg-accent" : ""
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
                          className={`h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100 ${
                            confirmingDelete === session.id
                              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse"
                              : "hover:bg-destructive/10 hover:text-destructive"
                          }`}
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          disabled={deleteSessionMutation.isPending}
                          title={
                            confirmingDelete === session.id
                              ? "再次点击确认删除"
                              : "删除对话"
                          }
                        >
                          {deleteSessionMutation.isPending &&
                          confirmingDelete === session.id ? (
                            <Loader2 className="h-3 w-3" />
                          ) : confirmingDelete === session.id ? (
                            <div className="flex items-center justify-center">
                              <span className="text-[10px] font-bold">✓</span>
                            </div>
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
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
          {/* 会话管理下拉菜单 */}
        </div>
      </div>

      {/* 消息列表 */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="flex flex-col space-y-4 p-4">
          <div className="flex flex-col p-4">
            {messages.length > 0
              ? messages.map((message: SDKMessage, index) => (
                  <MessageBubble key={`message-${index}`} message={message} />
                ))
              : null}
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-sm">
                {status === "running" && "正在执行..."}
                {status === "failed" && "执行失败"}
              </span>
              {status === "running" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelQuery}
                  className="ml-2"
                >
                  取消
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border-destructive/20 flex items-center gap-2 rounded-md border p-4">
              <span className="text-destructive text-sm">{error}</span>
            </div>
          )}

          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>

        {/* 滚动到底部按钮 */}
        {showScrollButton && (
          <Button
            onClick={() => scrollToBottom()}
            size="icon"
            className="absolute right-4 bottom-4 h-10 w-10 cursor-pointer rounded-full shadow-md transition-shadow hover:shadow-lg"
            variant="secondary"
          >
            <ArrowDown className="h-6 w-6" />
          </Button>
        )}
      </ScrollArea>

      {/* 输入框 */}
      <div className="border-t p-4">
        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={handleSendMessage}
          disabled={isLoading || status === "running"}
          isLoading={isLoading || status === "running"}
          workspaceId={id}
          placeholder="输入 @ 来引用文件..."
        />
      </div>
    </div>
  );
}
