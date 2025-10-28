"use client";

import { Suspense, use, useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { ArrowLeft, FolderOpen, File, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { FileTreeItem } from "~/components/FileTreeItem";
import { MarkdownPreview } from "~/components/MarkdownPreview";
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

interface WorkspacePageProps {
  params: Promise<{
    id: string;
  }>;
}

function WorkspaceContent({
  workspace,
  workspaceId,
}: {
  workspace: {
    id: string;
    name: string;
    description?: string;
    memberCount: number;
    role: "owner" | "teacher" | "student";
    updatedAt: Date;
  };
  workspaceId: string;
}) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const {
    data: fileTreeData,
    isLoading: isFileTreeLoading,
    error: fileTreeError,
    refetch: refetchFileTree,
  } = api.workspace.getFileTree.useQuery({
    workspaceId: workspaceId,
  });

  const createFileMutation = api.workspace.createMarkdownFile.useMutation({
    onSuccess: () => {
      refetchFileTree();
      setIsCreateDialogOpen(false);
      setNewFileName("");
    },
    onError: (error) => {
      console.error("Failed to create file:", error);
    },
  });

  const {
    data: fileData,
    isLoading: isFileLoading,
    error: fileError,
  } = api.workspace.getFileContent.useQuery(
    {
      workspaceId: workspaceId,
      filePath: selectedFile?.path || "",
    },
    {
      enabled:
        !!selectedFile &&
        selectedFile.type === "file" &&
        selectedFile.extension === "md",
    },
  );

  // 当选择的文件改变时，重置内容
  useEffect(() => {
    if (
      !selectedFile ||
      selectedFile.type !== "file" ||
      selectedFile.extension !== "md"
    ) {
      setFileContent(null);
    }
  }, [selectedFile]);

  // 当文件数据加载成功时，更新内容
  useEffect(() => {
    if (fileData) {
      setFileContent(fileData.content);
    } else if (fileError) {
      console.error("Failed to get file content:", fileError);
      setFileContent(null);
    }
  }, [fileData, fileError]);

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;

    createFileMutation.mutate({
      workspaceId: workspaceId,
      fileName: newFileName,
      directoryPath: "",
      initialContent:
        "# " + newFileName.replace(/\.md$/, "") + "\n\n开始编写您的文档...\n",
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* 工作空间头部 */}
      <div className="bg-background/95 supports-backdrop-filter:bg-background/60 h-30 border-b backdrop-blur">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{workspace.name}</h1>
                <p className="text-muted-foreground">{workspace.description}</p>
                {selectedFile && (
                  <div className="text-muted-foreground mt-2 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      {selectedFile.type === "file" ? (
                        <File className="h-3 w-3" />
                      ) : (
                        <FolderOpen className="h-3 w-3" />
                      )}
                      <span className="font-medium">{selectedFile.name}</span>
                    </span>
                    <span>·</span>
                    <span>路径: {selectedFile.path}</span>
                    <span>·</span>
                    <span>
                      {selectedFile.type === "file" ? "文件" : "文件夹"}
                    </span>
                    {selectedFile.type === "file" && (
                      <>
                        <span>·</span>
                        <span>{selectedFile.size} bytes</span>
                        {selectedFile.extension && (
                          <>
                            <span>·</span>
                            <span>{selectedFile.extension}</span>
                          </>
                        )}
                      </>
                    )}
                    <span>·</span>
                    <span>
                      {new Date(selectedFile.modifiedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Badge variant="secondary">
              {workspace.role === "owner"
                ? "拥有者"
                : workspace.role === "teacher"
                  ? "教师"
                  : "学生"}
            </Badge>
          </div>
        </div>
      </div>

      {/* 文件浏览器内容 */}
      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* 文件树 */}
          <ResizablePanel defaultSize={15} minSize={15} maxSize={25}>
            <div className="h-full border-r p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="text-primary h-5 w-5" />
                  <h3 className="font-semibold">文件浏览器</h3>
                </div>
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
                        disabled={
                          !newFileName.trim() || createFileMutation.isPending
                        }
                      >
                        {createFileMutation.isPending ? "创建中..." : "创建"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* 文件树结构 */}
              <div className="space-y-2 text-sm">
                {isFileTreeLoading ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <p>加载中...</p>
                  </div>
                ) : fileTreeError ? (
                  <div className="text-destructive py-8 text-center">
                    <p>加载文件树失败</p>
                  </div>
                ) : fileTreeData?.tree && fileTreeData.tree.length > 0 ? (
                  <div className="overflow-auto">
                    {fileTreeData.tree.map((item) => (
                      <FileTreeItem
                        key={item.id}
                        item={item}
                        onSelect={setSelectedFile}
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
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* 文件内容预览 */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full overflow-auto">
              {selectedFile ? (
                <div className="h-full">
                  {selectedFile.type === "file" ? (
                    <>
                      {selectedFile.extension === "md" ? (
                        <div className="p-6">
                          {isFileLoading ? (
                            <div className="flex h-64 items-center justify-center">
                              <p className="text-muted-foreground">加载中...</p>
                            </div>
                          ) : fileError ? (
                            <div className="flex h-64 items-center justify-center">
                              <p className="text-destructive">加载文件失败</p>
                            </div>
                          ) : fileContent !== null ? (
                            <MarkdownPreview
                              content={fileContent}
                              className="max-w-none"
                            />
                          ) : (
                            <div className="flex h-64 items-center justify-center">
                              <div className="text-center">
                                <File className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                                <h3 className="mb-2 text-xl font-semibold">
                                  {selectedFile.name}
                                </h3>
                                <p className="text-muted-foreground">
                                  无法预览此文件类型
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">
                            <File className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                            <h3 className="mb-2 text-xl font-semibold">
                              {selectedFile.name}
                            </h3>
                            <p className="text-muted-foreground">
                              暂不支持预览此文件类型
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                              目前仅支持 Markdown (.md) 文件预览
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <FolderOpen className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                        <h3 className="mb-2 text-xl font-semibold">
                          {selectedFile.name}
                        </h3>
                        <p className="text-muted-foreground">这是一个文件夹</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed">
                  <div className="text-center">
                    <FolderOpen className="text-muted-foreground mx-auto h-16 w-16" />
                    <h3 className="mt-4 text-lg font-semibold">
                      选择一个文件查看
                    </h3>
                    <p className="text-muted-foreground mt-2">
                      从左侧文件浏览器中选择文件以查看内容
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      支持 Markdown (.md) 文件预览
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const {
    data: workspace,
    isLoading,
    error,
  } = api.workspace.getWorkSpaceById.useQuery(
    {
      workspaceId: id,
    },
    {
      enabled: !!session?.user,
    },
  );

  if (!session?.user) {
    return (
      <main className="flex h-full items-center justify-center">
        <div>Please log in to view this workspace</div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex h-full items-center justify-center">
        <div>Loading workspace...</div>
      </main>
    );
  }

  if (error || !workspace) {
    return (
      <main className="flex h-full items-center justify-center">
        <div>Workspace not found</div>
      </main>
    );
  }

  return (
    <main className="h-full">
      <Suspense fallback={<div>Loading workspace...</div>}>
        <WorkspaceContent workspace={workspace} workspaceId={id} />
      </Suspense>
    </main>
  );
}
