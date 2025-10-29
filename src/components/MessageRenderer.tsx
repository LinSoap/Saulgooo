"use client";

import { ChevronDown, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { MarkdownPreview } from "./MarkdownPreview";
import type { ContentBlock } from "@anthropic-ai/sdk/resources/messages";

interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock | ContentBlock[];
  timestamp?: string;
}

type ContentItem = ContentBlock;

interface MessageRendererProps {
  message: Message;
}

// 简单的工具调用组件
function ToolCall({ tool }: { tool: ContentItem }) {
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开

  // 提取文件名
  const getFileName = (path: string): string => {
    if (!path) return "";
    const parts = path.split("/");
    return parts[parts.length - 1] ?? path;
  };

  // 格式化工具调用显示
  const formatToolDisplay = () => {
    // 检查是否是工具使用块
    if (tool.type === "tool_use") {
      const toolName = tool.name?.toLowerCase() ?? "";
      const input = tool.input as Record<string, string> | undefined;

      if (toolName === "write" && input?.file_path) {
        return {
          text: `Write(${getFileName(input.file_path)})`,
          hasContent: !!input.content,
          file: input.file_path,
          content: input.content ?? "",
        };
      } else if (toolName === "read" && input?.file_path) {
        return {
          text: `Read(${getFileName(input.file_path)})`,
          hasContent: false,
          file: input.file_path,
          content: "",
        };
      } else if (toolName === "glob" && input?.pattern) {
        return {
          text: `Glob(${input.pattern})`,
          hasContent: false,
          file: "",
          content: "",
        };
      } else if (toolName === "bash" && input?.command) {
        return {
          text: `Bash(${input.command})`,
          hasContent: false,
          file: "",
          content: "",
        };
      } else {
        // 其他工具显示名称
        return {
          text: tool.name ?? "Unknown Tool",
          hasContent: false,
          file: "",
          content: "",
        };
      }
    }

    // 其他类型的内容块
    return {
      text: tool.type || "Unknown Content",
      hasContent: false,
      file: "",
      content: "",
    };
  };

  const display = formatToolDisplay();

  // 只为 Write 工具且有内容时显示可展开
  if (
    tool.type === "tool_use" &&
    tool.name?.toLowerCase() === "write" &&
    display.hasContent
  ) {
    return (
      <div className="my-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex w-full items-center justify-between font-mono text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
            <span className="font-medium">{display.text}</span>
          </div>
          <div className="flex items-center gap-1">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
            ) : (
              <ChevronLeft className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
            )}
          </div>
        </button>
        {isExpanded && (
          <div className="mt-3 rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
            <div className="mb-3 border-b pb-2 font-mono text-xs text-gray-500 dark:text-gray-400">
              📄 {display.file}
            </div>
            <div className="max-h-96 overflow-y-auto">
              <pre className="font-mono text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {display.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 其他工具只显示简单文本
  return (
    <div className="my-2 flex items-center gap-2 font-mono text-sm text-gray-500 dark:text-gray-400">
      <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
      <span>{display.text}</span>
    </div>
  );
}

export function MessageRenderer({ message }: MessageRendererProps) {
  // 渲染消息内容的辅助函数
  const renderMessageContent = () => {
    // 如果是普通字符串消息
    if (typeof message.content === "string") {
      return (
        <div className="prose prose-sm max-w-none">
          <MarkdownPreview content={message.content} />
        </div>
      );
    }

    // 如果是数组格式的消息（如 tool_use 和 text 组合）
    if (Array.isArray(message.content)) {
      const elements: React.ReactNode[] = [];
      let lastItemWasTool = false;

      message.content.forEach((item, index) => {
        if (item.type === "text") {
          // 如果上一个项目是工具调用，添加分隔线
          if (lastItemWasTool && elements.length > 0) {
            elements.push(
              <div
                key={`sep-${index}`}
                className="my-4 border-t border-gray-200 dark:border-gray-700"
              ></div>,
            );
          }
          elements.push(
            <div key={index} className="prose prose-sm max-w-none">
              <MarkdownPreview content={item.text || ""} />
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

    // 处理单个 ContentBlock 对象
    if (
      typeof message.content === "object" &&
      message.content !== null &&
      !Array.isArray(message.content)
    ) {
      const contentBlock = message.content as ContentItem;

      if (contentBlock.type === "text") {
        // 处理文本块
        return (
          <div className="prose prose-sm max-w-none">
            <MarkdownPreview content={contentBlock.text || ""} />
          </div>
        );
      } else if (contentBlock.type === "tool_use") {
        // 处理工具调用
        return <ToolCall tool={contentBlock} />;
      }
    }

    return null;
  };

  return <div className="">{renderMessageContent()}</div>;
}
