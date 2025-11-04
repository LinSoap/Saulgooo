import React from "react";
import { Button } from "~/components/ui/button";
import {
  Download,
  Save,
  RotateCcw,
  Edit3,
  Eye,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface FilePreviewHeaderProps {
  fileName: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  readOnly?: boolean;
  isSaving?: boolean;
  hasUnsavedChange?: boolean;
  isRefreshing?: boolean;
  viewMode?: "edit" | "preview";
  onViewModeChange?: (mode: "edit" | "preview") => void;
  onSave?: () => void;
  onRefresh?: () => void;
  onDownload?: () => void;
  onRevert?: () => void;
  wordCount?: number;
  charCount?: number;
  className?: string;
}

export function FilePreviewHeader({
  fileName,
  filePath,
  mimeType,
  fileSize,
  readOnly = true,
  isSaving = false,
  hasUnsavedChange = false,
  isRefreshing = false,
  viewMode = "preview",
  onViewModeChange,
  onSave,
  onRefresh,
  onDownload,
  onRevert,
  wordCount,
  charCount,
  className,
}: FilePreviewHeaderProps) {
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
    return (size / 1024).toFixed(2) + " KB";
  };

  return (
    <div className={cn("border-b bg-background", className)}>
      {/* 主工具栏 */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-3">
          {getFileIcon(mimeType)}
          <div>
            <h2 className="font-semibold">{fileName}</h2>
            {(mimeType ?? fileSize) && (
              <p className="text-sm text-gray-500">
                {mimeType && <span>{mimeType}</span>}
                {mimeType && fileSize && <span> • </span>}
                {fileSize && <span>{formatFileSize(fileSize)}</span>}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换按钮（仅对非只读文件显示） */}
          {!readOnly && onViewModeChange && (
            <>
              <Button
                variant={viewMode === "preview" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewModeChange("preview")}
              >
                <Eye className="mr-2 h-4 w-4" />
                预览
              </Button>
              <Button
                variant={viewMode === "edit" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewModeChange("edit")}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                编辑
              </Button>
            </>
          )}

          {/* 刷新按钮 */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-1 h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
              />
              刷新
            </Button>
          )}

          {/* 保存按钮（仅在编辑模式下显示） */}
          {!readOnly && viewMode === "edit" && onSave && (
            <>
              <Button
                onClick={onSave}
                disabled={!hasUnsavedChange || isSaving}
                size="sm"
                variant="outline"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "保存中..." : hasUnsavedChange ? "保存" : "已保存"}
              </Button>
              {hasUnsavedChange && onRevert && (
                <Button onClick={onRevert} size="sm" variant="ghost">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  还原
                </Button>
              )}
            </>
          )}

          {/* 下载按钮（所有文件都显示） */}
          {onDownload && (
            <Button
              onClick={onDownload}
              size="sm"
              variant="outline"
              title="下载文件"
            >
              <Download className="mr-2 h-4 w-4" />
              下载
            </Button>
          )}
        </div>
      </div>

      {/* 状态栏（可选） */}
      {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
      {(filePath || wordCount !== undefined || charCount !== undefined) && (
        <div className="bg-muted/30 border-t px-6 py-1">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              {filePath && <span>{filePath}</span>}
              {mimeType && <span>{mimeType.split("/")?.[1]?.toUpperCase() ?? "FILE"}</span>}
            </div>
            <div className="flex items-center gap-4">
              {wordCount !== undefined && <span>{wordCount} 词</span>}
              {charCount !== undefined && <span>{charCount} 字符</span>}
              {!readOnly && viewMode === "edit" && hasUnsavedChange && (
                <span className="text-orange-600">未保存</span>
              )}
              {!readOnly && viewMode === "edit" && <span>Ctrl+S 保存</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}