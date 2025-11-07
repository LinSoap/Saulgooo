"use client";

import { useState, useRef, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Trash2,
  Edit3,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  ContextMenu,
  type ContextMenuOption,
} from "~/components/ui/context-menu";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { buildNewPath } from "~/lib/file";

interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: Date;
  createdAt: Date;
  extension?: string;
  children?: FileTreeItem[];
  hasChildren?: boolean;
}

interface FileTreeItemProps {
  item: FileTreeItem;
  level?: number;
  onSelect?: (item: FileTreeItem) => void;
  selectedPath?: string;
  workspaceId: string;
  onFileDeleted?: () => void;
}

export function FileTreeItem({
  item,
  level = 0,
  onSelect,
  selectedPath,
  workspaceId,
  onFileDeleted,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    options: ContextMenuOption[];
  } | null>(null);
  const [operation, setOperation] = useState<{
    type: "delete" | "rename" | null;
    item: FileTreeItem | null;
    value?: string;
  }>({ type: null, item: null });
  const [newName, setNewName] = useState("");

  const hasChildren =
    item.hasChildren && item.children && item.children.length > 0;
  const isDirectory = item.type === "directory";

  const itemRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const deleteFileMutation = api.workspace.deleteFile.useMutation();
  const renameFileMutation = api.workspace.renameFile.useMutation();

  const handleDelete = useCallback(
    async (item: FileTreeItem) => {
      try {
        await deleteFileMutation.mutateAsync({
          workspaceId,
          path: item.path,
        });
        toast.success(
          `成功删除${item.type === "directory" ? "文件夹" : "文件"}: ${item.name}`,
        );
        onFileDeleted?.();
        return true;
      } catch (error) {
        toast.error(
          `删除失败: ${error instanceof Error ? error.message : "未知错误"}`,
        );
        return false;
      }
    },
    [workspaceId, deleteFileMutation, onFileDeleted],
  );

  const handleRename = useCallback(
    async (item: FileTreeItem, newName: string) => {
      if (!newName.trim()) {
        toast.error("名称不能为空");
        return false;
      }

      if (newName.includes("/") || newName.includes("\\")) {
        toast.error("名称不能包含斜杠");
        return false;
      }

      const newPath = buildNewPath(item.path, newName);

      if (item.path === newPath) {
        return true;
      }

      try {
        await renameFileMutation.mutateAsync({
          workspaceId,
          oldPath: item.path,
          newPath,
        });
        toast.success(`已将 "${item.name}" 重命名为 "${newName}"`);
        onFileDeleted?.();
        return true;
      } catch (error) {
        toast.error(
          `重命名失败: ${error instanceof Error ? error.message : "未知错误"}`,
        );
        return false;
      }
    },
    [workspaceId, renameFileMutation, onFileDeleted],
  );

  const handleToggle = () => {
    if (isDirectory) {
      // 所有文件夹都可以展开/折叠
      setIsExpanded(!isExpanded);
    } else if (onSelect) {
      // 只有文件才触发 onSelect
      onSelect(item);
    }
  };

  const startRenaming = useCallback(() => {
    setOperation({
      type: "rename",
      item,
    });
    setNewName(item.name);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [item]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const rect = itemRef.current?.getBoundingClientRect();
      if (!rect) return;

      const options: ContextMenuOption[] = [
        {
          label: "重命名",
          icon: <Edit3 className="h-4 w-4" />,
          onClick: startRenaming,
        },
        {
          label: "删除",
          icon: <Trash2 className="h-4 w-4" />,
          className: "text-destructive focus:text-destructive",
          onClick: () => setOperation({ type: "delete", item }),
        },
      ];

      setContextMenu({
        x: rect.left + rect.width / 2 - 80,
        y: rect.top,
        options,
      });
    },
    [startRenaming, item],
  );

  const executeOperation = useCallback(async () => {
    if (operation.type === "delete" && operation.item) {
      const success = await handleDelete(operation.item);
      if (success) {
        setOperation({ type: null, item: null });
      }
    }
  }, [operation.type, operation.item, handleDelete, setOperation]);

  const handleRenameSubmit = useCallback(async () => {
    if (operation.type === "rename" && operation.item) {
      // 直接使用 newName，不依赖 operation.value
      const success = await handleRename(operation.item, newName);
      if (success) {
        setOperation({ type: null, item: null });
        setNewName("");
      }
    }
  }, [operation.type, operation.item, newName, handleRename]);

  const getFileIcon = () => {
    if (isDirectory) {
      return isExpanded ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      );
    }
    return <File className="h-4 w-4" />;
  };

  const getFolderIcon = () => {
    if (isDirectory) {
      return <Folder className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <>
      <div
        ref={itemRef}
        className={cn(
          "hover:bg-accent flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-sm",
          selectedPath === item.path && "bg-accent",
          level > 0 && `pl-${2 + level * 4}`,
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
      >
        {isDirectory && <span className="mr-1">{getFileIcon()}</span>}
        <span className="mr-1">{getFolderIcon()}</span>
        <span className="flex-1 truncate">
          {operation.type === "rename" && operation.item?.id === item.id ? (
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleRenameSubmit();
                } else if (e.key === "Escape") {
                  setOperation({ type: null, item: null });
                  setNewName(item.name);
                }
              }}
              className="ring-ring ring-ring-offset-2 ring-offset-background w-full rounded bg-transparent px-1 ring-2 outline-none"
              autoFocus
            />
          ) : (
            item.name
          )}
        </span>
      </div>
      {isDirectory && isExpanded && (
        <div>
          {hasChildren &&
            item.children?.map((child) => (
              <FileTreeItem
                key={child.id}
                item={child}
                level={level + 1}
                onSelect={onSelect}
                selectedPath={selectedPath}
                workspaceId={workspaceId}
                onFileDeleted={onFileDeleted}
              />
            ))}
          {!hasChildren && (
            <div
              className="text-muted-foreground py-2 pr-2 pl-4 text-xs italic"
              style={{ paddingLeft: `${8 + (level + 1) * 16}px` }}
            >
              空文件夹
            </div>
          )}
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          options={contextMenu.options}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={operation.type === "delete"}
        onClose={() => setOperation({ type: null, item: null })}
        onConfirm={executeOperation}
        title={`确认删除${operation.item?.type === "directory" ? "文件夹" : "文件"}`}
        description={
          <>
            确定要删除{operation.item?.type === "directory" ? "文件夹" : "文件"}{" "}
            &ldquo;{operation.item?.name}&rdquo;吗？
            {operation.item?.type === "directory" && (
              <div className="text-destructive mt-1">
                警告：删除文件夹将同时删除其中所有内容！
              </div>
            )}
          </>
        }
        confirmLabel="删除"
        dangerous
      />
    </>
  );
}
