"use client";

import { MarkdownPreview } from "~/components/shared/MarkdownPreview";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { ToolCall } from "./ToolCall";
import { ToolCard } from "~/components/ui/tool-card";
import { ToolCallItem } from "~/components/ui/tool-call-item";

export function MessageRenderer({ message }: { message: SDKMessage }) {
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
        const elements: React.ReactNode[] = [];

        contentArray.forEach((msg, index) => {
          if (msg.type === "text") {
            elements.push(
              <div
                key={index}
                className="prose prose-sm dark:prose-invert max-w-none"
              >
                <MarkdownPreview content={msg.text ?? ""} />
              </div>,
            );
          }
          if (
            msg.type === "tool_result" &&
            msg.content &&
            typeof msg.content === "string"
          ) {
            elements.push(
              <ToolCallItem
                key={index}
                name="工具结果"
                params={``}
                content={<ToolCard title="🔧 工具结果" content={msg.content} />}
                isExpandable={true}
              />,
            );
          }
        });

        return <>{elements}</>;
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
                className="my-1 border-t border-gray-200"
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

  // Determine if it's a standard user message (text only or string content)
  const isStandardUserMessage = isUser && !isToolResult;

  return (
    <div
      className={`flex w-full ${isStandardUserMessage ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`text-sm leading-relaxed transition-all ${
          isStandardUserMessage
            ? "max-w-[85%] rounded-3xl rounded-br-sm bg-black px-5 py-3 text-white shadow-sm"
            : "w-full max-w-full px-0 py-1 text-gray-800"
        }`}
      >
        <div className="max-w-full">
          <MessageRenderer message={message} />
        </div>
      </div>
    </div>
  );
}
