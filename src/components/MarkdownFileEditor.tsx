"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Save, RotateCcw, Edit3, Eye } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  ProseEditor,
  useMarkdownEditor,
} from "~/components/ui/markdown-editor";
import { MarkdownPreview } from "~/components/MarkdownPreview";
import { api } from "~/trpc/react";

interface MarkdownFileEditorProps {
  workspaceId: string;
  filePath: string;
  initialContent: string;
  className?: string;
}

export function MarkdownFileEditor({
  workspaceId,
  filePath,
  initialContent,
  className,
}: MarkdownFileEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // 更新文件内容的mutation
  const updateFileMutation = api.workspace.updateFileContent.useMutation({
    onSuccess: () => setIsSaving(false),
    onError: () => setIsSaving(false),
  });

  // 使用文件路径和内容的组合作为key，确保文件切换时编辑器重新创建
  const editorKey = `${filePath}-${initialContent?.slice(0, 100) || ""}`;

  const {
    editor,
    hasUnsavedChange,
    handleDocChange,
    getMarkdown,
    reset,
    wordCount,
    currentMarkdown,
  } = useMarkdownEditor(initialContent);

  // 保存文件
  const saveFile = useCallback(async () => {
    if (hasUnsavedChange && !isSaving) {
      setIsSaving(true);
      const markdown = getMarkdown();
      void updateFileMutation.mutateAsync({
        workspaceId,
        filePath,
        content: markdown,
      });
    }
  }, [
    hasUnsavedChange,
    isSaving,
    getMarkdown,
    updateFileMutation,
    workspaceId,
    filePath,
  ]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChange && !isSaving) {
          void saveFile();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChange, isSaving, saveFile]);

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white dark:bg-gray-950",
        className,
      )}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "edit" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("edit")}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            编辑
          </Button>
          <Button
            variant={viewMode === "preview" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("preview")}
          >
            <Eye className="mr-2 h-4 w-4" />
            预览
          </Button>
          {viewMode === "edit" && (
            <>
              <Button
                onClick={saveFile}
                disabled={!hasUnsavedChange || isSaving}
                size="sm"
                variant="outline"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "保存中..." : hasUnsavedChange ? "保存" : "已保存"}
              </Button>
              {hasUnsavedChange && (
                <Button onClick={reset} size="sm" variant="ghost">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  重置
                </Button>
              )}
            </>
          )}
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <span>{wordCount} 词</span>
          <span>{currentMarkdown.length} 字符</span>
          {viewMode === "edit" && hasUnsavedChange && (
            <span className="text-orange-600">未保存</span>
          )}
          {viewMode === "edit" && <span className="text-xs">Ctrl+S 保存</span>}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {viewMode === "edit" ? (
          editor ? (
            <ProseEditor
              key={editorKey}
              editor={editor}
              onChange={handleDocChange}
              placeholder="开始编写您的 Markdown 文档..."
              className="text-sm **:text-base [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-2 [&_code]:py-0.5 dark:[&_code]:bg-gray-800 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-100 [&_pre]:p-4 dark:[&_pre]:bg-gray-800 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-4 [&_td]:py-2 [&_th]:border [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_ul]:my-2 [&_ul]:ml-6 [&_ul]:list-disc"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground">加载编辑器中...</span>
            </div>
          )
        ) : (
          <div className="p-6">
            <MarkdownPreview content={currentMarkdown} className="max-w-none" />
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="bg-muted/30 border-t px-4 py-1">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{filePath}</span>
          <span>Markdown</span>
        </div>
      </div>
    </div>
  );
}

export default MarkdownFileEditor;
