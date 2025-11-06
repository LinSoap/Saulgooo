"use client";

import { ChevronDown, ChevronLeft, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta.mjs";
import type { EditOutput, WriteOutput } from "~/types/tool";
import { ToolCard } from "~/components/ui/tool-card";

// 简单的工具调用组件
function ToolCall({ tool }: { tool: BetaToolUseBlock }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 提取文件名
  const getFileName = (path: string): string => {
    if (!path) return "";
    const parts = path.split("/");
    return parts[parts.length - 1] ?? path;
  };

  // 获取工具基本信息
  const getToolInfo = () => {
    if (tool.type !== "tool_use") return { name: "Unknown", params: "" };

    const toolName = tool.name?.toLowerCase() ?? "";
    const input = tool.input as Record<string, unknown>;

    switch (toolName) {
      case "write":
        return {
          name: "Write",
          params: `(${getFileName((input?.file_path as string) ?? "")})`,
        };
      case "read":
        return {
          name: "Read",
          params: `(${getFileName((input?.file_path as string) ?? "")})`,
        };
      case "edit":
        return {
          name: "Edit",
          params: `(${getFileName((input?.file_path as string) ?? "")})`,
        };
      case "glob":
        return {
          name: "Glob",
          params: `(${(input?.pattern as string) ?? ""})`,
        };
      case "bash":
        return {
          name: "Bash",
          params: `(${(input?.command as string) ?? ""})`,
        };
      case "webfetch":
        return {
          name: "WebFetch",
          params: `(${(input?.url as string) ?? ""})`,
        };
      case "todowrite":
        const todos = input?.todos as unknown[];
        const count = Array.isArray(todos) ? todos.length : 0;
        return { name: "TodoWrite", params: `(${count} items)` };
      default:
        return { name: tool.name ?? "Unknown", params: "" };
    }
  };

  // 渲染工具内容
  const renderToolContent = () => {
    const toolName = tool.name?.toLowerCase() ?? "";
    const input = tool.input as Record<string, unknown>;

    switch (toolName) {
      case "webfetch":
        const url = (input?.url as string) ?? "";
        const prompt = (input?.prompt as string) ?? "No prompt available";

        return (
          <ToolCard
            title="🌐 webfetch"
            content={`Prompt: ${prompt}\n\nURL: ${url}`}
            customActions={
              <button
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1 transition-all"
                title="Open URL"
                type="button"
                onClick={() => window.open(url, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            }
          />
        );

      case "todowrite":
        const todos = input?.todos as Record<string, unknown>[];
        const todoLines = Array.isArray(todos)
          ? todos
              .map((todo, _index) => {
                const status = (todo.status as string) ?? "pending";
                const content = (todo.content as string) ?? "";
                const statusIcon =
                  status === "completed"
                    ? "✓"
                    : status === "in_progress"
                      ? "○"
                      : "○";
                return `${statusIcon} ${content}`;
              })
              .join("\n")
          : "No todos available";

        return <ToolCard title="📋 todowrite" content={todoLines} />;

      case "edit":
        const editOutput = tool.input as EditOutput;
        return (
          <ToolCard
            title="✏️ edit"
            content={`${editOutput.old_string}\n\n${editOutput.new_string}`}
          />
        );
      case "write":
        const writeOutput = tool.input as WriteOutput;
        const content = `File: ${writeOutput?.file_path}\n\n${writeOutput?.content}`;
        return <ToolCard title="📝 write" content={content} />;
      default:
        return null;
    }
  };

  const { name, params } = getToolInfo();
  const hasContent = ["webfetch", "todowrite", "write", "edit"].includes(
    tool.name?.toLowerCase() ?? "",
  );
  const content = renderToolContent();

  if (hasContent && content) {
    return (
      <div className="my-3 max-w-full">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex w-full items-center justify-start font-mono text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full bg-gray-300`}></span>
            <span className="text-start font-medium">
              {name}
              {params}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
            ) : (
              <ChevronLeft className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
            )}
          </div>
        </button>
        {isExpanded && content}
      </div>
    );
  }

  // 简单工具只显示一行
  return (
    <div className="my-2 flex items-center gap-2 font-mono text-sm text-gray-500 dark:text-gray-400">
      <span className={`h-2 w-2 rounded-full bg-gray-300`}></span>
      <span>
        {name}
        {params}
      </span>
    </div>
  );
}

export { ToolCall };
