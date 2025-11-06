import React from "react";
import { CopyIcon } from "~/components/shared/CopyIcon";

interface ToolCardProps {
  title: string;
  content: string;
  customActions?: React.ReactNode;
}

export function ToolCard({ title, content, customActions }: ToolCardProps) {
  return (
    <div className="my-4 w-full overflow-hidden rounded-xl border">
      <div className="bg-muted/80 text-muted-foreground flex items-center justify-between p-3 text-xs">
        <span className="ml-1 font-mono lowercase">{title}</span>
        <div className="flex items-center gap-2">
          {customActions}
          <button
            className="text-muted-foreground hover:text-foreground cursor-pointer p-1 transition-all"
            title="复制内容"
            type="button"
            onClick={() => navigator.clipboard.writeText(content)}
          >
            <CopyIcon />
          </button>
        </div>
      </div>
      <div className="w-full min-w-0">
        <div className="border-t">
          <pre className="bg-muted/40 p-4 font-mono text-xs whitespace-pre-wrap">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
