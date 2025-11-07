"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { FilePreviewHeader } from "~/components/ui/file-preview-header";
import MarkdownEditor from "~/components/workspace/MarkdownEditor";
import { useState, useEffect, useCallback } from "react";
import {
  fetchFileContent,
  getOssFileUrl,
  type FileData,
  getFileRenderType,
} from "~/lib/file";
import Image from "next/image";
import { useFileWatcher } from "~/hooks/use-file-watcher";

export default function FilePreview() {
  const params = useParams();
  const workspaceId = params.id as string;
  const searchParams = useSearchParams();
  const filePath = searchParams?.get("file") ?? "";
  const { data: session } = useSession();

  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载文件内容
  const loadFile = useCallback(async (noCache = false) => {
    if (!filePath || !session?.user) {
      setFileData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchFileContent(workspaceId, filePath, { noCache });
      setFileData(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load file"));
      setFileData(null);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, filePath, session?.user]);

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
    }
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
    return null;
  }

  // 构建OSS URL
  const ossUrl = getOssFileUrl(workspaceId, filePath, { preview: true });

  // 获取文件渲染类型
  const renderType = getFileRenderType(fileData.mimeType, fileData.fileName);

  return (
    <div className="flex h-full flex-col">
      <FilePreviewHeader
        fileData={fileData}
        onRefresh={handleRefresh}
      />
      <div className="min-h-0 flex-1">
        {renderType === "html" ? (
          // HTML文件使用iframe预览
          <iframe
            src={ossUrl}
            className="h-full w-full border-0"
            title={`Preview of ${fileData.fileName}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-downloads"
            loading="lazy"
          />
        ) : renderType === "text" ? (
          // 文本文件使用MarkdownEditor
          <MarkdownEditor fileData={fileData} />
        ) : renderType === "image" ? (
          // 图片文件直接显示
          <div className="flex h-full items-center justify-center p-4">
            <Image
              src={ossUrl}
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
              src={ossUrl}
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
              src={ossUrl}
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
            src={ossUrl}
            className="h-full w-full border-0"
            title={`PDF Preview: ${fileData.fileName}`}
          />
        ) : (
          // 不支持的文件类型显示下载选项
          <div className="flex h-full flex-col items-center justify-center p-4 text-gray-500">
            <div className="mb-4">Cannot preview this file type.</div>
            <div>{fileData.mimeType}</div>
            <a
              href={getOssFileUrl(workspaceId, filePath, { download: true })}
              download={fileData.fileName}
              className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
