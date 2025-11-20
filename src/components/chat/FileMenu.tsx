"use client";

import type { MentionExtension } from "prosekit/extensions/mention";
import type { BasicExtension } from "prosekit/basic";
import type { Union } from "prosekit/core";
import { useEditor } from "prosekit/react";
import {
  AutocompleteEmpty,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopover,
} from "prosekit/react/autocomplete";
import { FileIcon, FileText, Image, Film, Music, Code } from "lucide-react";
import { cn } from "~/lib/utils";
import { formatFileSize } from "~/lib/file";

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  modifiedAt: string;
}

interface FileMenuProps {
  files: FileItem[];
  loading?: boolean;
  onQueryChange?: (query: string) => void;
  onOpenChange?: (open: boolean) => void;
  onFileSelected?: () => void;
}

export function FileMenu({
  files,
  loading,
  onQueryChange,
  onOpenChange,
  onFileSelected,
}: FileMenuProps) {
  const editor = useEditor<Union<[MentionExtension, BasicExtension]>>();

  const handleFileInsert = (file: FileItem) => {
    if (!editor) return;

    // 插入 mention
    editor.commands.insertMention({
      id: file.path,
      value: `@${file.name}`,
      kind: "file",
    });

    // 在后面插入一个空格
    editor.commands.insertText({ text: " " });

    // 关闭自动完成菜单
    if (onOpenChange) {
      onOpenChange(false);
    }

    // 通知父组件文件已被选中
    if (onFileSelected) {
      onFileSelected();
    }
  };

  // 根据文件类型获取图标
  const getFileIcon = (fileName: string, mimeType: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (mimeType.startsWith("image/")) {
      return (
        <div role="img" aria-label="Image file">
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className="h-4 w-4" />
        </div>
      );
    }
    if (mimeType.startsWith("video/")) {
      return <Film className="h-4 w-4" />;
    }
    if (mimeType.startsWith("audio/")) {
      return <Music className="h-4 w-4" />;
    }
    if (
      mimeType.startsWith("text/") ||
      [
        "js",
        "ts",
        "jsx",
        "tsx",
        "json",
        "xml",
        "html",
        "css",
        "md",
        "py",
        "java",
        "cpp",
        "c",
      ].includes(extension ?? "")
    ) {
      return <Code className="h-4 w-4" />;
    }
    if (
      mimeType.includes("document") ||
      ["pdf", "doc", "docx"].includes(extension ?? "")
    ) {
      return <FileText className="h-4 w-4" />;
    }

    return <FileIcon className="h-4 w-4" />;
  };

  
  return (
    <AutocompletePopover
      regex={/@[\p{L}\p{N}_-]*$/u}
      className="relative z-50 box-border block max-h-80 min-w-80 overflow-auto rounded-lg border border-gray-200 bg-white whitespace-nowrap shadow-lg select-none dark:border-gray-800 dark:bg-gray-950"
      style={{ position: 'absolute', bottom: '100%', marginBottom: '0.25rem' }}
      onQueryChange={onQueryChange}
      onOpenChange={onOpenChange}
    >
      <AutocompleteList>
        <AutocompleteEmpty
          className={cn(
            "relative box-border flex min-w-72 cursor-default scroll-my-1 items-center justify-between rounded-sm px-3 py-2 whitespace-nowrap outline-hidden select-none",
            "data-focused:bg-gray-100 dark:data-focused:bg-gray-800",
          )}
        >
          <span className="text-muted-foreground text-sm">
            {loading
              ? "搜索文件中..."
              : files.length === 0
                ? "无匹配的文件"
                : ""}
          </span>
        </AutocompleteEmpty>

        {files.map((file) => (
          <AutocompleteItem
            key={file.id}
            className={cn(
              "relative box-border flex min-w-72 cursor-default scroll-my-1 items-center gap-2 rounded-sm px-3 py-2 whitespace-nowrap outline-hidden select-none",
              "data-focused:bg-gray-100 dark:data-focused:bg-gray-800",
              loading && "opacity-50",
            )}
            onSelect={() => handleFileInsert(file)}
          >
            <div className="text-muted-foreground shrink-0">
              {getFileIcon(file.name, file.type)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span
                  className="truncate text-sm font-medium"
                  title={file.name}
                >
                  {file.name}
                </span>
                <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                  {formatFileSize(file.size)}
                </span>
              </div>

              <div className="mt-0.5 flex items-center justify-between">
                <span
                  className="text-muted-foreground truncate text-xs"
                  title={file.path}
                >
                  {file.path}
                </span>
              </div>
            </div>
          </AutocompleteItem>
        ))}
      </AutocompleteList>
    </AutocompletePopover>
  );
}
