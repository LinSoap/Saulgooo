"use client";

import React, { Suspense } from "react";
import { Streamdown } from "streamdown";
import { cn } from "~/lib/utils";
import { Download } from "lucide-react";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function MarkdownContent({ content, className }: MarkdownPreviewProps) {
  const cleanContent = content.trim();

  const handleImageDownload = (src: string | Blob | undefined, alt: string | undefined) => {
    if (typeof src !== 'string' || !src) return;
    
    const link = document.createElement("a");
    link.href = src;
    link.download = alt ?? "image";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
    >
      <Streamdown
        parseIncompleteMarkdown={true}
        components={{
          // 重写段落组件，避免嵌套块级元素的问题
          p: ({ children, ...props }) => {
            // 如果有 align 属性，使用 div 而不是 p
            const hasAlign = "align" in props;
            if (hasAlign) {
              return (
                <div className="flex flex-wrap justify-center gap-4">
                  {children}
                </div>
              );
            }
            return <p {...props}>{children}</p>;
          },
          // 图片组件，包含原始的样式和下载功能
          img: ({ src, alt, ...props }: { src?: string | Blob; alt?: string } & React.ImgHTMLAttributes<HTMLImageElement>) => {
            if (typeof src !== 'string') return null;
            
            return (
            <div className="group relative my-4 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-w-full rounded-lg"
                {...props}
              />
              {/* 悬停效果 */}
              <div className="pointer-events-none absolute inset-0 hidden rounded-lg bg-black/10 group-hover:block" />
              {/* 下载按钮 */}
              <button
                onClick={() =>
                  handleImageDownload(src, alt)
                }
                className="border-border bg-background/90 hover:bg-background absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 group-hover:opacity-100"
                title="Download image"
                type="button"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
            );
          },
        }}
      >
        {cleanContent}
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
