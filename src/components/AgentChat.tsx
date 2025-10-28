"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Bot, User, Send, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { MarkdownPreview } from "~/components/MarkdownPreview";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentChatProps {
  workspaceId?: string;
}

export function AgentChat({ workspaceId }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  const agentQuery = api.agent.query.useMutation({
    onSuccess: (data) => {
      // 直接添加AI回复
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.content,
      }]);
    },
    onError: (error) => {
      // 添加错误消息
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "抱歉，处理您的请求时出现了错误。请稍后再试。",
      }]);
    },
  });

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || agentQuery.isPending) return;

    // 添加用户消息
    const userMessage = inputMessage;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInputMessage("");

    // 调用 tRPC query
    await agentQuery.mutate({
      query: userMessage,
      workspaceId,
    });
  };

  return (
    <div className="flex h-full flex-col border-l">
      {/* 对话框头部 */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Bot className="text-primary h-5 w-5" />
          <h3 className="font-semibold">工作区助手</h3>
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
                  className={`max-w-[80%] rounded-lg p-3 overflow-auto ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownPreview
                      content={message.content}
                      className="prose-sm max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1"
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
          <p className="text-muted-foreground mt-2 text-sm">
            AI 正在思考中...
          </p>
        )}
      </div>
    </div>
  );
}
