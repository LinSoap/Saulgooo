"use client";

import React, { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { cn } from "~/lib/utils";
import { getLanguageFromExtension } from "~/lib/language-map";
import { Button } from "~/components/ui/button";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface CodePreviewProps {
  content: string;
  fileName: string;
  className?: string;
}

export function CodePreview({
  content,
  fileName,
  className,
}: CodePreviewProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const highlightCode = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const language = getLanguageFromExtension(fileName);

        const html = await codeToHtml(content, {
          lang: language,
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
        });

        setHighlightedCode(html);
      } catch (err) {
        console.error("Failed to highlight code:", err);
        setError("语法高亮失败");
        // 如果高亮失败，显示纯文本
        setHighlightedCode(
          `<pre class="shiki"><code>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    void highlightCode();
  }, [content, fileName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("代码已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("复制失败");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-destructive">{error}</p>
        <pre className="bg-muted max-h-full w-full overflow-auto rounded-md p-4">
          <code>{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      {/* 复制按钮 */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="bg-background/80 gap-2 backdrop-blur-sm"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              复制代码
            </>
          )}
        </Button>
      </div>

      {/* 代码高亮显示 */}
      <div
        className={cn(
          "code-preview h-full w-full overflow-auto",
          "[&_pre]:m-0 [&_pre]:h-full [&_pre]:overflow-auto",
          "[&_pre]:!bg-transparent! [&_pre]:p-6",
          "[&_pre]:text-sm [&_pre]:leading-relaxed",
          "dark:[&_.shiki]:!bg-[#0d1117]!",
          "light:[&_.shiki]:!bg-[#ffffff]",
        )}
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    </div>
  );
}
