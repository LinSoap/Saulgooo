"use client";

import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Download,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import type { FileData } from "~/lib/file";
import { formatFileSize } from "~/lib/file";

interface FilePreviewHeaderProps {
  fileData: FileData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // workspaceId和filePath现在必需
  workspaceId: string;
  filePath: string;
}

export function FilePreviewHeader({
  fileData,
  onRefresh,
  isRefreshing: externalIsRefreshing,
  workspaceId,
  filePath,
}: FilePreviewHeaderProps) {
  const { fileName, mimeType, size } = fileData;
  const [isDownloading, setIsDownloading] = useState(false);
  const [internalIsRefreshing, setInternalIsRefreshing] = useState(false);

  // 使用外部传入的 isRefreshing 状态，如果没有则使用内部状态
  const isRefreshing = externalIsRefreshing ?? internalIsRefreshing;

  // 获取文件图标
  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="h-4 w-4 text-gray-400" />;
    if (mimeType.startsWith("image/"))
      return <ImageIcon className="h-4 w-4 text-green-500" />;
    if (mimeType.startsWith("video/"))
      return <Film className="h-4 w-4 text-purple-500" />;
    if (mimeType.startsWith("audio/"))
      return <Music className="h-4 w-4 text-pink-500" />;
    if (
      mimeType.includes("zip") ||
      mimeType.includes("rar") ||
      mimeType.includes("tar")
    )
      return <Archive className="h-4 w-4 text-yellow-500" />;
    return <FileText className="h-4 w-4 text-gray-400" />;
  };

  
  // 处理刷新
  const handleRefresh = async () => {
    if (!externalIsRefreshing) {
      setInternalIsRefreshing(true);
    }
    try {
      if (onRefresh) {
        onRefresh();
      }
      toast.success("文件已刷新");
    } catch (error) {
      console.error("Refresh failed:", error);
      toast.error("刷新失败");
    } finally {
      if (!externalIsRefreshing) {
        setInternalIsRefreshing(false);
      }
    }
  };

  // 处理下载 - 简化版本，只通过API下载
  const handleDownload = async () => {
    if (!workspaceId || !filePath) {
      toast.error("缺少必要参数，无法下载");
      return;
    }

    setIsDownloading(true);
    try {
      // 统一使用API下载路径
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const downloadUrl = `/api/oss/${workspaceId}/${encodedPath}?download=true`;

      // 触发下载
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileData.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("文件下载成功");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("下载失败");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={"bg-background border-b"}>
      {/* 工具栏只显示文件基本信息 */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          {getFileIcon(mimeType)}
          <div>
            <h2 className="font-semibold">{fileName}</h2>
            {(mimeType ?? size) && (
              <p className="text-sm text-gray-500">
                {mimeType && <span>{mimeType}</span>}
                {mimeType && size && <span> • </span>}
                {size && <span>{formatFileSize(size)}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              "下载中..."
            ) : (
              <>
                <Download className="mr-1 h-3 w-3" />
                下载
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
