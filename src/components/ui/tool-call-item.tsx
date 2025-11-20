import React, { useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

interface ToolCallItemProps {
  name: string;
  params: string;
  content?: React.ReactNode;
  isExpandable?: boolean;
  defaultExpanded?: boolean;
}

export function ToolCallItem({
  name,
  params,
  content,
  isExpandable = false,
  defaultExpanded = true,
}: ToolCallItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (isExpandable && content) {
    return (
      <div className="my-1 max-w-full">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex w-full items-center justify-start rounded-lg px-2 py-1.5 font-mono text-sm text-gray-500 transition-all hover:bg-gray-200/50 hover:text-gray-900"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 rounded-full bg-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.4)]`}
            ></span>
            <span className="text-start font-medium">
              {name}
              {params}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-100" />
            ) : (
              <ChevronLeft className="h-4 w-4 opacity-40 transition-opacity group-hover:opacity-100" />
            )}
          </div>
        </button>
        {isExpanded && content}
      </div>
    );
  }

  // 简单工具只显示一行
  return (
    <div className="my-2 flex items-center gap-2.5 px-2 font-mono text-sm text-gray-500 dark:text-gray-400">
      <span
        className={`h-2 w-2 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]`}
      ></span>
      <span>
        {name}
        {params}
      </span>
    </div>
  );
}
