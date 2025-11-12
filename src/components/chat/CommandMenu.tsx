"use client";

import type { BasicExtension } from "prosekit/basic";
import { useEditor } from "prosekit/react";
import {
  AutocompleteEmpty,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopover,
} from "prosekit/react/autocomplete";
import { Slash } from "lucide-react";
import { cn } from "~/lib/utils";

interface CommandMenuProps {
  commands: string[];
  onCommandSelect?: (command: string) => void;
  onCommandSelected?: () => void;
}

export function CommandMenu({ commands, onCommandSelect, onCommandSelected }: CommandMenuProps) {
  const editor = useEditor<BasicExtension>();

  const handleCommandInsert = (command: string) => {
    if (!editor) return;

    // 使用 insertText 插入命令
    editor.commands.insertText({ text: `/${command} ` });

    // 调用外部回调
    onCommandSelect?.(command);

    // 通知父组件命令已被选中
    onCommandSelected?.();
  };

  return (
    <AutocompletePopover
      regex={/\/[\p{L}\p{N}_-]*$/u}
      className="relative z-50 box-border block max-h-80 min-w-80 overflow-auto rounded-lg border border-gray-200 bg-white whitespace-nowrap shadow-lg select-none dark:border-gray-800 dark:bg-gray-950"
    >
      <AutocompleteList>
        <AutocompleteEmpty
          className={cn(
            "relative box-border flex min-w-72 cursor-default scroll-my-1 items-center justify-between rounded-sm px-3 py-2 whitespace-nowrap outline-hidden select-none",
            "data-focused:bg-gray-100 dark:data-focused:bg-gray-800",
          )}
        >
          <span className="text-muted-foreground text-sm">
            {commands.length === 0 ? "无可用命令" : "输入命令名称..."}
          </span>
        </AutocompleteEmpty>

        {commands.map((command) => (
          <AutocompleteItem
            key={command}
            value={`/${command}`}
            className={cn(
              "relative box-border flex min-w-72 cursor-default scroll-my-1 items-center gap-2 rounded-sm px-3 py-2 whitespace-nowrap outline-hidden select-none",
              "data-focused:bg-gray-100 dark:data-focused:bg-gray-800",
            )}
            onSelect={() => handleCommandInsert(command)}
          >
            <div className="text-muted-foreground shrink-0">
              <Slash className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center">
                <span className="truncate text-sm font-medium">
                  {command}
                </span>
              </div>
              <div className="mt-0.5">
                <span className="text-muted-foreground text-xs">
                  执行 /{command} 命令
                </span>
              </div>
            </div>
          </AutocompleteItem>
        ))}
      </AutocompleteList>
    </AutocompletePopover>
  );
}