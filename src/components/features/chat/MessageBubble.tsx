"use client";

import { MarkdownPreview } from "~/components/shared/MarkdownPreview";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { ToolCall } from "./ToolCall";

export function MessageRenderer({ message }: { message: SDKMessage }) {
  // 渲染消息内容的辅助函数
  const renderMessageContent = () => {
    if (
      message.type === "user" &&
      typeof message.message.content === "string"
    ) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MarkdownPreview content={message.message.content} />
        </div>
      );
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
  return (
    <div className={` ${isUser ? "self-end" : "self-start"}`}>
      <div
        className={`rounded-lg ${
          isUser ? "bg-primary text-primary-foreground p-3" : "px-3 py-2"
        }`}
      >
        <div className="max-w-full">
          <MessageRenderer message={message} />
        </div>
      </div>
    </div>
  );
}
