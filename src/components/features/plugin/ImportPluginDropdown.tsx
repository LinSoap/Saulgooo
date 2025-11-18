"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import type { PluginItem } from "~/types/plugin";

interface ImportPluginDropdownProps {
  plugin: PluginItem;
  onSuccess?: () => void;
}

export default function ImportPluginDropdown({
  plugin,
  onSuccess,
}: ImportPluginDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  // 获取用户的工作区列表
  const { data: workspaces, isLoading } =
    api.workspace.getWorkSpaces.useQuery();

  // 导入插件的 mutation
  const importPlugin = api.plugin.importPlugin.useMutation({
    onSuccess: (data, variables) => {
      // 使用 variables 中的 workspaceId，而不是 state 中的
      const workspaceId = variables.workspaceId;
      toast.success(data.message || "插件导入成功", {
        action: {
          label: "查看工作区",
          onClick: () => {
            void router.push(`/workspace/${workspaceId}`);
          },
        },
        duration: 5000,
      });
      setIsOpen(false);
      setSelectedWorkspaceId("");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "导入插件失败");
      setIsImporting(false);
      setSelectedWorkspaceId("");
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  // 处理导入
  const handleImport = async (workspaceId: string) => {
    if (!plugin || !workspaceId) {
      toast.error("请选择一个工作区");
      return;
    }

    setIsImporting(true);
    setSelectedWorkspaceId(workspaceId);
    importPlugin.mutate({
      workspaceId,
      resourceType: plugin.type,
      resource_path: plugin.resource_path,
      import_path: plugin.import_path,
    });
  };

  // 处理下拉框打开/关闭
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
      // 如果没有在导入中，清空选择
      if (!isImporting) {
        setSelectedWorkspaceId("");
      }
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className="w-full">
      <Select
        open={isOpen}
        onOpenChange={handleOpenChange}
        value={selectedWorkspaceId}
        onValueChange={(value) => {
          // 直接调用导入，传入选择的工作区ID
          void handleImport(value);
        }}
        disabled={isLoading || isImporting}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  导入到工作区
                </>
              )
            }
          />
        </SelectTrigger>
        <SelectContent>
          {/* 工作区列表 */}
          <div className="max-h-60 overflow-y-auto">
            {workspaces && workspaces.length > 0 ? (
              workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  <div className="flex items-center gap-2">
                    <span>{workspace.name}</span>
                    {isImporting && selectedWorkspaceId === workspace.id && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </div>
                </SelectItem>
              ))
            ) : (
              <div className="p-3 text-center text-sm text-gray-500">
                暂无可用工作区，请先创建一个工作区
              </div>
            )}
          </div>

          {/* 底部提示 */}
          {workspaces && workspaces.length > 0 && (
            <div className="border-t p-2">
              <p className="text-center text-xs text-gray-500">
                选择工作区后将自动导入
              </p>
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
