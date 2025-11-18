"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import type { PluginItem } from "~/types/plugin";

interface ImportPluginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plugin: PluginItem | null;
}

export default function ImportPluginModal({
  open,
  onOpenChange,
  plugin,
}: ImportPluginModalProps) {
  const router = useRouter();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  // 获取用户的工作区列表
  const { data: workspaces, isLoading } =
    api.workspace.getWorkSpaces.useQuery();

  // 导入插件的 mutation
  const importPlugin = api.plugin.importPlugin.useMutation({
    onSuccess: (data) => {
      const workspaceId = selectedWorkspaceId;
      toast.success(data.message || "插件导入成功", {
        action: {
          label: "查看工作区",
          onClick: () => {
            router.push(`/workspace/${workspaceId}`);
          },
        },
        duration: 5000,
      });
      onOpenChange(false);
      setSelectedWorkspaceId("");
    },
    onError: (error) => {
      toast.error(error.message || "导入插件失败");
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  // 处理导入
  const handleImport = async () => {
    if (!plugin || !selectedWorkspaceId) {
      toast.error("请选择一个工作区");
      return;
    }

    setIsImporting(true);
    importPlugin.mutate({
      workspaceId: selectedWorkspaceId,
      resourceType: plugin.type,
      resource_path: plugin.resource_path,
      import_path: plugin.import_path,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            导入插件到工作区
          </DialogTitle>
          <DialogDescription>
            选择要导入插件的工作区。插件将被复制到工作区的相应目录中。
          </DialogDescription>
        </DialogHeader>

        {plugin && (
          <div className="py-4">
            {/* 插件信息 */}
            <div className="mb-4 rounded-lg border bg-gray-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Badge
                  variant={
                    plugin.type === "agent"
                      ? "default"
                      : plugin.type === "skill"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {plugin.type === "claude-md" ? "Claude.md" : plugin.type}
                </Badge>
                <h3 className="font-semibold">{plugin.name}</h3>
              </div>
              <p className="mb-2 text-sm text-gray-600">{plugin.description}</p>
              <div className="flex flex-wrap gap-1">
                {plugin.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 工作区选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">选择工作区</label>
              <Select
                value={selectedWorkspaceId}
                onValueChange={setSelectedWorkspaceId}
                disabled={isLoading || isImporting}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoading ? "加载工作区中..." : "请选择工作区"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {workspaces?.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!workspaces || workspaces.length === 0 ? (
                <p className="text-sm text-gray-500">
                  暂无可用工作区，请先创建一个工作区
                </p>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedWorkspaceId("");
            }}
            disabled={isImporting}
          >
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!plugin || !selectedWorkspaceId || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                导入插件
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
