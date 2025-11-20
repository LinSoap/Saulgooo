"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FilePreviewHeader } from "~/components/ui/file-preview-header";
import MarkdownEditor from "~/components/workspace/MarkdownEditor";
import { CodePreview } from "~/components/shared/CodePreview";
import { useState, useEffect, useCallback } from "react";
import { getOssFileUrl, type FileData, getFileRenderType } from "~/lib/file";
import Image from "next/image";
import { useFileWatcher } from "~/hooks/use-file-watcher";
import { api } from "~/trpc/react";
import { formatFileSize } from "~/lib/file";
import { Sparkles, FileText, Bot, ArrowLeft } from "lucide-react";

export default function FilePreview() {
  const params = useParams();
  const workspaceId = params.id as string;
  const searchParams = useSearchParams();
  const filePath = searchParams?.get("file") ?? "";
  const { data: session } = useSession();

  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const utils = api.useUtils();

  // 加载文件内容
  const loadFile = useCallback(
    async (_noCache = false) => {
      if (!filePath || !session?.user) {
        setFileData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. 先获取文件元数据
        const metadata = await utils.file.fetchFileMetadata.fetch({
          workspaceId,
          filePath,
        });

        // 2. 判断是否需要获取内容
        const renderType = getFileRenderType(
          metadata.mimeType,
          metadata.fileName,
          metadata.size,
        );

        // 只有代码和文本文件需要获取内容
        // 注意：getFileRenderType 内部已经处理了 application/octet-stream < 10KB 的情况
        if (renderType === "code" || renderType === "text") {
          const contentData = await utils.file.fetchFileContent.fetch({
            workspaceId,
            filePath,
          });
          setFileData(contentData);
        } else {
          // 其他类型（图片、视频、PDF等）不需要内容，直接使用元数据
          setFileData({
            ...metadata,
            content: undefined,
            encoding: undefined,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load file"));
        setFileData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, filePath, session?.user, utils],
  );

  // 初始加载
  useEffect(() => {
    void loadFile();
  }, [loadFile]);

  // 使用文件监听
  useFileWatcher(
    workspaceId,
    // 文件树变化回调（不关心）
    undefined,
    // 文件内容变化回调
    (changedFilePath) => {
      // 如果是当前文件，刷新预览
      if (changedFilePath === filePath) {
        void loadFile(true);
      }
    },
  );

  // 刷新处理函数
  const handleRefresh = useCallback(() => {
    void loadFile(true);
  }, [loadFile]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">加载文件失败: {error.message}</p>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-4xl bg-gray-50 shadow-sm">
          <Sparkles className="h-10 w-10 text-gray-300" />
        </div>
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-gray-900">
          准备就绪
        </h2>
        <p className="mb-12 max-w-md text-sm leading-relaxed text-gray-500">
          从左侧选择一个文件开始编辑，或者让右侧的 AI 助手帮您生成课程内容。
        </p>

        <div className="grid w-full max-w-lg grid-cols-2 gap-4">
          <div className="group flex flex-col items-center gap-4 rounded-3xl border border-gray-100 bg-gray-50/50 p-8 transition-all hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm">
            <div className="rounded-2xl bg-white p-3 shadow-sm transition-transform group-hover:scale-110">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-bold text-gray-900">浏览文件</div>
              <div className="text-xs text-gray-400">
                <ArrowLeft className="mr-1 inline h-3 w-3" />
                左侧侧边栏
              </div>
            </div>
          </div>
          <div className="group flex flex-col items-center gap-4 rounded-3xl border border-gray-100 bg-gray-50/50 p-8 transition-all hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm">
            <div className="rounded-2xl bg-white p-3 shadow-sm transition-transform group-hover:scale-110">
              <Bot className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm font-bold text-gray-900">AI 助手</div>
              <div className="text-xs text-gray-400">
                右侧侧边栏
                <ArrowLeft className="ml-1 inline h-3 w-3 rotate-180" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 统一使用OSS API获取文件URL
  const fileUrl = getOssFileUrl(workspaceId, filePath, { preview: true });

  // 获取文件渲染类型
  const renderType = getFileRenderType(
    fileData.mimeType,
    fileData.fileName,
    fileData.size,
  );

  return (
    <div className="flex h-full flex-col bg-white">
      <FilePreviewHeader
        fileData={fileData}
        onRefresh={handleRefresh}
        workspaceId={workspaceId}
        filePath={filePath}
      />
      <div className="flex-1 overflow-y-auto bg-white">
        {renderType === "html" ? (
          // HTML文件使用iframe预览
          <iframe
            src={fileUrl}
            className="h-full w-full border-0"
            title={`Preview of ${fileData.fileName}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-downloads"
            loading="lazy"
          />
        ) : renderType === "text" ? (
          // Markdown文件使用MarkdownEditor
          <div className="flex min-h-full justify-center px-8 md:px-12">
            <div className="w-full max-w-3xl">
              <MarkdownEditor fileData={fileData} />
            </div>
          </div>
        ) : renderType === "code" ? (
          // 代码文件使用CodePreview进行语法高亮
          <div className="h-full w-full">
            <CodePreview
              content={fileData.content ?? ""}
              fileName={fileData.fileName}
            />
          </div>
        ) : renderType === "image" ? (
          // 图片文件直接显示
          <div className="flex h-full items-center justify-center p-4">
            <Image
              src={fileUrl}
              alt={fileData.fileName}
              width={800}
              height={600}
              className="max-h-full max-w-full object-contain"
              unoptimized
            />
          </div>
        ) : renderType === "video" ? (
          // 视频文件使用video标签
          <div className="flex h-full items-center justify-center p-4">
            <video
              src={fileUrl}
              controls
              className="max-h-full max-w-full"
              title={fileData.fileName}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : renderType === "audio" ? (
          // 音频文件使用audio标签
          <div className="flex h-full items-center justify-center p-4">
            <audio
              src={fileUrl}
              controls
              className="w-full max-w-md"
              title={fileData.fileName}
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        ) : renderType === "pdf" ? (
          // PDF文件使用iframe
          <iframe
            src={fileUrl}
            className="h-full w-full border-0"
            title={`PDF Preview: ${fileData.fileName}`}
          />
        ) : (
          // 不支持的文件类型显示下载选项
          <div className="flex h-full flex-col items-center justify-center p-8">
            <div className="flex max-w-md flex-col items-center gap-4 text-center">
              {/* 图标 */}
              <div className="bg-muted rounded-full p-4">
                <svg
                  className="text-muted-foreground h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>

              {/* 标题和描述 */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">无法预览此文件</h3>
                <p className="text-muted-foreground text-sm">
                  暂不支持预览此类型的文件。您可以下载文件到本地进行查看。
                </p>
              </div>

              {/* 文件信息 */}
              <div className="bg-muted/50 rounded-lg px-3 py-2">
                <p className="text-muted-foreground font-mono text-xs">
                  文件类型: {fileData.mimeType}
                </p>
              </div>

              {/* 下载按钮 */}
              <a
                href={getOssFileUrl(workspaceId, filePath, { download: true })}
                download={fileData.fileName}
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 10.5L12 15m0 0l4.5-4.5M12 15V3"
                  />
                </svg>
                下载文件
              </a>

              {/* 文件大小提示 */}
              {fileData.size && (
                <p className="text-muted-foreground text-xs">
                  文件大小: {formatFileSize(fileData.size)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
