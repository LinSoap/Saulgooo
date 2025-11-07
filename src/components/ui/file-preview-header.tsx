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

interface FilePreviewHeaderProps {
  fileData: FileData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function FilePreviewHeader({
  fileData,
  onRefresh,
  isRefreshing: externalIsRefreshing,
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

  // 格式化文件大小
  const formatFileSize = (size?: number) => {
    if (!size) return "";
    if (size >= 1024 * 1024) {
      return (size / (1024 * 1024)).toFixed(2) + " MB";
    }
    return (size / 1024).toFixed(2) + " KB";
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

  // 处理下载
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // 根据编码方式转换数据为 Blob
      let blob: Blob;
      if (fileData.encoding === "utf-8") {
        blob = new Blob([fileData.content], { type: fileData.mimeType });
      } else {
        // base64 编码
        const binaryString = atob(fileData.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: fileData.mimeType });
      }

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileData.fileName;
      document.body.appendChild(a);
      a.click();

      // 清理资源
      window.URL.revokeObjectURL(url);
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
