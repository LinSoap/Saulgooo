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
        const toolResults = contentArray.filter(
          (item) => item.type === "tool_result",
        );

        // 过滤掉 content 为空的工具结果
        const validToolResults = toolResults.filter(
          (item) =>
            typeof item.content === "string" && item.content.trim() !== "",
        );

        // 如果没有有效的工具结果，则不渲染
        if (validToolResults.length === 0) {
          return null;
        }
        const content = validToolResults
          .map((item) => {
            if (typeof item.content === "string") {
              return item.content;
            }
            return JSON.stringify(item.content, null, 2);
          })
          .join("\n\n");

        return (
          <ToolCallItem
            name="工具结果"
            params={` (${validToolResults.length})`}
            content={<ToolCard title="🔧 工具结果" content={content} />}
            isExpandable={true}
          />
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
  const isText =
    isUser &&
    Array.isArray(message.message.content) &&
    message.message.content.every((item) => item.type === "text");
  const alignRight = isUser && !isToolResult && !isText;
  return (
    <div className={` ${alignRight ? "self-end" : "self-start"}`}>
      <div
        className={`rounded-lg ${
          alignRight ? "bg-primary text-primary-foreground p-3" : "px-3 py-2"
        }`}
      >
        <div className="max-w-full">
          {/* {JSON.stringify(message)} */}
          <MessageRenderer message={message} />
        </div>
      </div>
    </div>
  );
}
