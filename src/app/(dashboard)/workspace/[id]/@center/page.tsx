"use client";

import { useParams, useSearchParams } from "next/navigation";
import MarkdownEditor from "~/components/workspace/MarkdownEditor";
import { PreviewPanel } from "~/components/workspace/preview-panel";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

export default function FilePreview() {
  const params = useParams();
  const workspaceId = params.id as string;
  const searchParams = useSearchParams();
  const filePath = searchParams?.get("file") ?? "";
  const { data: session } = useSession();

  // 获取文件信息（为了获取 MIME 类型）
  const { data: fileData } = api.workspace.getFileContent.useQuery(
    {
      workspaceId: workspaceId,
      filePath: filePath,
    },
    {
      enabled: !!filePath && !!session?.user,
      select: (data) => ({
        mimeType: data.mimeType,
        size: data.size,
      }),
    }
  );

  // 构建选中的文件对象
  const selectedFile = filePath ? {
    path: filePath,
    name: filePath.split("/").pop() ?? "",
    type: "file" as const,
    mimeType: fileData?.mimeType,
    size: fileData?.size,
  } : null;

  // Markdown 文件使用专门的编辑器
  if (selectedFile?.name.endsWith('.md')) {
    return <MarkdownEditorWrapper workspaceId={workspaceId} selectedFile={selectedFile} />;
  }

  // 其他文件使用新的预览面板
  return <PreviewPanel workspaceId={workspaceId} selectedFile={selectedFile} />;
}

// Markdown 编辑器包装器
function MarkdownEditorWrapper({ workspaceId, selectedFile }: { workspaceId: string; selectedFile: { path: string; name: string } }) {
  const { data: fileData, isLoading, error, refetch } = api.workspace.getFileContent.useQuery(
    {
      workspaceId: workspaceId,
      filePath: selectedFile.path,
    }
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-blue-500 rounded-full animate-pulse" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Failed to load file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <MarkdownEditor
        workspaceId={workspaceId}
        filePath={selectedFile.path}
        initialContent={fileData?.content ?? ''}
        className="flex-1"
        fileName={selectedFile.name}
        onRefresh={() => void refetch()}
        isRefreshing={isLoading}
      />
    </div>
  );
}
