"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { cn } from "~/lib/utils";

interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
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
}

export function FileTreeItem({
  item,
  level = 0,
  onSelect,
  selectedPath
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.hasChildren && (item.children && item.children.length > 0);

  const handleToggle = () => {
    if (item.type === 'directory' && hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (onSelect) {
      onSelect(item);
    }
  };

  const getFileIcon = () => {
    if (item.type === 'directory') {
      return isExpanded ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      );
    }
    return <File className="h-4 w-4" />;
  };

  const getFolderIcon = () => {
    if (item.type === 'directory') {
      return <Folder className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <div>
      <div
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-sm hover:bg-accent",
          selectedPath === item.path && "bg-accent",
          level > 0 && `pl-${2 + level * 4}`
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={handleToggle}
      >
        {item.type === 'directory' && (
          <span className="mr-1">{getFileIcon()}</span>
        )}
        <span className="mr-1">{getFolderIcon()}</span>
        <span className="flex-1 truncate">{item.name}</span>
      </div>
      {item.type === 'directory' && isExpanded && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}