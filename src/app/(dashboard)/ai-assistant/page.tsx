"use client";

import React from "react";
import {
  Sparkles,
  BookOpen,
  FileCheck,
  PenTool,
  Calculator,
  Languages,
  History,
  ChevronRight,
} from "lucide-react";

export default function AIAssistantPage() {
  const tools = [
    {
      icon: BookOpen,
      title: "课程大纲生成",
      desc: "创建符合认证标准的结构化课程大纲。",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: FileCheck,
      title: "论文批注助手",
      desc: "分析学生论文的结构、语法及潜在的抄袭问题。",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: PenTool,
      title: "LaTeX 助手",
      desc: "将自然语言转换为复杂的数学公式和表格代码。",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      icon: Calculator,
      title: "数据分析",
      desc: "针对研究数据进行统计处理并生成可视化图表。",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: Languages,
      title: "学术翻译",
      desc: "多语言课程材料的学术级精准翻译。",
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  const history = [
    { title: "优化《数据结构》课程大纲", time: "2小时前" },
    { title: "生成期中考试题库 (B卷)", time: "昨天" },
    { title: "LaTeX 公式批量格式化", time: "3天前" },
  ];

  return (
    <div className="h-full flex-1 overflow-y-auto bg-[#f9f9f9] p-8 md:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h2 className="mb-2 font-serif text-gray-400 italic">Tools</h2>
          <h1 className="text-brand-black text-4xl font-bold tracking-tight">
            AI 学术助手中心
          </h1>
        </div>

        {/* Hero Card */}
        <div className="bg-brand-black relative mb-12 overflow-hidden rounded-4xl p-10 text-white shadow-2xl">
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl border border-white/10 bg-white/10 p-2 backdrop-blur-md">
                <Sparkles className="h-6 w-6 text-yellow-300" />
              </div>
              <h2 className="text-2xl font-semibold">随时为您服务，教授。</h2>
            </div>
            <p className="mb-8 max-w-2xl text-lg leading-relaxed font-light text-gray-300">
              无论您需要起草新的课程内容、设计测验，还是分析研究论文，我的知识库已更新至最新的学术标准。
            </p>
            <div className="flex gap-4">
              <button className="transform rounded-full bg-white px-8 py-3 font-medium text-black shadow-lg transition-colors hover:-translate-y-0.5 hover:bg-gray-100">
                开始新对话
              </button>
              <button className="rounded-full border border-white/20 bg-white/10 px-8 py-3 font-medium text-white transition-colors hover:bg-white/20">
                查看使用指南
              </button>
            </div>
          </div>
          {/* Decor */}
          <div className="bg-brand-accent/30 absolute top-0 right-0 h-96 w-96 translate-x-1/3 -translate-y-1/2 rounded-full blur-3xl"></div>
        </div>

        {/* Tools Grid */}
        <h3 className="mb-6 text-xs font-bold tracking-widest text-gray-400 uppercase">
          学术工具集
        </h3>
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, index) => (
            <button
              key={index}
              className="group rounded-4xl border border-gray-100 bg-white p-8 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl"
            >
              <div
                className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${tool.bg} transition-transform duration-300 group-hover:scale-110`}
              >
                <tool.icon className={`h-7 w-7 ${tool.color}`} />
              </div>
              <h4 className="text-brand-black mb-3 text-xl font-bold">
                {tool.title}
              </h4>
              <p className="text-sm leading-relaxed text-gray-500">
                {tool.desc}
              </p>
            </button>
          ))}
        </div>

        {/* History */}
        <div className="overflow-hidden rounded-4xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-50 bg-white px-8 py-6">
            <h3 className="text-brand-black flex items-center gap-2 font-semibold">
              <History className="h-5 w-5 text-gray-400" /> 最近活动
            </h3>
            <button className="text-brand-black text-sm font-medium decoration-gray-300 underline-offset-4 hover:underline">
              查看全部
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="group flex cursor-pointer items-center justify-between px-8 py-5 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="group-hover:bg-brand-accent h-2 w-2 rounded-full bg-gray-300 transition-colors"></div>
                  <span className="text-lg font-medium text-gray-700">
                    {item.title}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-mono text-sm text-gray-400">
                    {item.time}
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-300 transition-colors group-hover:text-black" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
