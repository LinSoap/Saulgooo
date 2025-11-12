"use client";

import React, { Suspense, useMemo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "~/lib/utils";
import { preprocessMarkdown } from "~/lib/markdown-sanitizer";

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  // 使用智能预处理：仅转义非标准 HTML 标签，保留代码块中的内容
  const cleanContent = useMemo(() => {
    return preprocessMarkdown(content.trim());
  }, [content]);

  return (
    <Suspense fallback={<div className="text-muted-foreground">加载中...</div>}>
      <div className={cn("prose prose-sm max-w-none")}>
        <Streamdown parseIncompleteMarkdown={true}>{cleanContent}</Streamdown>
      </div>
    </Suspense>
  );
}
