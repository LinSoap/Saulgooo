"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Download, Search, Package, Bot, Zap, FileText } from "lucide-react";
import ImportPluginModal from "~/components/features/plugin/ImportPluginModal";
import type { PluginItem } from "~/types/plugin";

export default function PluginPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginItem | null>(null);

  const {
    data: pluginData,
    isLoading,
    error,
  } = api.plugin.getPlugin.useQuery({});

  // 过滤资源
  const filteredItems =
    pluginData?.items?.filter((item: PluginItem) => {
      // 类型过滤
      if (typeFilter !== "all" && item.type !== typeFilter) return false;

      // 标签过滤
      if (selectedTag !== "all" && !item.tags.includes(selectedTag))
        return false;

      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      return true;
    }) ?? [];

  // 获取所有标签
  const allTags = Array.from(
    new Set(pluginData?.items?.flatMap((item: PluginItem) => item.tags) ?? []),
  );

  // 处理导入按钮点击
  const handleImport = (item: PluginItem) => {
    setSelectedPlugin(item);
    setImportModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500">加载插件资源失败</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">插件中心</h1>
        <p className="text-gray-600">
          发现并导入强大的 Agents、Skills、Claude.md 到你的工作区
        </p>
      </div>

      {/* 搜索和过滤器 */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="搜索插件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有类型</SelectItem>
            <SelectItem value="agent">Agents</SelectItem>
            <SelectItem value="skill">Skills</SelectItem>
            <SelectItem value="claude-md">Claude.md</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="标签" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有标签</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 资源列表 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item: PluginItem) => (
          <Card
            key={`${item.type}-${item.name}`}
            className="transition-shadow hover:shadow-lg"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {item.type === "agent" ? (
                    <Bot className="h-6 w-6 text-blue-500" />
                  ) : item.type === "skill" ? (
                    <Zap className="h-6 w-6 text-purple-500" />
                  ) : (
                    <FileText className="h-6 w-6 text-green-500" />
                  )}
                  <Badge
                    variant={
                      item.type === "agent"
                        ? "default"
                        : item.type === "skill"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {item.type === "claude-md" ? "Claude.md" : item.type}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg">{item.name}</CardTitle>
              <CardDescription className="text-sm">
                {item.description}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* 标签 */}
              <div className="mb-4 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* 功能特性 */}
              {item.features && item.features.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-medium">功能特性：</h4>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {item.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {feature}
                      </li>
                    ))}
                    {item.features.length > 3 && (
                      <li className="text-gray-400">
                        +{item.features.length - 3} 更多...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* 导入按钮 */}
              <Button
                className="w-full"
                onClick={() => handleImport(item)}
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                导入到工作区
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {filteredItems.length === 0 && (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500">没有找到匹配的插件</p>
        </div>
      )}

      {/* 导入插件 Modal */}
      <ImportPluginModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        plugin={selectedPlugin}
      />
    </div>
  );
}
