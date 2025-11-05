"use client";

import { ChevronDown, ChevronLeft, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta.mjs";

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
          <div className="my-4 w-full overflow-hidden rounded-xl border">
            <div className="bg-muted/80 text-muted-foreground flex items-center justify-between p-3 text-xs">
              <span className="ml-1 font-mono lowercase">🌐 webfetch</span>
              <div className="flex items-center gap-2">
                <button
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1 transition-all"
                  title="Open URL"
                  type="button"
                  onClick={() => window.open(url, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1 transition-all"
                  title="Copy URL"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(url)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      width="14"
                      height="14"
                      x="8"
                      y="8"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div className="w-full">
              <div className="min-w-full">
                <div className="border-t">
                  <div className="space-y-3 p-4">
                    {/* Prompt Section */}
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Prompt
                      </div>
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-foreground font-mono text-sm whitespace-pre-wrap">
                          {prompt}
                        </div>
                      </div>
                    </div>
                    {/* URL Section */}
                    <div className="space-y-1">
                      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        URL
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm break-all text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {url}
                        </a>
                        <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

        return (
          <div className="my-4 w-full overflow-hidden rounded-xl border">
            <div className="bg-muted/80 text-muted-foreground flex items-center justify-between p-3 text-xs">
              <span className="ml-1 font-mono lowercase">📋 todowrite</span>
              <div className="flex items-center gap-2">
                <button
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1 transition-all"
                  title="Copy todos"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(todoLines)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      width="14"
                      height="14"
                      x="8"
                      y="8"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div className="w-full min-w-0">
              <div className="border-t">
                <pre className="bg-muted/40 p-4 font-mono text-xs whitespace-pre-wrap">
                  <code>{todoLines}</code>
                </pre>
              </div>
            </div>
          </div>
        );

      case "write":
        return (
          <div className="mt-3 min-w-0 rounded-lg border bg-gray-50 p-4">
            <div className="mb-3 border-b pb-2 font-mono text-xs text-gray-500 dark:text-gray-400">
              📄 {(input?.file_path as string) ?? ""}
            </div>
            <div className="min-h-0 overflow-y-auto">
              <pre className="max-w-full font-mono text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {(input?.content as string) ?? ""}
              </pre>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const { name, params } = getToolInfo();
  const hasContent = ["webfetch", "todowrite", "write"].includes(
    tool.name?.toLowerCase() ?? "",
  );
  const content = renderToolContent();

  // 获取工具颜色
  const getToolColor = () => {
    const toolName = tool.name?.toLowerCase() ?? "";
    switch (toolName) {
      case "webfetch":
        return "bg-blue-400 ";
      case "todowrite":
        return "bg-green-400 ";
      default:
        return "bg-gray-300";
    }
  };

  if (hasContent && content) {
    return (
      <div className="my-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex w-full items-center justify-start font-mono text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${getToolColor()}`}></span>
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
      <span className={`h-2 w-2 rounded-full ${getToolColor()}`}></span>
      <span>
        {name}
        {params}
      </span>
    </div>
  );
}

export { ToolCall };
