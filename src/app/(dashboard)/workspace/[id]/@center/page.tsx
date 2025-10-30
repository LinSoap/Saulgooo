"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { File, FolderOpen } from "lucide-react";
import { api } from "~/trpc/react";
import { MarkdownFileEditorSimple } from "~/components/MarkdownFileEditorSimple";
import { useSession } from "next-auth/react";

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

export default function FilePreview() {
  const params = useParams();
  const workspaceId = params.id as string;
  const searchParams = useSearchParams();
  const filePath = searchParams?.get("file") ?? "";
  const { data: session } = useSession();

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  // 获取文件内容
  const {
    data: fileData,
    isLoading: isFileLoading,
    error: fileError,
  } = api.workspace.getFileContent.useQuery(
    {
      workspaceId: workspaceId,
      filePath: filePath,
    },
    {
      enabled: !!filePath && !!session?.user,
    },
  );

  // 当文件数据加载成功时，更新内容
  useEffect(() => {
    if (fileData) {
      setFileContent(fileData.content);
    } else if (fileError) {
      setFileContent(null);
    }
  }, [fileData, fileError]);

  // 构建选中的文件对象
  useEffect(() => {
    if (filePath) {
      // 这里应该从文件树或API获取完整的文件信息
      // 暂时使用简化版本
      setSelectedFile({
        id: filePath,
        name: filePath.split("/").pop() ?? "",
        path: filePath,
        type: "file",
        size: 0,
        modifiedAt: new Date(),
        createdAt: new Date(),
        extension: filePath.split(".").pop(),
      });
    } else {
      setSelectedFile(null);
      setFileContent(null);
    }
  }, [filePath]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {selectedFile ? (
        <div className="flex-1 overflow-auto">
          {selectedFile.type === "file" ? (
            <>
              {selectedFile.extension === "md" ? (
                isFileLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <p className="text-muted-foreground">加载中...</p>
                  </div>
                ) : fileError ? (
                  <div className="flex h-64 items-center justify-center">
                    <p className="text-destructive">加载文件失败</p>
                  </div>
                ) : fileContent !== null ? (
                  <MarkdownFileEditorSimple
                    workspaceId={workspaceId}
                    filePath={selectedFile.path}
                    initialContent={fileContent}
                    className="h-full"
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
                )
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
            <h3 className="mt-4 text-lg font-semibold">选择一个文件查看</h3>
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
  );
}
