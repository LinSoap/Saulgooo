"use client";

import { MarkdownPreview } from "~/components/shared/MarkdownPreview";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { ToolCall } from "./ToolCall";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { ToolCard } from "~/components/ui/tool-card";

export function MessageRenderer({ message }: { message: SDKMessage }) {
  const [isToolResultExpanded, setIsToolResultExpanded] = useState(true);

  // 渲染消息内容的辅助函数
  const renderMessageContent = () => {
    if (message.type === "user") {
      if (typeof message.message.content === "string") {
        return (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownPreview content={message.message.content} />
          </div>
        );
      } else if (Array.isArray(message.message.content)) {
        const contentArray = message.message.content;
        const toolResults = contentArray.filter(
          (item) => item.type === "tool_result",
        );

        return (
          <div className="my-3 max-w-full">
            <button
              onClick={() => setIsToolResultExpanded(!isToolResultExpanded)}
              className="group flex w-full items-center justify-start font-mono text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                <span className="text-start font-medium">
                  工具结果 ({toolResults.length})
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {isToolResultExpanded ? (
                  <ChevronDown className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
                ) : (
                  <ChevronLeft className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
                )}
              </div>
            </button>
            {isToolResultExpanded && (
              <ToolCard
                title="🔧 工具结果"
                content={JSON.stringify(
                  toolResults.map((item) => item.content),
                  null,
                  2,
                )}
              />
            )}
          </div>
        );
      }
    }
    if (
      message.type === "assistant" &&
      Array.isArray(message.message.content)
    ) {
      const contentArray = message.message.content;
      const elements: React.ReactNode[] = [];
      let lastItemWasTool = false;

      contentArray.forEach((item, index) => {
        // 确保 item 有正确的类型

        if (item.type === "text") {
          // 如果上一个项目是工具调用，添加分隔线
          if (lastItemWasTool && elements.length > 0) {
            elements.push(
              <div
                key={`sep-${index}`}
                className="my-4 border-t border-gray-200"
              ></div>,
            );
          }
          elements.push(
            <div key={index} className="prose prose-sm">
              <MarkdownPreview content={item.text ?? ""} />
            </div>,
          );
          lastItemWasTool = false;
        } else if (item.type === "tool_use") {
          elements.push(<ToolCall key={index} tool={item} />);
          lastItemWasTool = true;
        }
      });

      return <>{elements}</>;
    }

    return null;
  };

  return <div>{renderMessageContent()}</div>;
}

export function MessageBubble({ message }: { message: SDKMessage }) {
  const isUser = message.type === "user";
  const isToolResult =
    isUser &&
    Array.isArray(message.message.content) &&
    message.message.content.some((item) => item.type === "tool_result");
  const alignRight = isUser && !isToolResult;
  return (
    <div className={` ${alignRight ? "self-end" : "self-start"}`}>
      <div
        className={`rounded-lg ${
          alignRight ? "bg-primary text-primary-foreground p-3" : "px-3 py-2"
        }`}
      >
        <div className="max-w-full">
          <MessageRenderer message={message} />
        </div>
      </div>
    </div>
  );
}
