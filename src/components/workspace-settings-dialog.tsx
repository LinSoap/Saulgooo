"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Settings, Users, Calendar, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

interface WorkspaceSettingsDialogProps {
  children: React.ReactNode;
  workspace: {
    id: string;
    name: string;
    description?: string;
    role: "owner" | "teacher" | "student";
    memberCount: number;
    updatedAt: Date;
    path: string;
  };
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

export function WorkspaceSettingsDialog({
  children,
  workspace,
  onUpdate,
  onDelete,
}: WorkspaceSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data: _session } = useSession();
  const utils = api.useUtils();

  const deleteWorkspaceMutation = api.workspace.deleteWorkSpace.useMutation({
    onSuccess: () => {
      onDelete?.(workspace.id);
      setOpen(false);
      // 刷新workspace列表
      void utils.workspace.getWorkSpaces.invalidate();
    },
    onError: (error) => {
      // 删除失败
    },
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update workspace");
      }

      const updatedWorkspace = await response.json() as {
        id: string;
        name: string;
        description?: string;
        role: "owner" | "teacher" | "student";
        memberCount: number;
        updatedAt: Date;
        path: string;
      };
      onUpdate?.(updatedWorkspace);
      setOpen(false);
      // 刷新workspace列表
      void utils.workspace.getWorkSpaces.invalidate();
    } catch (error) {
      // 更新失败
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteWorkspaceMutation.mutateAsync({ workspaceId: workspace.id });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setShowDeleteConfirm(false);
    setName(workspace.name);
    setDescription(workspace.description ?? "");
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-primary text-primary-foreground";
      case "teacher":
        return "bg-secondary text-secondary-foreground";
      case "student":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
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

  const isOwner = workspace.role === "owner";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            工作空间设置
          </DialogTitle>
          <DialogDescription>管理工作空间的基本信息和设置</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 工作空间信息 */}
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-sm">
                工作空间ID
              </Label>
              <p className="font-mono text-sm">{workspace.id}</p>
            </div>

            <div>
              <Label className="text-muted-foreground text-sm">
                工作空间路径
              </Label>
              <p className="font-mono text-sm">{workspace.path}</p>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">
                  您的角色
                </Label>
                <div className="mt-1">
                  <Badge className={getRoleColor(workspace.role)}>
                    {getRoleText(workspace.role)}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">
                  成员数量
                </Label>
                <p className="mt-1 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {workspace.memberCount}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground text-sm">最后更新</Label>
              <p className="mt-1 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {workspace.updatedAt.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 编辑表单 */}
          {isOwner && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">工作空间名称</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>
            </form>
          )}

          {/* 危险操作 */}
          {isOwner && (
            <div className="border-t pt-4">
              <div className="space-y-2">
                <Label className="text-destructive text-sm font-medium">
                  危险操作
                </Label>
                <p className="text-muted-foreground text-sm">
                  删除工作空间将永久删除所有相关数据，此操作不可撤销。
                </p>
              </div>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除工作空间
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-destructive text-sm font-medium">
                    确定要删除工作空间 &quot;{workspace.name}&quot; 吗？此操作不可撤销。
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      {loading ? "删除中..." : "确认删除"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={loading}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            关闭
          </Button>
          {isOwner && !showDeleteConfirm && (
            <Button
              type="button"
              onClick={handleUpdate}
              disabled={loading || !name.trim()}
            >
              {loading ? "保存中..." : "保存更改"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
