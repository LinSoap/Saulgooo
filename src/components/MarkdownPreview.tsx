"use client";

import { Suspense } from "react";
import { Streamdown } from "streamdown";
import { cn } from "~/lib/utils";
import type { Components } from "react-markdown";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function MarkdownContent({ content, className }: MarkdownPreviewProps) {
  const customComponents: Components = {
    // 简化配置，主要使用默认行为
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-primary underline underline-offset-4 hover:no-underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    img: ({ src, alt, ...props }) => (
      <img
        src={src}
        alt={alt}
        className="my-2 h-auto max-w-full rounded-lg"
        {...props}
      />
    ),
  };

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // 使用 Tailwind CSS 自定义 prose 样式
        // "[&_p]:my-2",
        // "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2",
        // "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2",
        // "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2",
        // "[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1",
        // "[&_h5]:text-base [&_h5]:font-semibold [&_h5]:mt-2 [&_h5]:mb-1",
        // "[&_h6]:text-sm [&_h6]:font-semibold [&_h6]:mt-2 [&_h6]:mb-1",
        // "[&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2",
        // "[&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-2",
        // "[&_li]:my-1",
        // "[&_code:not(pre_&)]:px-1 [&_code:not(pre_&)]:py-0.5 [&_code:not(pre_&)]:bg-muted [&_code:not(pre_&)]:rounded [&_code:not(pre_&)]:text-sm",
        // "[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2",
        // "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        // "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-2",
        // "[&_table]:border-collapse [&_table]:border-spacing-0 [&_table]:my-2",
        // "[&_th]:border [&_th]:border-b [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:bg-muted/50",
        // "[&_td]:border [&_td]:border-b [&_td]:px-4 [&_td]:py-2",
        // "[&_hr]:my-4 [&_hr]:border-muted",
        className,
      )}
    >
      <Streamdown
        className={className}
        parseIncompleteMarkdown={true}
        components={customComponents}
      >
        {content}
      </Streamdown>
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
