"use client";

import { Suspense, use } from "react";
import { Button } from "~/components/ui/button";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

interface WorkspacePageProps {
  params: Promise<{
    id: string;
  }>;
}

function WorkspaceContent({
  workspace,
}: {
  workspace: {
    id: string;
    name: string;
    description?: string;
    memberCount: number;
    role: "owner" | "teacher" | "student";
    updatedAt: Date;
  };
}) {
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
              <div className="mb-4 flex items-center gap-2">
                <FolderOpen className="text-primary h-5 w-5" />
                <h3 className="font-semibold">文件浏览器</h3>
              </div>

              {/* 文件树结构 */}
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground py-8 text-center">
                  <FolderOpen className="mx-auto mb-2 h-8 w-8" />
                  <p>暂无文件</p>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* 文件内容预览 */}
          <ResizablePanel defaultSize={75}>
            <div className="h-full p-6">
              <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed">
                <div className="text-center">
                  <FolderOpen className="text-muted-foreground mx-auto h-12 w-12" />
                  <h3 className="mt-4 text-lg font-semibold">
                    选择一个文件查看
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    从左侧文件浏览器中选择文件以查看内容
                  </p>
                </div>
              </div>
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
        <WorkspaceContent workspace={workspace} />
      </Suspense>
    </main>
  );
}
