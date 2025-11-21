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

  // 监听来自 Guide 组件的插入提示词事件
  useEffect(() => {
    const handleInsertPrompt = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string }>;
      if (customEvent.detail?.prompt) {
        setInputMessage(customEvent.detail.prompt);
      }
    };

    window.addEventListener("saulgooo:insert-prompt", handleInsertPrompt);
    return () => {
      window.removeEventListener("saulgooo:insert-prompt", handleInsertPrompt);
    };
  }, []);

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
  const {
    messages,
    isLoading,
    status,
    error,
    sendQuery,
    cancelQuery,
    reset,
    isCancelling,
  } = useBackgroundQuery(id ?? "", currentId, () => {
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
    <div className="flex h-full flex-col border-l border-gray-100 bg-[#f9f9f9]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white shadow-md">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">AI助手</h2>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {systemMessage && <SystemInfo systemMessage={systemMessage} />}

          <DropdownMenu
            onOpenChange={(open) => {
              if (!open) {
                setConfirmingDelete(null);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-black"
              >
                <History className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[90vw] max-w-80 rounded-2xl border-gray-100 p-2 shadow-xl"
            >
              <DropdownMenuItem
                onClick={handleNewConversation}
                className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-gray-50"
              >
                <MessageSquarePlus className="mr-2 h-4 w-4 text-indigo-600" />
                <span className="font-medium">发起新对话</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-gray-100" />

              {sessions.length > 0 ? (
                <>
                  <div className="text-muted-foreground px-3 py-2 text-xs font-bold tracking-wider uppercase opacity-50">
                    历史对话
                  </div>
                  {sessions.slice(0, 20).map((session) => (
                    <DropdownMenuItem
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
                        currentId === session.id
                          ? "bg-gray-100"
                          : "focus:bg-gray-50"
                      }`}
                    >
                      <div className="mr-2 flex min-w-0 flex-1 flex-col items-start gap-0.5">
                        <span
                          className="max-w-60 truncate text-sm font-medium text-gray-700"
                          title={session.title}
                        >
                          {session.title}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {formatDate(session.updatedAt)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 w-6 p-0 opacity-0 transition-all group-hover:opacity-100 ${
                          confirmingDelete === session.id
                            ? "animate-pulse bg-red-50 text-red-600 hover:bg-red-100"
                            : "hover:bg-gray-200 hover:text-red-500"
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
                          <Loader2 className="h-3 w-3 animate-spin" />
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
      </div>

      {/* 消息列表 */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="flex flex-col px-8 py-2">
          <div className="flex flex-col space-y-2">
            {messages.length > 0
              ? messages.map((message: SDKMessage, index) => (
                  <MessageBubble key={`message-${index}`} message={message} />
                ))
              : null}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-8">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-black" />
              </div>
              <span className="animate-pulse text-sm font-medium text-gray-400">
                {status === "running" && "正在思考..."}
                {status === "failed" && "执行失败"}
              </span>
              {status === "running" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelQuery}
                  disabled={isCancelling}
                  className="ml-2 h-7 rounded-full px-3 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  {isCancelling ? "取消中..." : "停止生成"}
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-600">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
                <span className="font-bold">!</span>
              </div>
              <span>{error}</span>
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
            className="absolute right-6 bottom-6 h-10 w-10 cursor-pointer rounded-full border border-gray-100 bg-white text-gray-600 shadow-xl transition-all hover:scale-105 hover:bg-gray-50"
            variant="ghost"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
      </ScrollArea>

      {/* 输入框 */}
      <div className="border-t border-gray-100 bg-white/80 p-5 backdrop-blur-sm">
        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={handleSendMessage}
          disabled={isLoading || status === "running"}
          isLoading={isLoading || status === "running"}
          workspaceId={id}
          placeholder="输入 @ 来引用文件，输入 / 来选择命令..."
          slashCommands={systemMessage?.slash_commands ?? []}
          className="shadow-sm"
        />
      </div>
    </div>
  );
}
