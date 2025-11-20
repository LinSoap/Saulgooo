"use client";

import { Users, Calendar, ArrowRight, Plus, Settings } from "lucide-react";
import { cn } from "~/lib/utils";
import { WorkspaceSettingsDialog } from "~/components/shared/dialogs/WorkspaceSettingsDialog";

interface WorkspaceCardProps {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  role: "owner" | "teacher" | "student";
  updatedAt: Date;
  path?: string;
  className?: string;
  onUpdate?: (workspace: {
    id: string;
    name: string;
    description?: string;
    role: "owner" | "teacher" | "student";
    memberCount: number;
    updatedAt: Date;
    path: string;
  }) => void;
  onDelete?: (workspaceId: string) => void;
}

export function WorkspaceCard({
  id,
  name,
  description,
  memberCount,
  role,
  updatedAt,
  path,
  className,
  onUpdate,
  onDelete,
}: WorkspaceCardProps) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-green-100 text-green-800";
      case "teacher":
        return "bg-amber-100 text-amber-800";
      case "student":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "owner":
        return "拥有者";
      case "teacher":
        return "教师";
      case "student":
        return "学生";
      default:
        return "成员";
    }
  };

  return (
    <div
      onClick={() => (window.location.href = `/workspace/${id}?file=`)}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-4xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-xl",
        className,
      )}
    >
      <div className="relative z-10 mb-6 flex items-start justify-between">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold tracking-wide",
            getRoleColor(role),
          )}
        >
          {getRoleText(role)}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <WorkspaceSettingsDialog
            workspace={{
              id,
              name,
              description,
              role,
              memberCount,
              updatedAt,
              path: path ?? "",
            }}
            onUpdate={onUpdate}
            onDelete={onDelete}
          >
            <button className="text-gray-300 transition-colors hover:text-black">
              <Settings className="h-5 w-5" />
            </button>
          </WorkspaceSettingsDialog>
        </div>
      </div>

      <h3 className="text-brand-black group-hover:text-brand-accent mb-3 text-xl font-bold transition-colors">
        {name}
      </h3>
      <p className="mb-8 line-clamp-2 text-sm leading-relaxed text-gray-500">
        {description ?? "暂无描述"}
      </p>

      <div className="relative z-10 mt-auto flex items-center justify-between border-t border-gray-50 pt-6">
        <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {updatedAt.toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {memberCount} 成员
          </div>
        </div>
        <div className="group-hover:bg-brand-black flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 transition-colors duration-300 group-hover:text-white">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>

      {/* Decoration */}
      <div className="absolute -right-10 -bottom-10 z-0 h-32 w-32 rounded-full bg-gray-50 transition-transform duration-500 group-hover:scale-150"></div>
    </div>
  );
}

interface CreateWorkspaceCardProps {
  className?: string;
  onClick?: () => void;
}

export function CreateWorkspaceCard({
  className,
  onClick,
}: CreateWorkspaceCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex min-h-[280px] flex-col items-center justify-center rounded-4xl border-2 border-dashed border-gray-200 p-8 text-gray-400 transition-all hover:border-gray-400 hover:text-gray-600",
        className,
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 transition-colors group-hover:bg-gray-100">
        <Plus className="h-6 w-6" />
      </div>
      <span className="font-medium">创建新工作空间</span>
    </button>
  );
}
