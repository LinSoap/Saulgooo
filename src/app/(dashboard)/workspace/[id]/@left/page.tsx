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
import { api } from "~/trpc/react";
import { ArrowLeft, FolderOpen, Plus, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileTreeItem } from "~/components/shared/FileTreeItem";
import { useSession } from "next-auth/react";
import { useRef } from "react";
import { toast } from "sonner";

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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadDirectory, setUploadDirectory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  } = api.workspace.getFileTree.useQuery({
    workspaceId: workspaceId,
  });

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

  // 上传文件
  const uploadFileMutation = api.workspace.uploadFile.useMutation({
    onSuccess: (data) => {
      void refetchFileTree();
      setIsUploadDialogOpen(false);
      setUploadDirectory("");
      toast.success(`文件 "${data.fileName}" 上传成功！`);
    },
    onError: (error) => {
      toast.error(`上传失败: ${error.message}`);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const content = base64.split(',')[1]; // 去掉data:mime;base64,前缀
      if (!content) return;

      void uploadFileMutation.mutate({
        workspaceId: workspaceId,
        fileName: file.name,
        directoryPath: uploadDirectory,
        content: content,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetchFileTree()}
            disabled={isFileTreeFetching}
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${isFileTreeFetching ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
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
          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="mr-1 h-3 w-3" />
                上传
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>上传文件</DialogTitle>
                <DialogDescription>
                  选择文件上传到工作区
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="directory">目标目录（可选）</Label>
                  <Input
                    id="directory"
                    placeholder="例如：uploads 或 images"
                    value={uploadDirectory}
                    onChange={(e) => setUploadDirectory(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>选择文件</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadClick}
                    disabled={uploadFileMutation.isPending}
                    className="h-20 border-dashed"
                  >
                    <div className="text-center">
                      <Upload className="mx-auto h-6 w-6 mb-2" />
                      <p>
                        {uploadFileMutation.isPending
                          ? "上传中..."
                          : "点击选择文件或拖拽到此处"}
                      </p>
                    </div>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
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
                  disabled={uploadFileMutation.isPending}
                >
                  取消
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
                  onSelect={handleFileTreeSelect}
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
