import React from "react";
import { CopyIcon } from "~/components/shared/CopyIcon";

interface ToolCardProps {
  title: string;
  content: string;
  customActions?: React.ReactNode;
}

export function ToolCard({ title, content, customActions }: ToolCardProps) {
  return (
    <div className="my-1 w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-gray-50/50 p-3 text-xs text-gray-500">
        <span className="ml-1 font-mono font-medium lowercase">{title}</span>
        <div className="flex items-center gap-2">
          {customActions}
          <button
            className="cursor-pointer p-1 text-gray-400 transition-all hover:text-gray-700"
            title="复制内容"
            type="button"
            onClick={() => navigator.clipboard.writeText(content)}
          >
            <CopyIcon />
          </button>
        </div>
      </div>
      <div className="w-full min-w-0">
        <div className="border-t border-gray-50">
          <pre className="bg-white p-4 font-mono text-xs whitespace-pre-wrap text-gray-600">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
