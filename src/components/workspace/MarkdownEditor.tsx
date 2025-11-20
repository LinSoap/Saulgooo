"use client";

import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";

import { defineBasicExtension } from "prosekit/basic";
import { createEditor, jsonFromHTML, type Editor } from "prosekit/core";
import { useCallback, useEffect, useState } from "react";
import { useDocChange, ProseKit } from "prosekit/react";
import { useParams, useSearchParams } from "next/navigation";
import { cn } from "~/lib/utils";
import { markdownFromHTML, htmlFromMarkdown } from "~/lib/markdown";
import { MarkdownPreview } from "~/components/shared/MarkdownPreview";
import type { FileData } from "~/lib/file";
import { Eye, Code2, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "~/trpc/react";

// 编辑器内容组件 - 必须在 ProseKit 上下文中
function EditorContent({
  editor,
  onDocChange,
}: {
  editor: Editor | null;
  onDocChange: () => void;
}) {
  useDocChange(onDocChange, { editor: editor ?? undefined });

  if (!editor) return null;

  return (
    <div
      ref={editor?.mount}
      className="ProseMirror w-full max-w-3xl px-6 py-8 pb-20 text-sm outline-none [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-2 [&_code]:py-0.5 dark:[&_code]:bg-gray-800 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-100 [&_pre]:p-4 dark:[&_pre]:bg-gray-800 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:px-4 [&_td]:py-2 [&_th]:border [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_ul]:my-2 [&_ul]:ml-6 [&_ul]:list-disc"
    />
  );
}

interface MarkdownEditorProps {
  fileData: FileData;
}

export function MarkdownEditor({ fileData }: MarkdownEditorProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const filePath = searchParams?.get("file") ?? "";
  const workspaceId = params.id as string;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [hasUnsavedChange, setHasUnsavedChange] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("preview");
  const [currentMarkdown, setCurrentMarkdown] = useState<string>("");

  const saveFileMutation = api.file.saveFileContent.useMutation();

  // 处理文档变化
  const handleDocChange = useCallback(() => {
    setHasUnsavedChange(true);
  }, []);

  // 初始化编辑器
  useEffect(() => {
    if (typeof window === "undefined") return;

    const extension = defineBasicExtension();
    let parsedContent = undefined;

    // 从 fileData 获取初始内容
    const initialContent =
      fileData.encoding === "utf-8"
        ? (fileData.content ?? "")
        : atob(fileData.content ?? "");

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
  }, [fileData]);

  // 保存文件
  const saveFile = useCallback(async () => {
    if (!hasUnsavedChange) {
      toast.info("没有更改内容");
      return;
    }

    if (isSaving) {
      toast.info("正在保存中...");
      return;
    }

    if (!editor) {
      toast.error("编辑器未准备好");
      return;
    }

    setIsSaving(true);
    try {
      const html = editor.getDocHTML();
      const markdown = markdownFromHTML(html);
      setCurrentMarkdown(markdown);

      await saveFileMutation.mutateAsync({
        workspaceId,
        filePath,
        content: markdown,
        encoding: "utf-8",
      });

      setHasUnsavedChange(false);
      toast.success("文件保存成功");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("文件保存失败");
    } finally {
      setIsSaving(false);
    }
  }, [
    hasUnsavedChange,
    isSaving,
    editor,
    workspaceId,
    filePath,
    saveFileMutation,
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
    <div className={cn("flex h-full flex-col bg-white dark:bg-gray-950")}>
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-6">
        <div className="flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
          <button
            onClick={() => setViewMode("edit")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              viewMode === "edit"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:bg-white/50 hover:text-gray-900",
            )}
          >
            <Code2 className="h-4 w-4" />
            <span>编辑</span>
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              viewMode === "preview"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:bg-white/50 hover:text-gray-900",
            )}
          >
            <Eye className="h-4 w-4" />
            <span>预览</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs text-gray-400 transition-opacity",
              isSaving ? "opacity-100" : "opacity-0",
            )}
          >
            {isSaving ? "保存中..." : "已保存"}
          </span>
          <button
            onClick={() => void saveFile()}
            disabled={!hasUnsavedChange || isSaving}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              hasUnsavedChange
                ? "bg-black text-white hover:bg-gray-800"
                : "cursor-not-allowed bg-gray-100 text-gray-400",
            )}
            title="Save"
          >
            <Save className="h-4 w-4" />
            <span>保存</span>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {viewMode === "edit" ? (
        <div className="flex flex-1 justify-center overflow-y-auto bg-white">
          {editor ? (
            <ProseKit editor={editor}>
              <EditorContent editor={editor} onDocChange={handleDocChange} />
            </ProseKit>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground">加载编辑器中...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 justify-center overflow-y-auto bg-white">
          <div className="w-full max-w-3xl px-6 pb-20">
            <MarkdownPreview content={currentMarkdown} />
          </div>
        </div>
      )}
    </div>
  );
}

export default MarkdownEditor;
