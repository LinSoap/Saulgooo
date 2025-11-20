"use client";

import React, { useState } from "react";
import {
  User,
  Shield,
  Bell,
  Type,
  Lock,
  Sparkles,
  Moon,
  Sun,
  Laptop,
  Smartphone,
  Mail,
  Globe,
  Check,
  Save,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
} from "lucide-react";

type SettingsTab = "profile" | "ai" | "editor" | "notifications" | "security";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showPassword, setShowPassword] = useState(false);

  const tabs = [
    { id: "profile", label: "个人资料", icon: User },
    { id: "ai", label: "AI 偏好设置", icon: Sparkles },
    { id: "editor", label: "编辑器配置", icon: Type },
    { id: "notifications", label: "通知", icon: Bell },
    { id: "security", label: "安全与隐私", icon: Shield },
  ];

  // Mock Toggle Switch Component
  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange?: () => void;
  }) => (
    <button
      onClick={onChange}
      className={`transition-colors duration-300 ${checked ? "text-brand-black" : "text-gray-300"}`}
    >
      {checked ? (
        <ToggleRight className="h-10 w-10" />
      ) : (
        <ToggleLeft className="h-10 w-10" />
      )}
    </button>
  );

  return (
    <div className="h-full flex-1 overflow-y-auto bg-[#f9f9f9] p-8 md:p-12">
      <div className="mb-10">
        <h2 className="mb-2 font-serif text-gray-400 italic">Configuration</h2>
        <h1 className="text-brand-black text-4xl font-bold tracking-tight">
          设置
        </h1>
      </div>

      <div className="flex max-w-6xl flex-col gap-8 md:flex-row md:gap-12">
        {/* Sidebar Settings Nav */}
        <div className="w-full shrink-0 space-y-2 md:w-64">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex w-full items-center gap-3 rounded-xl px-5 py-4 text-left text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-brand-black scale-105 transform text-white shadow-lg shadow-gray-300"
                  : "hover:text-brand-black text-gray-500 hover:bg-white hover:shadow-sm"
              }`}
            >
              <tab.icon
                className={`h-4 w-4 ${activeTab === tab.id ? "text-white" : "text-gray-400"}`}
              />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 min-w-0 flex-1 duration-500">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-brand-black flex items-center gap-3 text-xl font-bold">
                    <div className="rounded-lg bg-gray-100 p-2">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    基本信息
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gray-200 text-xl font-bold text-gray-500 shadow-sm">
                      ZP
                    </div>
                    <button className="text-brand-accent text-sm font-medium hover:underline">
                      更换头像
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      姓名
                    </label>
                    <input
                      type="text"
                      defaultValue="张教授"
                      className="focus:ring-brand-black w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      学术职称
                    </label>
                    <input
                      type="text"
                      defaultValue="副教授"
                      className="focus:ring-brand-black w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      所属院校
                    </label>
                    <div className="relative">
                      <Globe className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        defaultValue="科技大学 (University of Science and Technology)"
                        className="focus:ring-brand-black w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-4 pl-11 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      个人简介
                    </label>
                    <textarea
                      rows={4}
                      defaultValue="专注于人工智能与计算机视觉领域的研究。主讲《机器学习导论》与《高级算法分析》。"
                      className="focus:ring-brand-black w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-6 text-xl font-bold">
                  联系方式
                </h2>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      电子邮箱
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        defaultValue="zhang@edu.cn"
                        className="focus:ring-brand-black w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-4 pl-11 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold tracking-wider text-gray-400 uppercase">
                      办公电话
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        defaultValue="+86 10 1234 5678"
                        className="focus:ring-brand-black w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-4 pl-11 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button className="bg-brand-black hover:bg-brand-dark flex items-center gap-2 rounded-full px-8 py-4 font-medium text-white shadow-lg transition-all hover:-translate-y-1">
                  <Save className="h-4 w-4" /> 保存更改
                </button>
              </div>
            </div>
          )}

          {/* AI SETTINGS TAB */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-2 flex items-center gap-3 text-xl font-bold">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Sparkles className="h-5 w-5 text-gray-600" />
                  </div>
                  模型行为
                </h2>
                <p className="mb-8 text-sm text-gray-500">
                  定义 AI 助手在协助您进行课程设计和内容生成时的默认表现。
                </p>

                <div className="space-y-8">
                  <div className="flex flex-col justify-between gap-4 border-b border-gray-50 pb-6 md:flex-row md:items-center">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        响应语调
                      </p>
                      <p className="text-xs text-gray-400">
                        选择 AI 生成文本的学术严谨程度。
                      </p>
                    </div>
                    <select className="focus:ring-brand-black min-w-[200px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:outline-none">
                      <option>非常严谨 (Academic Rigorous)</option>
                      <option>通俗易懂 (Standard Educational)</option>
                      <option>生动有趣 (Engaging & Fun)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-between gap-4 border-b border-gray-50 pb-6 md:flex-row md:items-center">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        默认语言
                      </p>
                      <p className="text-xs text-gray-400">
                        AI 默认使用的输出语言。
                      </p>
                    </div>
                    <select className="focus:ring-brand-black min-w-[200px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:outline-none">
                      <option>中文 (简体)</option>
                      <option>English (US)</option>
                      <option>双语对照 (Bilingual)</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        创造性 (Temperature)
                      </p>
                      <p className="text-xs text-gray-400">
                        较低的值更注重事实，较高的值更具发散性。
                      </p>
                    </div>
                    <div className="flex min-w-[200px] items-center gap-4">
                      <span className="font-mono text-xs text-gray-400">
                        精确
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="30"
                        className="accent-brand-black h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                      />
                      <span className="font-mono text-xs text-gray-400">
                        创意
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-6 text-xl font-bold">
                  学术规范
                </h2>
                <div className="space-y-6">
                  <div className="flex flex-col justify-between gap-4 border-b border-gray-50 pb-6 md:flex-row md:items-center">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        引用格式
                      </p>
                      <p className="text-xs text-gray-400">
                        生成参考文献时默认使用的标准。
                      </p>
                    </div>
                    <select className="focus:ring-brand-black min-w-[200px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:outline-none">
                      <option>GB/T 7714 (中国标准)</option>
                      <option>IEEE</option>
                      <option>APA 7th Edition</option>
                      <option>MLA 9th Edition</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        自动来源标注
                      </p>
                      <p className="text-xs text-gray-400">
                        在生成内容中自动附带原始资料链接。
                      </p>
                    </div>
                    <Toggle checked={true} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EDITOR SETTINGS TAB */}
          {activeTab === "editor" && (
            <div className="space-y-6">
              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-2 flex items-center gap-3 text-xl font-bold">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Type className="h-5 w-5 text-gray-600" />
                  </div>
                  排版与显示
                </h2>
                <p className="mb-8 text-sm text-gray-500">
                  定制您的课程编写环境。
                </p>

                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        字体偏好
                      </p>
                    </div>
                    <div className="flex rounded-xl bg-gray-100 p-1">
                      <button className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-black shadow-sm transition-all">
                        Serif (衬线)
                      </button>
                      <button className="hover:text-brand-black rounded-lg px-4 py-2 text-xs font-medium text-gray-500 transition-all">
                        Sans (无衬线)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        界面主题
                      </p>
                    </div>
                    <div className="flex rounded-xl bg-gray-100 p-1">
                      <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-black shadow-sm transition-all">
                        <Sun className="h-3 w-3" /> 浅色
                      </button>
                      <button className="hover:text-brand-black flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-gray-500 transition-all">
                        <Moon className="h-3 w-3" /> 深色
                      </button>
                      <button className="hover:text-brand-black flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-gray-500 transition-all">
                        <Laptop className="h-3 w-3" /> 系统
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        显示行号
                      </p>
                      <p className="text-xs text-gray-400">
                        在编辑器左侧显示代码行号。
                      </p>
                    </div>
                    <Toggle checked={false} />
                  </div>
                </div>
              </div>

              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-6 text-xl font-bold">
                  行为习惯
                </h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        自动保存
                      </p>
                      <p className="text-xs text-gray-400">
                        内容变化时自动保存到云端。
                      </p>
                    </div>
                    <Toggle checked={true} />
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        实时 LaTeX 渲染
                      </p>
                      <p className="text-xs text-gray-400">
                        输入公式代码时立即预览数学公式。
                      </p>
                    </div>
                    <Toggle checked={true} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        拼写检查
                      </p>
                      <p className="text-xs text-gray-400">
                        自动高亮潜在的拼写和语法错误。
                      </p>
                    </div>
                    <Toggle checked={true} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS SETTINGS TAB */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-6 flex items-center gap-3 text-xl font-bold">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Bell className="h-5 w-5 text-gray-600" />
                  </div>
                  邮件通知
                </h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        课程动态
                      </p>
                      <p className="text-xs text-gray-400">
                        当有学生评论或提交作业时。
                      </p>
                    </div>
                    <Toggle checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        AI 任务完成
                      </p>
                      <p className="text-xs text-gray-400">
                        当后台批量生成的试卷或课件准备好时。
                      </p>
                    </div>
                    <Toggle checked={true} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-brand-black mb-1 text-sm font-bold">
                        每周简报
                      </p>
                      <p className="text-xs text-gray-400">
                        发送包含课程活跃度和建议的周报。
                      </p>
                    </div>
                    <Toggle checked={false} />
                  </div>
                </div>
              </div>

              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-6 text-xl font-bold">
                  系统推送
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-brand-black mb-1 text-sm font-bold">
                      浏览器通知
                    </p>
                    <p className="text-xs text-gray-400">
                      允许 Saulgooo 在后台发送桌面通知。
                    </p>
                  </div>
                  <button className="bg-brand-black rounded-lg px-4 py-2 text-xs font-medium text-white">
                    请求权限
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY SETTINGS TAB */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-6 flex items-center gap-3 text-xl font-bold">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <Lock className="h-5 w-5 text-gray-600" />
                  </div>
                  登录安全
                </h2>

                <div className="grid max-w-md grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                      当前密码
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                      新密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="输入新密码"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none"
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="hover:text-brand-black absolute top-1/2 right-4 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button className="bg-brand-black hover:bg-brand-dark w-full rounded-xl py-3 text-sm font-medium text-white transition-colors">
                    更新密码
                  </button>
                </div>

                <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
                  <div>
                    <p className="text-brand-black mb-1 text-sm font-bold">
                      两步验证 (2FA)
                    </p>
                    <p className="text-xs text-gray-400">
                      增加一层额外的安全保护。
                    </p>
                  </div>
                  <Toggle checked={false} />
                </div>
              </div>

              <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                <h2 className="text-brand-black mb-6 text-xl font-bold">
                  活跃会话
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-4">
                      <Laptop className="h-6 w-6 text-gray-500" />
                      <div>
                        <p className="text-brand-black text-sm font-bold">
                          MacBook Pro (本设备)
                        </p>
                        <p className="text-xs text-gray-400">
                          Chrome • 北京, 中国 • 在线
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-md bg-green-100 px-2 py-1 text-xs font-bold text-green-600">
                      <Check className="h-3 w-3" /> 当前
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4">
                    <div className="flex items-center gap-4">
                      <Smartphone className="h-6 w-6 text-gray-400" />
                      <div>
                        <p className="text-sm font-bold text-gray-600">
                          iPhone 14 Pro
                        </p>
                        <p className="text-xs text-gray-400">
                          App • 上海, 中国 • 3小时前
                        </p>
                      </div>
                    </div>
                    <button className="text-xs font-medium text-red-500 hover:underline">
                      注销
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
