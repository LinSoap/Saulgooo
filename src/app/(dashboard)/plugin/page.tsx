"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Search,
  Package,
  Bot,
  Workflow,
  Download,
  ExternalLink,
  Wrench,
} from "lucide-react";
import ImportPluginDropdown from "~/components/features/plugin/ImportPluginDropdown";
import type { PluginItem } from "~/types/plugin";
import { cn } from "~/lib/utils";

export default function PluginPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const {
    data: pluginData,
    isLoading,
    error,
  } = api.plugin.getPlugin.useQuery({});

  // 过滤资源
  const filteredItems =
    pluginData?.items?.filter((item: PluginItem) => {
      // 类型过滤
      if (activeFilter !== "all" && item.type !== activeFilter) return false;

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

  const stats = {
    agent: pluginData?.items?.filter((p) => p.type === "agent").length ?? 0,
    skill: pluginData?.items?.filter((p) => p.type === "skill").length ?? 0,
    workflow:
      pluginData?.items?.filter((p) => p.type === "claude-md").length ?? 0, // Assuming claude-md maps to workflow
    installed: 0, // We don't have installed status yet
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "agent":
        return Bot;
      case "skill":
        return Wrench;
      case "claude-md":
        return Workflow;
      default:
        return Package;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "agent":
        return "text-blue-600 bg-blue-50";
      case "skill":
        return "text-purple-600 bg-purple-50";
      case "claude-md":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "agent":
        return "AGENT";
      case "skill":
        return "SKILL";
      case "claude-md":
        return "CLAUDE.MD";
      default:
        return type.toUpperCase();
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "agent":
        return "bg-blue-100 text-blue-700";
      case "skill":
        return "bg-purple-100 text-purple-700";
      case "claude-md":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
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
    <div className="h-full flex-1 overflow-y-auto bg-[#f9f9f9] p-8 md:p-12">
      {/* Header */}
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="mb-2 font-serif text-gray-400 italic">Extensions</h2>
          <h1 className="text-brand-black text-4xl font-bold tracking-tight">
            插件中心
          </h1>
          <p className="mt-2 text-gray-500">
            扩展您的教学能力，发现专业的 AI 工具和技能。
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
          <span>
            当前共有:{" "}
            <strong className="text-brand-black">
              {pluginData?.items?.length ?? 0}
            </strong>
            个插件
          </span>
          {/* <span className="w-px h-4 bg-gray-200"></span>
            <span>已安装: <strong className="text-brand-black">{stats.installed}</strong> 个</span> */}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="bg-brand-black flex items-center justify-between rounded-4xl p-6 text-white shadow-lg">
          <div>
            <p className="mb-1 text-xs font-bold tracking-widest text-gray-400 uppercase">
              Agents
            </p>
            <h3 className="text-3xl font-bold">智能代理</h3>
          </div>
          <div className="text-brand-accent font-serif text-4xl font-bold">
            {stats.agent}
          </div>
        </div>
        <div className="text-brand-black flex items-center justify-between rounded-4xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="mb-1 text-xs font-bold tracking-widest text-gray-400 uppercase">
              Skills
            </p>
            <h3 className="text-3xl font-bold">专业技能</h3>
          </div>
          <div className="font-serif text-4xl font-bold text-gray-300">
            {stats.skill}
          </div>
        </div>
        <div className="text-brand-black flex items-center justify-between rounded-4xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="mb-1 text-xs font-bold tracking-widest text-gray-400 uppercase">
              Workflows
            </p>
            <h3 className="text-3xl font-bold">工作流程</h3>
          </div>
          <div className="font-serif text-4xl font-bold text-gray-300">
            {stats.workflow}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-10 flex flex-col items-start gap-4 lg:flex-row lg:items-center">
        <div className="relative w-full flex-1 lg:w-auto">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索插件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="focus:border-brand-black focus:ring-brand-black w-full rounded-xl border border-gray-200 bg-white py-3 pr-4 pl-11 text-sm shadow-sm focus:ring-1 focus:outline-none"
          />
        </div>

        <div className="hide-scrollbar flex w-full gap-2 overflow-x-auto pb-2 lg:w-auto">
          <button
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === "all"
                ? "bg-brand-black text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setActiveFilter("agent")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === "agent"
                ? "bg-blue-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Bot className="h-4 w-4" /> Agents
          </button>
          <button
            onClick={() => setActiveFilter("skill")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === "skill"
                ? "bg-purple-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Wrench className="h-4 w-4" /> Skills
          </button>
          <button
            onClick={() => setActiveFilter("claude-md")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === "claude-md"
                ? "bg-orange-600 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Workflow className="h-4 w-4" /> Claude.md
          </button>
        </div>
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item: PluginItem) => {
          const Icon = getIcon(item.type);
          const colorClass = getColor(item.type);

          return (
            <div
              key={`${item.type}-${item.name}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-4xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl"
            >
              {/* Header */}
              <div className="relative z-10 mb-6 flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner",
                    colorClass,
                  )}
                >
                  <Icon className="h-8 w-8" />
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase",
                    getTypeBadgeStyle(item.type),
                  )}
                >
                  {getTypeLabel(item.type)}
                </span>
              </div>

              {/* Content */}
              <div className="relative z-10 flex-1">
                <h3 className="text-brand-black group-hover:text-brand-accent mb-2 text-xl font-bold transition-colors">
                  {item.name}
                </h3>
                <p className="mb-6 line-clamp-2 h-10 text-sm leading-relaxed text-gray-500">
                  {item.description}
                </p>

                {/* Tags */}
                <div className="mb-6 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Features List */}
                {item.features && item.features.length > 0 && (
                  <div className="mb-8 rounded-xl border border-gray-50 bg-gray-50/50 p-4">
                    <p className="mb-3 flex items-center gap-1 text-xs font-bold text-gray-400 uppercase">
                      <ExternalLink className="h-3 w-3" /> 功能特性
                    </p>
                    <ul className="space-y-2">
                      {item.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-xs text-gray-600"
                        >
                          <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="relative z-10 mt-auto flex gap-3">
                <button className="text-brand-black flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                  查看详情
                </button>
                <div className="flex-1">
                  <ImportPluginDropdown
                    plugin={item}
                    trigger={
                      <div className="bg-brand-black hover:bg-brand-dark flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5">
                        <Download className="h-3.5 w-3.5" />
                        {item.type === "claude-md" ? "应用" : "安装"}
                      </div>
                    }
                  />
                </div>
              </div>

              {/* Decorative Background Blob */}
              <div
                className={cn(
                  "pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20",
                  item.type === "agent"
                    ? "bg-blue-500"
                    : item.type === "skill"
                      ? "bg-purple-500"
                      : "bg-orange-500",
                )}
              ></div>
            </div>
          );
        })}
      </div>

      {/* 空状态 */}
      {filteredItems.length === 0 && (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500">没有找到匹配的插件</p>
        </div>
      )}
    </div>
  );
}
