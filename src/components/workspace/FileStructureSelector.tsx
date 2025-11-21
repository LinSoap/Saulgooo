"use client";

import { cn } from "~/lib/utils";
import {
  Folder,
  Edit,
  Check,
  FileText,
  Layers,
  BookOpen,
  Package,
} from "lucide-react";

interface FileStructureSelectorProps {
  selectedStructure: string;
  projectName?: string;
  onSelect: (type: string) => void;
}

// 文件结构模板定义
const FILE_STRUCTURES = {
  syllabus_chapter: {
    name: "课程大纲 + 章节组织",
    icon: BookOpen,
    description: "包含完整课程大纲，按章节组织内容",
    structure: [
      "项目名称/",
      "├── CLAUDE.md",
      "├── 课程大纲.md",
      "├── 知识图谱.md",
      "├── 评估标准.md",
      "",
      "01-第一章-基础概念/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
      "",
      "02-第二章-核心知识/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
      "",
      "03-第三章-实践应用/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
    ],
  },
  course_module: {
    name: "课程 + 模块组织",
    icon: Layers,
    description: "完整课程体系，按模块划分技能点",
    structure: [
      "项目名称/",
      "├── CLAUDE.md",
      "├── 课程大纲.md",
      "├── 知识图谱.md",
      "├── 评估标准.md",
      "",
      "module-01-基础模块/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
      "",
      "module-02-进阶模块/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
      "",
      "module-03-实战模块/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
    ],
  },
  lesson_based: {
    name: "课时制教学",
    icon: Folder,
    description: "按课时详细安排，适合具体教学计划",
    structure: [
      "项目名称/",
      "├── CLAUDE.md",
      "├── 课程大纲.md",
      "├── 知识图谱.md",
      "├── 评估标准.md",
      "",
      "lesson-01/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
      "",
      "lesson-02/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
      "",
      "lesson-03/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
      "",
      "lesson-04/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
    ],
  },
  resource_organized: {
    name: "资源分类管理",
    icon: Package,
    description: "按文档、练习、资源类型分类管理",
    structure: [
      "项目名称/",
      "├── CLAUDE.md",
      "",
      "docs/",
      "│   ├── 课程大纲.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 知识图谱.md",
      "",
      "exercises/",
      "│   ├── 习题.md",
      "",
      "resources/",
      "│   ├── 课件.md",
      "│   ├── 评估标准.md",
    ],
  },
  simple_manual: {
    name: "简化手册模式",
    icon: Edit,
    description: "精简版本，主要包含核心教学文件",
    structure: [
      "项目名称/",
      "├── CLAUDE.md",
      "├── 课程大纲.md",
      "├── 教学手册.md",
      "├── 学生手册.md",
      "├── 课件.md",
    ],
  },
};

export function FileStructureSelector({
  selectedStructure,
  projectName = "项目名称",
  onSelect,
}: FileStructureSelectorProps) {
  return (
    <div className="space-y-6">
      {/* 模板选择 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(FILE_STRUCTURES).map(([type, template]) => {
          const Icon = template.icon;
          const isSelected = selectedStructure === type;

          return (
            <div
              key={type}
              className={cn(
                "group relative cursor-pointer rounded-4xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-xl",
                isSelected &&
                  "border-brand-black scale-[1.02] bg-gray-50 shadow-xl",
              )}
              onClick={() => onSelect(type)}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "rounded-2xl p-3 transition-all duration-300",
                    isSelected
                      ? "bg-brand-black text-white"
                      : "bg-gray-100 text-gray-600 group-hover:bg-gray-200",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-base font-semibold text-gray-900 transition-colors group-hover:text-gray-800">
                      {template.name}
                    </h4>
                    {isSelected && <Check className="h-4 w-4 text-green-600" />}
                  </div>

                  <p className="text-sm leading-relaxed text-gray-600">
                    {template.description}
                  </p>
                </div>
              </div>

              {/* 选中状态指示器 */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="bg-brand-black h-3 w-3 rounded-full"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 选中模板的预览 */}
      {selectedStructure && (
        <div className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-gray-200 hover:shadow-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-2">
              <FileText className="h-5 w-5 text-gray-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900">目录结构预览</h4>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-blue-50/80 to-indigo-50/60"></div>
            <div className="relative overflow-x-auto rounded-2xl border border-blue-100 bg-linear-to-br from-slate-50 to-blue-50/30 p-6 font-mono text-sm">
              <div className="text-slate-700">
                <pre className="leading-relaxed whitespace-pre">
                  {FILE_STRUCTURES[
                    selectedStructure as keyof typeof FILE_STRUCTURES
                  ].structure.map((line, index) => (
                    <span
                      key={index}
                      className={cn(
                        "block transition-all duration-200",
                        line.trim() === ""
                          ? "h-2"
                          : "-mx-2 rounded px-2 py-1 transition-all hover:border-l-2 hover:border-blue-300 hover:bg-blue-100/50 hover:text-slate-800",
                      )}
                    >
                      {line.replace(
                        "项目名称/",
                        `${projectName || "项目名称"}/`,
                      )}
                    </span>
                  ))}
                </pre>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              * 预览基于选中的文件结构模板
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
              <span>已选中模板</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
