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
