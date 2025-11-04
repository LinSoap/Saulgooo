"use client";

import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import { defineBasicExtension } from "prosekit/basic";
import { createEditor, jsonFromHTML, type Editor } from "prosekit/core";
import { useCallback, useEffect, useState } from "react";
import { useDocChange, ProseKit } from "prosekit/react";
import { cn } from "~/lib/utils";
import { markdownFromHTML, htmlFromMarkdown } from "~/lib/markdown";
import { MarkdownPreview } from "~/components/shared/MarkdownPreview";
import { FilePreviewHeader } from "~/components/ui/file-preview-header";
import { api } from "~/trpc/react";

function EditorWrapper({
  editor,
  onChange,
}: {
  editor: Editor | null | undefined;
  onChange: () => void;
}) {
  useDocChange(onChange, { editor: editor ?? undefined });

  if (!editor) return null;

  return (
    <div
      ref={editor?.mount}
      className="ProseMirror min-h-full px-6 py-8 text-sm outline-none md:px-[max(4rem,calc(50%-20rem))] [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-2 [&_code]:py-0.5 dark:[&_code]:bg-gray-800 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-100 [&_pre]:p-4 dark:[&_pre]:bg-gray-800 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-4 [&_td]:py-2 [&_th]:border [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_ul]:my-2 [&_ul]:ml-6 [&_ul]:list-disc"
    />
  );
}

interface MarkdownFileEditorProps {
  workspaceId: string;
  filePath: string;
  initialContent: string;
  className?: string;
  fileName?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function MarkdownEditor({
  workspaceId,
  filePath,
  initialContent,
  className,
  fileName,
  onRefresh,
  isRefreshing = false,
}: MarkdownFileEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [hasUnsavedChange, setHasUnsavedChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");
  const [currentMarkdown, setCurrentMarkdown] = useState(initialContent);

  // 更新文件内容的mutation
  const updateFileMutation = api.workspace.updateFileContent.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setHasUnsavedChange(false);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  // 初始化编辑器
  useEffect(() => {
    if (typeof window === "undefined") return;

    const extension = defineBasicExtension();
    let parsedContent = undefined;

    // 解析初始内容
    if (initialContent?.trim()) {
      try {
        const html = htmlFromMarkdown(initialContent);
        const tempEditor = createEditor({ extension });
        parsedContent = jsonFromHTML(html, { schema: tempEditor.schema });
        // ProseKit编辑器不需要手动销毁临时实例
      } catch (error) {
        console.error("Failed to parse initial content:", error);
      }
    }

    // 创建编辑器实例
    const editorInstance = createEditor({
      extension,
      defaultContent: parsedContent,
    });

    setEditor(editorInstance);
    setCurrentMarkdown(initialContent);

    // 清理函数
    return () => {
      // ProseKit会自动处理清理
    };
  }, [initialContent, filePath]); // 添加filePath依赖确保切换文件时重新创建

  // 处理内容变化
  const handleDocChange = useCallback(() => {
    setHasUnsavedChange(true);
  }, []);

  // 保存文件
  const saveFile = useCallback(async () => {
    if (hasUnsavedChange && !isSaving && editor) {
      setIsSaving(true);
      const html = editor.getDocHTML();
      const markdown = markdownFromHTML(html);
      setCurrentMarkdown(markdown);

      void updateFileMutation.mutateAsync({
        workspaceId,
        filePath,
        content: markdown,
      });
    }
  }, [
    hasUnsavedChange,
    isSaving,
    editor,
    updateFileMutation,
    filePath,
    workspaceId,
  ]);

  // 下载文件
  const downloadFile = useCallback(() => {
    const content = currentMarkdown;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName ?? "download.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentMarkdown, fileName]);

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

  // 获取字数
  const wordCount = currentMarkdown
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white dark:bg-gray-950",
        className,
      )}
    >
      {/* Header */}
      <FilePreviewHeader
        fileName={fileName ?? ""}
        filePath={filePath}
        mimeType="text/markdown"
        readOnly={false}
        isSaving={isSaving}
        hasUnsavedChange={hasUnsavedChange}
        isRefreshing={isRefreshing}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSave={saveFile}
        onRefresh={onRefresh}
        onDownload={downloadFile}
        onRevert={() => window.location.reload()}
        wordCount={wordCount}
        charCount={currentMarkdown.length}
      />

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {viewMode === "edit" ? (
          editor ? (
            <ProseKit editor={editor}>
              <div className="relative h-full w-full overflow-y-auto">
                <EditorWrapper editor={editor} onChange={handleDocChange} />
              </div>
            </ProseKit>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground">加载编辑器中...</span>
            </div>
          )
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="px-6 py-8 md:px-[max(4rem,calc(50%-20rem))]">
              <MarkdownPreview
                content={currentMarkdown}
                className="max-w-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MarkdownEditor;
