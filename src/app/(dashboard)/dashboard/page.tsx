"use client";

import {
  WorkspaceCard,
  CreateWorkspaceCard,
} from "~/components/workspace/WorkspaceCard";
import { CreateWorkspaceDialog } from "~/components/shared/dialogs/CreateWorkspaceDialog";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Search, Upload, Plus } from "lucide-react";
import { useState } from "react";

function DashboardContent() {
  const { data: session } = useSession();
  const { data: workspaces = [], isLoading } =
    api.workspace.getWorkSpaces.useQuery(undefined, {
      enabled: !!session?.user,
    });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
    <div className="h-full flex-1 overflow-y-auto bg-[#f9f9f9] p-8 md:p-12">
      {/* Header */}
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 font-serif text-gray-400 italic">Dashboard</h2>
          <h1 className="text-brand-black text-4xl font-bold tracking-tight">
            我的工作空间
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索工作空间..."
              className="focus:border-brand-black focus:ring-brand-black w-64 rounded-full border border-gray-200 bg-white py-2.5 pr-4 pl-11 text-sm transition-all focus:ring-1 focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            导入
          </button>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-brand-black hover:bg-brand-dark flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-gray-200 transition-all hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            新建空间
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-8 flex items-center space-x-2 overflow-x-auto pb-2">
        {["全部空间", "最近访问", "我创建的", "归档"].map((tab, idx) => (
          <button
            key={tab}
            className={`rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap transition-all ${
              idx === 0
                ? "bg-brand-black text-white"
                : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {/* Create Dialog Wrapper */}
        <CreateWorkspaceDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        >
          <CreateWorkspaceCard onClick={() => setIsCreateDialogOpen(true)} />
        </CreateWorkspaceDialog>

        {/* Workspaces */}
        {workspaces.map((workspace) => (
          <WorkspaceCard key={workspace.id} {...workspace} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
