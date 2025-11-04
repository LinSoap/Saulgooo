"use client";

import { useParams, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { FilePreviewHeader } from "~/components/ui/file-preview-header";
import MarkdownEditor from "~/components/workspace/MarkdownEditor";

export default function FilePreview() {
  const params = useParams();
  const workspaceId = params.id as string;
  const searchParams = useSearchParams();
  const filePath = searchParams?.get("file") ?? "";
  const { data: session } = useSession();

  // 获取文件信息（为了获取 MIME 类型）
  const { data: fileData, refetch } = api.workspace.getFileContent.useQuery(
    {
      workspaceId: workspaceId,
      filePath: filePath,
    },
    {
      enabled: !!filePath && !!session?.user,
    },
  );

  if (!fileData) {
    return;
  }

  return (
    <div className="flex h-full flex-col">
      <FilePreviewHeader fileData={fileData} onRefresh={() => void refetch()} />
      {fileData.mimeType?.startsWith("text/") ? (
        <MarkdownEditor fileData={fileData} />
      ) : (
        <div className="p-4 text-gray-500">Cannot preview this file type.</div>
      )}
    </div>
  );
}
