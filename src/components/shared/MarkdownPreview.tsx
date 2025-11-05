"use client";

import React, { Suspense } from "react";
import { Streamdown } from "streamdown";
import { cn } from "~/lib/utils";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const cleanContent = content.trim();

  return (
    <Suspense fallback={<div className="text-muted-foreground">加载中...</div>}>
      <div className={cn("prose prose-sm max-w-none")}>
        <Streamdown parseIncompleteMarkdown={true}>{cleanContent}</Streamdown>
      </div>
    </Suspense>
  );
}
