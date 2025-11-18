"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { ArrowLeft, FolderOpen, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileTreeItem } from "~/components/shared/FileTreeItem";
import { useSession } from "next-auth/react";
import { useRef } from "react";
import { toast } from "sonner";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useFileWatcher } from "~/hooks/use-file-watcher";
import {
  ContextMenu,
  type ContextMenuOption,
} from "~/components/ui/context-menu";

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: Date;
  createdAt: Date;
  extension?: string;
  children?: FileNode[];
  hasChildren?: boolean;
}

export default function FileBrowser() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.id as string;
  const { data: session } = useSession();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadDirectory, setUploadDirectory] = useState("");
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] =
    useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [createFolderDirectory, setCreateFolderDirectory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 空白区域右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    options: ContextMenuOption[];
  } | null>(null);

  // 从URL获取当前选中的文件
  const currentFilePath = searchParams.get("file");
  const selectedFile = currentFilePath
    ? ({ path: currentFilePath } as FileNode)
    : null;

  // 获取工作空间信息
  const { data: workspace } = api.workspace.getWorkSpaceById.useQuery(
    { workspaceId },
    { enabled: !!session?.user },
  );

  // 获取文件树
  const {
    data: fileTreeData,
    isLoading: isFileTreeLoading,
    isFetching: isFileTreeFetching,
    error: fileTreeError,
    refetch: refetchFileTree,
  } = api.file.getFileTree.useQuery({
    workspaceId: workspaceId,
  });

  // 使用文件监听
  useFileWatcher(
    workspaceId,
    // 文件树变化回调
    () => {
      void refetchFileTree();
    },
  );

  // 处理文件选择（从文件树选择）
  const handleFileTreeSelect = (file: FileNode) => {
    // 更新URL参数
    const newParams = new URLSearchParams(searchParams.toString());
    if (file.type === "file" && file.path) {
      newParams.set("file", file.path);
    } else {
      newParams.delete("file");
    }
    // 使用查询参数，URL格式应该是: /workspace/[id]?file=[filePath]&sessionId=[sessionId]
    const newUrl = `/workspace/${workspaceId}?${newParams.toString()}`;
    router.push(newUrl);
  };

  // 上传文件
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const reader = new FileReader();

      await new Promise<void>((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64 = e.target?.result as string;
            const content = base64.split(",")[1]; // 去掉data:mime;base64,前缀
            if (!content) {
              throw new Error("Failed to read file content");
            }

            // 构建文件路径
            const filePath = uploadDirectory
              ? `${uploadDirectory}/${file.name}`
              : file.name;

            // 使用 tRPC mutation 上传文件
            uploadFileMutation.mutate({
              workspaceId,
              filePath,
              content,
              encoding: "base64",
              mimeType: file.type,
            });

            resolve();
          } catch (error) {
            reject(
              new Error(
                error instanceof Error ? error.message : "Upload failed",
              ),
            );
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        `上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 上传文件的 mutation
  const uploadFileMutation = api.file.uploadFile.useMutation({
    onSuccess: () => {
      void refetchFileTree();
      setIsUploadDialogOpen(false);
      setUploadDirectory("");
      toast.success(`文件上传成功！`);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(`上传失败: ${error.message}`);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // 创建文件夹的 mutation
  const createFolderMutation = api.file.createFolder.useMutation({
    onSuccess: () => {
      void refetchFileTree();
      setIsCreateFolderDialogOpen(false);
      setNewFolderName("");
      setCreateFolderDirectory("");
      toast.success(`文件夹 "${newFolderName}" 创建成功！`);
    },
    onError: (error) => {
      console.error("Create folder error:", error);
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 创建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("文件夹名不能为空");
      return;
    }

    if (newFolderName.includes("/") || newFolderName.includes("\\")) {
      toast.error("文件夹名不能包含斜杠");
      return;
    }

    const folderPath = createFolderDirectory
      ? `${createFolderDirectory}/${newFolderName}`
      : newFolderName;

    createFolderMutation.mutate({
      workspaceId,
      folderPath,
    });
  };

  // 打开创建文件夹对话框
  const openCreateFolderDialog = (directory?: string) => {
    setCreateFolderDirectory(directory ?? "");
    setIsCreateFolderDialogOpen(true);
  };

  // 处理上传到指定文件夹
  const handleUploadToFolder = (folderPath: string) => {
    setUploadDirectory(folderPath);
    setIsUploadDialogOpen(true);
  };

  // 处理下载文件
  const handleDownloadFile = async (filePath: string) => {
    try {
      // 使用统一的下载路径
      const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
      const downloadUrl = `/api/oss/${workspaceId}/${encodedPath}?download=true`;

      // 触发下载
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filePath.split("/").pop() ?? "file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("文件已开始下载");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("下载失败");
    }
  };

  // 获取所有文件夹路径
  const getAllFolderPaths = (items: FileNode[]): string[] => {
    const paths: string[] = [];

    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "directory") {
          // node.path 已经是完整路径，直接使用
          paths.push(node.path);
          if (node.children) {
            traverse(node.children);
          }
        }
      }
    };

    traverse(items);
    return paths.sort();
  };

  // 处理空白区域右键菜单
  const handleBlankContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // 获取当前选中的文件的目录
    const getCurrentDirectory = () => {
      if (selectedFile?.path) {
        // 如果是文件，获取其所在目录
        const lastSlashIndex = selectedFile.path.lastIndexOf("/");
        if (lastSlashIndex > 0) {
          return selectedFile.path.substring(0, lastSlashIndex);
        }
        // 如果在根目录，返回空字符串
        return "";
      }
      return "";
    };

    const currentDir = getCurrentDirectory();

    const options: ContextMenuOption[] = [
      {
        label: "刷新",
        icon: <RefreshCw className="h-4 w-4" />,
        onClick: () => {
          void refetchFileTree({ cancelRefetch: true });
        },
      },
      {
        label: "上传文件",
        icon: <Upload className="h-4 w-4" />,
        onClick: () => {
          setUploadDirectory(currentDir);
          setIsUploadDialogOpen(true);
        },
      },
      {
        label: "新建文件夹",
        icon: <FolderOpen className="h-4 w-4" />,
        onClick: () => {
          openCreateFolderDialog(currentDir);
        },
      },
    ];

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      options,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-2 py-4">
        <div className="flex h-8 items-center gap-1">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
          </Link>
          {workspace && (
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{workspace.name}</h3>
              <p className="text-muted-foreground truncate text-xs">
                {workspace.description}
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => {
              void refetchFileTree({ cancelRefetch: true });
            }}
            disabled={isFileTreeFetching}
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${isFileTreeFetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <Upload className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-2xl">
              <DialogHeader>
                <DialogTitle>上传文件</DialogTitle>
                <DialogDescription>
                  选择文件上传到工作区
                  {uploadDirectory && (
                    <span className="text-muted-foreground">
                      （目标目录：
                      <code className="bg-muted rounded px-1 py-0.5 text-xs">
                        {uploadDirectory}
                      </code>
                      ）
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="directory">目标目录</Label>
                  <Select
                    value={uploadDirectory || "__root__"}
                    onValueChange={(value) =>
                      setUploadDirectory(value === "__root__" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择目标目录（留空为根目录）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__root__">根目录</SelectItem>
                      {fileTreeData?.tree &&
                        getAllFolderPaths(fileTreeData.tree).map((path) => (
                          <SelectItem key={path} value={path}>
                            {path}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>选择文件</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="h-20 border-dashed"
                  >
                    <div className="text-center">
                      <Upload className="mx-auto mb-2 h-6 w-6" />
                      <p>
                        {isUploading ? "上传中..." : "点击选择文件或拖拽到此处"}
                      </p>
                    </div>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      void handleFileSelect(e);
                    }}
                    className="hidden"
                    multiple={false}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                  disabled={isUploading}
                >
                  取消
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* File Tree */}
      <div
        className="flex-1 overflow-hidden"
        onContextMenu={handleBlankContextMenu}
      >
        <ScrollArea className="h-full">
          <div className="space-y-2 p-4 text-sm">
            {isFileTreeLoading ? (
              <div className="text-muted-foreground py-8 text-center">
                <p>加载中...</p>
              </div>
            ) : fileTreeError ? (
              <div className="text-destructive py-8 text-center">
                <p>加载文件树失败</p>
              </div>
            ) : fileTreeData?.tree && fileTreeData.tree.length > 0 ? (
              <div>
                {fileTreeData.tree.map((item) => (
                  <FileTreeItem
                    key={item.id}
                    item={item}
                    onSelect={handleFileTreeSelect}
                    selectedPath={selectedFile?.path}
                    workspaceId={workspaceId}
                    onFileDeleted={() => void refetchFileTree()}
                    onCreateFolderIn={openCreateFolderDialog}
                    onUploadToFolder={handleUploadToFolder}
                    onDownloadFile={handleDownloadFile}
                  />
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center">
                <FolderOpen className="mx-auto mb-2 h-8 w-8" />
                <p>暂无文件</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      {/* {selectedFile && (
        <div className="bg-muted/30 text-muted-foreground border-t p-4 text-xs">
          <div className="flex items-center gap-1">
            {selectedFile.type === "file" ? (
              <File className="h-3 w-3" />
            ) : (
              <FolderOpen className="h-3 w-3" />
            )}
            <span className="font-medium">{selectedFile.name}</span>
          </div>
          <div>路径: {selectedFile.path}</div>
        </div>
      )} */}

      {/* 空白区域右键菜单 */}
      {contextMenu && (
        <ContextMenu
          options={contextMenu.options}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 创建文件夹对话框 */}
      <Dialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
      >
        <DialogContent className="w-auto max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>创建文件夹</DialogTitle>
            <DialogDescription>
              创建一个新的文件夹
              {createFolderDirectory && (
                <span className="text-muted-foreground">
                  （位置：
                  <code className="bg-muted rounded px-1 py-0.5 text-xs">
                    {createFolderDirectory}
                  </code>
                  ）
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folderName">文件夹名</Label>
              <Input
                id="folderName"
                placeholder="例如：images 或 docs"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleCreateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateFolderDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
