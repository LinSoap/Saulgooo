"use client";

import { api } from "~/trpc/react";

interface FileChangeEvent {
    event: "add" | "change" | "unlink" | "addDir" | "unlinkDir";
    path: string;
    timestamp?: number;
}

export function useFileWatcher(
    workspaceId: string,
    onFileTreeChange?: () => void,
    onFileContentChange?: (filePath: string) => void
) {
    api.workspace.watchFiles.useSubscription(
        { workspaceId },
        {
            onData: (data: FileChangeEvent) => {
                // 根据事件类型直接调用回调
                if (["add", "unlink", "addDir", "unlinkDir"].includes(data.event)) {
                    // 文件结构变化
                    onFileTreeChange?.();
                }

                if (["change", "add"].includes(data.event)) {
                    // 文件内容变化
                    onFileContentChange?.(data.path);
                }
            },
            onError: (error) => {
                console.error("[FileWatcher] Subscription error:", error);
            },
        },
    );
}