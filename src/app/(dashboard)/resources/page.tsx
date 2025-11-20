"use client";

import React from "react";
import {
  FileText,
  Video,
  Database,
  Download,
  Search,
  Filter,
} from "lucide-react";

export default function ResourcesPage() {
  const folders = [
    { name: "讲义模板", count: 125, icon: FileText, color: "text-blue-500" },
    { name: "数据集", count: 56, icon: Database, color: "text-purple-500" },
    { name: "实验方案", count: 89, icon: FileText, color: "text-emerald-500" },
    { name: "参考视频", count: 67, icon: Video, color: "text-rose-500" },
  ];

  const files = [
    {
      name: "机器学习课程PPT模板_v2.pptx",
      type: "演示文稿",
      size: "4.2 MB",
      updated: "2天前",
    },
    {
      name: "线性代数_习题集_A卷.docx",
      type: "文档",
      size: "1.8 MB",
      updated: "1周前",
    },
    {
      name: "Iris_数据集_清洗版.csv",
      type: "数据集",
      size: "45 KB",
      updated: "2周前",
    },
    {
      name: "实验室安全指南_2024.pdf",
      type: "PDF",
      size: "2.1 MB",
      updated: "1个月前",
    },
  ];

  return (
    <div className="h-full flex-1 overflow-y-auto bg-[#f9f9f9] p-8 md:p-12">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="mb-2 font-serif text-gray-400 italic">Library</h2>
          <h1 className="text-brand-black text-4xl font-bold tracking-tight">
            学术资源库
          </h1>
        </div>
        <button className="bg-brand-black hover:bg-brand-dark rounded-full px-6 py-3 text-sm font-medium text-white shadow-lg shadow-gray-200 transition-all hover:-translate-y-0.5">
          上传资源
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-10 flex gap-3 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索资源..."
            className="w-full rounded-xl py-3 pr-4 pl-11 text-sm placeholder-gray-400 focus:outline-none"
          />
        </div>
        <button className="flex items-center gap-2 rounded-r-xl border-l border-gray-100 px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
          <Filter className="h-4 w-4" /> 筛选
        </button>
      </div>

      {/* Categories */}
      <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {folders.map((folder, i) => (
          <div
            key={i}
            className="cursor-pointer rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-gray-300"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-2xl bg-gray-50 p-3">
                <folder.icon className={`h-5 w-5 ${folder.color}`} />
              </div>
              <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-400">
                {folder.count}
              </span>
            </div>
            <h3 className="text-brand-black text-lg font-bold">
              {folder.name}
            </h3>
          </div>
        ))}
      </div>

      {/* Recent Files Table */}
      <div className="overflow-hidden rounded-4xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-8 py-6">
          <h3 className="text-brand-black font-bold">最近添加</h3>
        </div>
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="border-b border-gray-100 text-xs font-bold tracking-wider text-gray-400 uppercase">
            <tr>
              <th className="px-8 py-5 font-medium">名称</th>
              <th className="px-8 py-5 font-medium">类型</th>
              <th className="px-8 py-5 font-medium">大小</th>
              <th className="px-8 py-5 font-medium">最后更新</th>
              <th className="px-8 py-5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {files.map((file, i) => (
              <tr key={i} className="group transition-colors hover:bg-gray-50">
                <td className="text-brand-black flex items-center gap-4 px-8 py-5 font-medium">
                  <div className="rounded-lg bg-gray-100 p-2 text-gray-500 transition-all group-hover:bg-white group-hover:shadow-sm">
                    <FileText className="h-4 w-4" />
                  </div>
                  {file.name}
                </td>
                <td className="px-8 py-5">{file.type}</td>
                <td className="px-8 py-5 font-mono text-gray-400">
                  {file.size}
                </td>
                <td className="px-8 py-5 text-gray-400">{file.updated}</td>
                <td className="px-8 py-5 text-right">
                  <button className="hover:text-brand-black rounded-full p-2 text-gray-400 transition-all hover:bg-white hover:shadow-md">
                    <Download className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
