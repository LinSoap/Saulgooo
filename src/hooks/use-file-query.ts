"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  modifiedAt: string;
}

interface UseFileQueryOptions {
  workspaceId: string;
  query: string;
  enabled: boolean;
  limit?: number;
}

export function useFileQuery({ workspaceId, query, enabled, limit = 10 }: UseFileQueryOptions) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用 tRPC 的 utils 来获取查询客户端
  const utils = api.useUtils();

  useEffect(() => {
    if (!enabled || !workspaceId) {
      setFiles([]);
      setLoading(false);
      setError(null);
      return;
    }

    // 防抖处理
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      const fetchFiles = async () => {
        try {
          // 使用 tRPC 查询
          const result = await utils.workspace.searchFiles.fetch({
            workspaceId,
            query: query ?? undefined,
            limit,
          });

          setFiles(result.files || []);
        } catch (err) {
          console.error("Error fetching files:", err);
          setError(err instanceof Error ? err.message : "Unknown error");
          setFiles([]);
        } finally {
          setLoading(false);
        }
      };

      void fetchFiles();
    }, 300); // 300ms 防抖

    return () => {
      clearTimeout(timer);
    };
  }, [workspaceId, query, enabled, limit, utils]);

  return { loading, files, error };
}