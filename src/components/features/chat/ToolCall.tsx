"use client";

import { ExternalLink } from "lucide-react";
import type { BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta.mjs";
import type { EditOutput, WriteOutput } from "~/types/tools";
import { ToolCard } from "~/components/ui/tool-card";
import { ToolCallItem } from "~/components/ui/tool-call-item";

// 简单的工具调用组件
function ToolCall({ tool }: { tool: BetaToolUseBlock }) {
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
      <ToolCallItem
        name={name}
        params={params}
        content={content}
        isExpandable={true}
      />
    );
  }

  // 简单工具只显示一行
  return <ToolCallItem name={name} params={params} isExpandable={false} />;
}

export { ToolCall };
