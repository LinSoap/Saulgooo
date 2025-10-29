"use client";

import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import { defineBasicExtension } from "prosekit/basic";
import { createEditor, jsonFromHTML, type Editor } from "prosekit/core";
import { useCallback, useEffect, useState } from "react";
import { useDocChange, ProseKit } from "prosekit/react";
import { Button } from "~/components/ui/button";
import { Save, RotateCcw, Edit3, Eye } from "lucide-react";
import { cn } from "~/lib/utils";
import { markdownFromHTML, htmlFromMarkdown } from "~/lib/markdown";
import { MarkdownPreview } from "~/components/MarkdownPreview";
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
}

export function MarkdownFileEditorSimple({
  workspaceId,
  filePath,
  initialContent,
  className,
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
      {/* 工具栏 */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "preview" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("preview")}
          >
            <Eye className="mr-2 h-4 w-4" />
            预览
          </Button>
          <Button
            variant={viewMode === "edit" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("edit")}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            编辑
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
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="ghost"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  刷新
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

export default MarkdownFileEditorSimple;
