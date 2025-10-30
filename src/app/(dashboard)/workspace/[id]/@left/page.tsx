"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ScrollArea } from "~/components/ui/scroll-area";
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
import { api } from "~/trpc/react";
import { ArrowLeft, FolderOpen, File, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileTreeItem } from "~/components/FileTreeItem";
import { useSession } from "next-auth/react";
import { formatDate } from "~/lib/date-utils";

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");

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
    error: fileTreeError,
    refetch: refetchFileTree,
  } = api.workspace.getFileTree.useQuery({
    workspaceId: workspaceId,
  });

  // 处理文件选择
  const handleFileSelect = (file: FileNode) => {
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

  // 创建文件
  const createFileMutation = api.workspace.createMarkdownFile.useMutation({
    onSuccess: () => {
      void refetchFileTree();
      setIsCreateDialogOpen(false);
      setNewFileName("");
    },
  });

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;

    void createFileMutation.mutate({
      workspaceId: workspaceId,
      fileName: newFileName,
      directoryPath: "",
      initialContent:
        "# " + newFileName.replace(/\.md$/, "") + "\n\n开始编写您的文档...\n",
    });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex h-8 items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </Link>
          {workspace && (
            <div className="flex-1">
              <h3 className="font-semibold">{workspace.name}</h3>
              <p className="text-muted-foreground text-xs">
                {workspace.description}
              </p>
            </div>
          )}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-3 w-3" />
                新建
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建 Markdown 文件</DialogTitle>
                <DialogDescription>
                  创建一个新的 Markdown 文件
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="fileName">文件名</Label>
                  <Input
                    id="fileName"
                    placeholder="例如：README.md"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateFile();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateFile}
                  disabled={!newFileName.trim() || createFileMutation.isPending}
                >
                  {createFileMutation.isPending ? "创建中..." : "创建"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* File Tree */}
      <div className="min-h-0 flex-1 overflow-auto">
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
                  onSelect={handleFileSelect}
                  selectedPath={selectedFile?.path}
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
    </div>
  );
}
