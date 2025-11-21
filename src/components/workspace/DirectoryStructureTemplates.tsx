"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Edit, Folder, Check, X } from "lucide-react";
import { cn } from "~/lib/utils";

interface DirectoryStructureTemplatesProps {
  selectedStructure: string;
  customName: string;
  selectedFiles: string[];
  projectName?: string;
  onSelect: (type: string, name: string) => void;
}

// 预设模板配置
const STRUCTURE_TEMPLATES = {
  chapter: {
    name: "按章节组织",
    icon: Folder,
    description: "适合课程内容分章节组织",
    structure: ["01-第一章/", "02-第二章/", "03-第三章/", "04-第四章/"],
    defaultName: "章节模式",
    preview: (files: string[], projectName: string) => [
      `${projectName}/`,
      "├── CLAUDE.md",
      "├── 课程大纲.md",
      "├── 知识图谱.md",
      "├── 评估标准.md",
      "",
      "01-第一章/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
      "",
      "02-第二章/",
      "│   ├── 教案.md",
      "│   ├── 教学手册.md",
      "│   ├── 学生手册.md",
      "│   ├── 课件.md",
      "│   ├── 习题.md",
    ],
  },
  module: {
    name: "按模块组织",
    icon: Folder,
    description: "适合技能模块化教学",
    structure: [
      "module-01-基础模块/",
      "module-02-进阶模块/",
      "module-03-实践模块/",
    ],
    defaultName: "模块模式",
    preview: (files: string[], projectName: string) => [
      `${projectName}/`,
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
    ],
  },
  lesson: {
    name: "按课时组织",
    icon: Folder,
    description: "适合具体课时安排",
    structure: ["lesson-01/", "lesson-02/", "lesson-03/", "lesson-04/"],
    defaultName: "课时模式",
    preview: (files: string[], projectName: string) => [
      `${projectName}/`,
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
    ],
  },
  resource: {
    name: "按资源类型",
    icon: Folder,
    description: "按文档、练习、资源分类",
    structure: ["docs/", "exercises/", "resources/"],
    defaultName: "资源模式",
    preview: (files: string[], projectName: string) => [
      `${projectName}/`,
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
  custom: {
    name: "自定义结构",
    icon: Edit,
    description: "创建完全自定义的目录结构",
    structure: [],
    defaultName: "自定义模式",
    preview: (files: string[], projectName: string) => [
      `${projectName}/`,
      "├── CLAUDE.md",
      "├── 自定义目录/",
      "│   ├── 文件1.md",
      "│   └── 文件2.md",
    ],
  },
};

export function DirectoryStructureTemplates({
  selectedStructure,
  customName,
  selectedFiles,
  projectName = "项目名称",
  onSelect,
}: DirectoryStructureTemplatesProps) {
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [customStructureName, setCustomStructureName] = useState(
    customName || "",
  );

  const handleTemplateSelect = (type: string) => {
    if (type === "custom") {
      if (!customStructureName.trim()) {
        // 要求输入自定义结构名称
        const name = prompt("请输入自定义目录结构名称:");
        if (name?.trim()) {
          setCustomStructureName(name.trim());
          onSelect("custom", name.trim());
        }
      } else {
        onSelect("custom", customStructureName);
      }
    } else {
      onSelect(
        type,
        STRUCTURE_TEMPLATES[type as keyof typeof STRUCTURE_TEMPLATES]
          .defaultName,
      );
    }
  };

  const handleCustomNameEdit = () => {
    setEditingTemplate("custom");
  };

  const handleCustomNameSave = () => {
    if (customStructureName.trim() && selectedStructure === "custom") {
      onSelect("custom", customStructureName.trim());
    }
    setEditingTemplate(null);
  };

  const handleCustomNameCancel = () => {
    setCustomStructureName(customName || "");
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* 模板选择 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(STRUCTURE_TEMPLATES).map(([type, template]) => {
          const Icon = template.icon;
          const isSelected = selectedStructure === type;

          return (
            <div
              key={type}
              className={cn(
                "relative cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-md",
                isSelected
                  ? "border-black bg-gray-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300",
              )}
              onClick={() => handleTemplateSelect(type)}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "rounded-lg p-3",
                    isSelected
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">
                      {template.name}
                    </h4>
                    {isSelected && <Check className="h-4 w-4 text-green-600" />}
                  </div>

                  <p className="mb-3 text-sm text-gray-600">
                    {template.description}
                  </p>

                  {/* 自定义名称编辑 */}
                  {type === "custom" && (
                    <div className="mt-3">
                      {editingTemplate === "custom" ? (
                        <div className="flex gap-2">
                          <Input
                            value={customStructureName}
                            onChange={(e) =>
                              setCustomStructureName(e.target.value)
                            }
                            placeholder="输入自定义结构名称"
                            className="flex-1 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomNameSave();
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomNameCancel();
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {customName || "点击编辑自定义名称"}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomNameEdit();
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 选中模板的预览 */}
      {selectedStructure && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h4 className="mb-4 text-lg font-semibold text-gray-900">
            目录结构预览
          </h4>
          <div className="overflow-x-auto">
            <div className="min-w-fit rounded-lg bg-gray-900 p-4 font-mono text-sm text-green-400">
              <pre className="whitespace-pre">
                {STRUCTURE_TEMPLATES[
                  selectedStructure as keyof typeof STRUCTURE_TEMPLATES
                ]
                  .preview(selectedFiles, projectName)
                  .join("\n")}
              </pre>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            * 预览基于当前选择的文件和模板结构
          </p>
        </div>
      )}
    </div>
  );
}
