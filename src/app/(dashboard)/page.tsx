"use client";

import { WorkspaceCard } from "~/components/workspace/WorkspaceCard";
import { CreateWorkspaceDialog } from "~/components/shared/dialogs/CreateWorkspaceDialog";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

function DashboardContent() {
  const { data: session } = useSession();
  const { data: workspaces = [], isLoading } =
    api.workspace.getWorkSpaces.useQuery(undefined, {
      enabled: !!session?.user,
    });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="bg-muted mb-2 h-8 w-48 rounded"></div>
          <div className="bg-muted mb-8 h-4 w-96 rounded"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-64 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">我的工作空间</h1>
        <p className="text-muted-foreground mt-2">管理和访问您的教研空间</p>
      </div>

      {workspaces.length === 0 ? (
        <div className="py-12 text-center">
          <div className="bg-muted mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
            <span className="text-4xl">📁</span>
          </div>
          <h3 className="mb-2 text-xl font-semibold">还没有工作空间</h3>
          <p className="text-muted-foreground mb-6">
            创建您的第一个工作空间开始协作
          </p>
          <CreateWorkspaceDialog />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 创建工作空间卡片 */}
          <CreateWorkspaceDialog />

          {/* 工作空间列表 */}
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} {...workspace} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
