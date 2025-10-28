"use client";

import { Suspense } from "react";
import { Streamdown } from "streamdown";
import { cn } from "~/lib/utils";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function MarkdownContent({ content, className }: MarkdownPreviewProps) {
  const cleanContent = content.trim();

  return (
    <div
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
    >
      <Streamdown parseIncompleteMarkdown={true}>{cleanContent}</Streamdown>
    </div>
  );
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <Suspense fallback={<div className="text-muted-foreground">加载中...</div>}>
      <MarkdownContent content={content} className={className} />
    </Suspense>
  );
}
