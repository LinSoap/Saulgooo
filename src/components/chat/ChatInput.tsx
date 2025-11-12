"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { ProseKit, useDocChange } from "prosekit/react";
import { createEditor, type Editor } from "prosekit/core";
import { defineChatExtension } from "~/lib/prosekit-extensions";
import { FileMenu } from "./FileMenu";
import { CommandMenu } from "./CommandMenu";
import { useFileQuery } from "~/hooks/use-file-query";
import { cn } from "~/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  workspaceId: string;
  placeholder?: string;
  className?: string;
  slashCommands?: string[];
}

// 编辑器内部组件，用于访问 ProseKit 上下文
function EditorContent({
  editor,
  onChange,
  placeholder,
}: {
  editor: Editor;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  useDocChange(
    () => {
      const text = editor.view.state.doc.textContent;
      onChange(text);
    },
    { editor },
  );

  return (
    <div
      ref={editor.mount}
      className="ProseMirror outline-none **:outline-none"
      suppressContentEditableWarning
      style={{ minHeight: "24px" }}
      data-placeholder={placeholder}
    />
  );
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  isLoading,
  workspaceId,
  placeholder = "输入您的问题...",
  className,
  slashCommands = [],
}: ChatInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [justSelectedFromAutocomplete, setJustSelectedFromAutocomplete] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useMemo(() => {
    return createEditor({
      extension: defineChatExtension(),
    });
  }, []);

  // 同步外部 value 变化到编辑器
  useEffect(() => {
    const currentText = editor.view.state.doc.textContent;
    if (value !== currentText) {
      // 使用 setDocContent 更新编辑器内容
      editor.view.dispatch(
        editor.view.state.tr
          .delete(0, editor.view.state.doc.content.size)
          .insertText(value, 0),
      );
    }
  }, [value, editor]);

  const { loading, files } = useFileQuery({
    workspaceId,
    query: query.replace("@", ""), // 移除 @ 符号进行搜索
    enabled: open && !!query,
  });

  const handleSend = () => {
    const currentText = editor.view.state.doc.textContent;
    if (!currentText.trim() || disabled || isLoading) return;

    // 清空编辑器
    editor.view.dispatch(
      editor.view.state.tr.delete(0, editor.view.state.doc.content.size),
    );

    // 调用发送回调
    onSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // 如果刚刚从自动完成菜单选择了项目，不发送消息
      if (justSelectedFromAutocomplete) {
        setJustSelectedFromAutocomplete(false);
        return;
      }

      handleSend();
    }
  };

  
  return (
    <div className={cn("relative", className)}>
      <ProseKit editor={editor}>
        <div
          ref={editorRef}
          className={cn(
            "border-input bg-background ring-offset-background relative max-h-32 min-h-10 overflow-y-auto rounded-md border pl-3 pr-12 py-2 text-sm",
            "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2 focus-within:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onKeyDown={handleKeyDown}
        >
          <EditorContent
            editor={editor}
            onChange={onChange}
            placeholder={placeholder}
          />
        </div>

        <FileMenu
          files={files}
          loading={loading}
          onQueryChange={setQuery}
          onOpenChange={setOpen}
          onFileSelected={() => setJustSelectedFromAutocomplete(true)}
        />

        <CommandMenu
          commands={slashCommands}
          onCommandSelected={() => setJustSelectedFromAutocomplete(true)}
        />
      </ProseKit>

      <Button
        onClick={handleSend}
        disabled={
          (value ?? "").trim().length === 0 ||
          Boolean(disabled) ||
          Boolean(isLoading)
        }
        size="icon"
        className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
