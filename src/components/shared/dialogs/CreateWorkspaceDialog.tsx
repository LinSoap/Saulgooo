"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Bot, Wrench, FileText, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";

export function CreateWorkspaceDialog() {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm({
    defaultValues: { name: "", description: "" },
  });

  const { data: pluginsData } = api.plugin.getPlugin.useQuery(
    {},
    { enabled: open },
  );
  const plugins = pluginsData?.items ?? [];

  const createMutation = api.workspace.createWorkSpace.useMutation();
  const importMutation = api.plugin.importPlugin.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. 获取表单数据
      const formData = new FormData(e.target as HTMLFormElement);
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;

      // 2. 创建工作空间
      const workspace = await createMutation.mutateAsync({ name, description });

      // 3. 导入选中的插件
      if (selectedPlugins.length > 0) {
        const selectedItems = plugins.filter((p) =>
          selectedPlugins.includes(p.resource_path),
        );

        for (const plugin of selectedItems) {
          await importMutation.mutateAsync({
            workspaceId: workspace.id,
            resourceType: plugin.type,
            resource_path: plugin.resource_path,
            import_path: plugin.import_path,
          });
        }
        toast.success("工作空间创建成功，已导入插件");
      } else {
        toast.success("工作空间创建成功");
      }

      // 4. 关闭对话框
      setOpen(false);
      setSelectedPlugins([]);
      form.reset();

      // 5. 刷新工作空间列表
      void utils.workspace.getWorkSpaces.invalidate();
    } catch (err) {
      console.error("创建失败:", err);
      toast.error("创建失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePluginSelect = (resourcePath: string) => {
    setSelectedPlugins((prev) => {
      if (prev.includes(resourcePath)) {
        return prev.filter((p) => p !== resourcePath);
      } else {
        return [...prev, resourcePath];
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedPlugins([]);
    form.reset();
  };

  // 分组插件
  const agents = plugins.filter((p) => p.type === "agent");
  const skills = plugins.filter((p) => p.type === "skill");
  const claudeMds = plugins.filter((p) => p.type === "claude-md");

  // 计算各类型选中数量
  const selectedAgentsCount = agents.filter((p) =>
    selectedPlugins.includes(p.resource_path),
  ).length;
  const selectedSkillsCount = skills.filter((p) =>
    selectedPlugins.includes(p.resource_path),
  ).length;
  const selectedClaudeMdCount = claudeMds.filter((p) =>
    selectedPlugins.includes(p.resource_path),
  ).length;

  return (
    <>
      <div
        className="group hover:border-primary hover:bg-primary/5 flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-all"
        onClick={() => setOpen(true)}
      >
        <div className="bg-primary/10 group-hover:bg-primary/20 rounded-full p-3 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </div>
        <h3 className="mt-3 font-semibold">创建工作空间</h3>
        <p className="text-muted-foreground text-sm">新建一个教研空间</p>
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>创建工作空间</DialogTitle>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleCreate} className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称 *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="例如：教案空间"
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="简要描述工作空间的用途..."
                />
              </div>
            </div>

            {/* 插件选择 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>选择插件（可选）</Label>
                {selectedPlugins.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    已选择 {selectedPlugins.length} 个
                  </Badge>
                )}
              </div>

              <Tabs defaultValue="agents" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="agents" className="gap-2">
                    <Bot className="h-4 w-4" />
                    Agent
                    {selectedAgentsCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 px-1.5 text-xs"
                      >
                        {selectedAgentsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="gap-2">
                    <Wrench className="h-4 w-4" />
                    技能工具
                    {selectedSkillsCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 px-1.5 text-xs"
                      >
                        {selectedSkillsCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="claude-md" className="gap-2">
                    <FileText className="h-4 w-4" />
                    CLAUDE.md
                    {selectedClaudeMdCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 px-1.5 text-xs"
                      >
                        {selectedClaudeMdCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="agents">
                  <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg px-3">
                    {agents.map((plugin) => {
                      const isSelected = selectedPlugins.includes(
                        plugin.resource_path,
                      );
                      return (
                        <label
                          key={plugin.resource_path}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handlePluginSelect(plugin.resource_path)
                            }
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{plugin.name}</div>
                            <div className="text-sm text-gray-600">
                              {plugin.description}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {plugin.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="skills">
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg px-3">
                    {skills.map((plugin) => {
                      const isSelected = selectedPlugins.includes(
                        plugin.resource_path,
                      );
                      return (
                        <label
                          key={plugin.resource_path}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handlePluginSelect(plugin.resource_path)
                            }
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{plugin.name}</div>
                            <div className="text-sm text-gray-600">
                              {plugin.description}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {plugin.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="claude-md">
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg px-3">
                    {claudeMds.map((plugin) => {
                      const isSelected = selectedPlugins.includes(
                        plugin.resource_path,
                      );
                      return (
                        <label
                          key={plugin.resource_path}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              handlePluginSelect(plugin.resource_path)
                            }
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{plugin.name}</div>
                            <div className="text-sm text-gray-600">
                              {plugin.description}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {plugin.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "处理中..."
                  : selectedPlugins.length > 0
                    ? `创建并导入 ${selectedPlugins.length} 个插件`
                    : "创建工作空间"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
