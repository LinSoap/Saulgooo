import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "~/trpc/react";
import { Loader2, FileText } from "lucide-react";
import { FilePreviewHeader } from "~/components/ui/file-preview-header";

interface PreviewPanelProps {
  workspaceId: string;
  selectedFile: {
    path: string;
    name: string;
    type: "file" | "directory";
    mimeType?: string;
    size?: number;
  } | null;
}

export function PreviewPanel({ workspaceId, selectedFile }: PreviewPanelProps) {
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<
    "iframe" | "native" | "download"
  >("iframe");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: fileContent, isLoading: isContentLoading } =
    api.workspace.getFileContent.useQuery(
      {
        workspaceId,
        filePath: selectedFile?.path ?? "",
      },
      {
        enabled: !!selectedFile && selectedFile.type === "file",
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    );

  // JSON 语法高亮
  const syntaxHighlightJson = useCallback((json: string) => {
    return json
      .replace(/(".*?")(\s*:)/g, '<span class="json-key">$1</span>$2')
      .replace(/:\s*((".*?")|(\d+)| (true|false|null))/g, (match) => {
        if (match.includes('"')) {
          return (
            ': <span class="json-string">' + match.split(": ")[1] + "</span>"
          );
        }
        if (/true|false|null/.test(match)) {
          return (
            ': <span class="json-' +
            match.split(": ")[1] +
            '">' +
            match.split(": ")[1] +
            "</span>"
          );
        }
        if (/\d+/.test(match)) {
          return (
            ': <span class="json-number">' + match.split(": ")[1] + "</span>"
          );
        }
        return match;
      });
  }, []);

  // 生成预览 HTML
  const generatePreviewHtml = useCallback(
    (content: string, mimeType: string) => {
      const escapedContent = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      let processedContent = escapedContent;

      // 根据类型处理内容
      switch (mimeType) {
        case "text/html":
          processedContent = content; // HTML 不需要转义
          break;

        case "text/markdown":
          // 简单的 Markdown 预览（可以集成 marked.js）
          processedContent = `
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 2rem; }
            h1, h2, h3 { color: #333; }
            code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; }
            pre { background: #f4f4f4; padding: 1rem; border-radius: 5px; overflow-x: auto; }
          </style>
          <pre>${escapedContent}</pre>
        `;
          break;

        case "application/json":
          processedContent = `
          <style>
            body { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; padding: 2rem; }
            .json-key { color: #881391; }
            .json-string { color: #0d7e0d; }
            .json-number { color: #1976d2; }
            .json-boolean { color: #d32f2f; }
            .json-null { color: #9e9e9e; }
          </style>
          <pre>${syntaxHighlightJson(escapedContent)}</pre>
        `;
          break;

        default:
          processedContent = `
          <style>
            body { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; padding: 2rem; white-space: pre-wrap; word-wrap: break-word; }
          </style>
          <pre>${escapedContent}</pre>
        `;
      }

      return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Preview: ${selectedFile?.name}</title>
          <style>
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${processedContent}
        </body>
      </html>
    `;
    },
    [selectedFile?.name, syntaxHighlightJson],
  );

  // 判断文件是否支持 iframe 预览
  const isIframeSupported = useCallback((mimeType?: string) => {
    if (!mimeType) return false;

    // 支持的 MIME 类型
    const supportedTypes = [
      "text/plain",
      "text/markdown",
      "text/html",
      "text/css",
      "text/javascript",
      "application/json",
      "application/xml",
      "image/svg+xml",
      "application/pdf",
    ];

    // 支持 text/* 的大部分类型
    if (mimeType.startsWith("text/")) return true;

    // 支持特定的 application 类型
    return supportedTypes.includes(mimeType);
  }, []);

  // 创建可供 iframe 访问的 URL
  const createPreviewUrl = useCallback(
    async (content: string, mimeType: string, encoding?: string) => {
      try {
        // 对于文本内容，直接创建 HTML 页面
        if (
          mimeType.startsWith("text/") ||
          mimeType === "application/json" ||
          mimeType === "application/xml"
        ) {
          const htmlContent = generatePreviewHtml(content, mimeType);
          const blob = new Blob([htmlContent], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          return url;
        }

        // 对于 PDF 和 SVG，直接使用 data URL
        if (mimeType === "application/pdf" || mimeType === "image/svg+xml") {
          if (encoding === "base64") {
            return `data:${mimeType};base64,${content}`;
          }
        }

        return null;
      } catch (error) {
        console.error("Failed to create preview URL:", error);
        return null;
      }
    },
    [generatePreviewHtml],
  );

  // 下载文件
  const downloadFile = useCallback(() => {
    if (!fileContent || !selectedFile) return;

    try {
      const { content, mimeType, encoding } = fileContent;
      let blob: Blob;

      if (encoding === "base64") {
        const binaryContent = atob(content);
        const bytes = new Uint8Array(binaryContent.length);
        for (let i = 0; i < binaryContent.length; i++) {
          bytes[i] = binaryContent.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      } else {
        blob = new Blob([content], { type: mimeType });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }, [fileContent, selectedFile]);

  
  // 当文件改变时更新预览
  useEffect(() => {
    if (fileContent && selectedFile) {
      setIsLoading(true);

      const { content, mimeType, encoding } = fileContent;

      // 判断预览模式
      if (isIframeSupported(mimeType)) {
        setPreviewMode("iframe");
        void createPreviewUrl(content, mimeType, encoding).then((url) => {
          if (url) {
            setIframeUrl(url);
          } else {
            setPreviewMode("native");
          }
          setIsLoading(false);
        });
      } else if (mimeType?.startsWith("image/")) {
        setPreviewMode("native");
        setIsLoading(false);
      } else if (
        mimeType?.startsWith("video/") ||
        mimeType?.startsWith("audio/")
      ) {
        setPreviewMode("native");
        setIsLoading(false);
      } else {
        setPreviewMode("download");
        setIsLoading(false);
      }
    } else {
      setIframeUrl("");
      setPreviewMode("iframe");
    }
  }, [fileContent, selectedFile, isIframeSupported, createPreviewUrl]);

  // 清理 URL
  useEffect(() => {
    return () => {
      if (iframeUrl) {
        URL.revokeObjectURL(iframeUrl);
      }
    };
  }, [iframeUrl]);

  if (!selectedFile) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <p className="text-lg">Select a file to preview</p>
          <p className="mt-2 text-sm">Click on any file in the left sidebar</p>
        </div>
      </div>
    );
  }

  if (selectedFile.type === "directory") {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <p className="text-lg">Cannot preview directories</p>
          <p className="mt-2 text-sm">Please select a file</p>
        </div>
      </div>
    );
  }

  if (isContentLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  // 渲染内容
  const renderContent = () => {
    const { content, mimeType, encoding } = fileContent!;

    // 图片预览
    if (mimeType?.startsWith("image/")) {
      const imageSrc =
        encoding === "base64" ? `data:${mimeType};base64,${content}` : content;

      return (
        <div className="flex h-full items-center justify-center bg-gray-50 p-8">
          <img
            src={imageSrc}
            alt={selectedFile.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      );
    }

    // 视频预览
    if (mimeType?.startsWith("video/")) {
      const videoSrc =
        encoding === "base64"
          ? `data:${mimeType};base64,${content}`
          : URL.createObjectURL(
              new Blob(
                [
                  encoding === "base64"
                    ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
                    : content,
                ],
                { type: mimeType },
              ),
            );

      return (
        <div className="flex h-full items-center justify-center bg-black p-8">
          <video controls className="max-h-full max-w-full">
            <source src={videoSrc} type={mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // 音频预览
    if (mimeType?.startsWith("audio/")) {
      const audioSrc =
        encoding === "base64"
          ? `data:${mimeType};base64,${content}`
          : URL.createObjectURL(
              new Blob(
                [
                  encoding === "base64"
                    ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
                    : content,
                ],
                { type: mimeType },
              ),
            );

      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <audio controls className="w-full">
              <source src={audioSrc} type={mimeType} />
              Your browser does not support the audio tag.
            </audio>
            <p className="mt-4 text-center text-gray-600">
              {selectedFile.name}
            </p>
          </div>
        </div>
      );
    }

    // 不支持的文件类型 - 显示下载选项
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h3 className="mt-4 mb-2 text-xl font-semibold">
            {selectedFile.name}
          </h3>
          <p className="mb-4 text-gray-600">Type: {mimeType}</p>
          {selectedFile.size && (
            <p className="mb-4 text-gray-600">
              Size: {(selectedFile.size / 1024).toFixed(2)} KB
            </p>
          )}
          <p className="mb-6 text-gray-500">
            This file type cannot be previewed.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <FilePreviewHeader
        fileName={selectedFile.name}
        filePath={selectedFile.path}
        mimeType={fileContent?.mimeType}
        fileSize={fileContent?.size}
        readOnly={true}
        onDownload={downloadFile}
      />

      {/* Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {previewMode === "iframe" && iframeUrl ? (
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            className="h-full min-h-0 w-full flex-1 border-0"
            title={`Preview of ${selectedFile.name}`}
            sandbox="allow-scripts"
          />
        ) : (
          <div className="h-full w-full overflow-auto">
            {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
}
