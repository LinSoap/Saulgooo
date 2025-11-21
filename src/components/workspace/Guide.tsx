"use client";

import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { FileStructureSelector } from "./FileStructureSelector";
import { cn } from "~/lib/utils";

// 常量定义 - 提取到单独文件更佳
export const GUIDE_OPTIONS = {
  aiRole: [
    {
      value: "academic",
      label: "严谨学术型 - 语言规范、逻辑严密，适合高校/科研",
    },
    {
      value: "persuasive",
      label: "循循善诱型 - 亲切耐心、多引导提问，适合K12/辅导",
    },
    {
      value: "humorous",
      label: "幽默风趣型 - 轻松活泼、多用比喻，适合科普/兴趣",
    },
    {
      value: "professional",
      label: "职业实战型 - 干货为主、强调应用，适合职业培训",
    },
    { value: "custom", label: "自定义风格" },
  ],
  standardDuration: [
    { value: "45", label: "45分钟" },
    { value: "60", label: "60分钟" },
    { value: "90", label: "90分钟" },
    { value: "other", label: "其他" },
  ],
  teachingGoals: [
    { value: "knowledge", label: "知识目标（理论掌握）" },
    { value: "skill", label: "技能目标（能力培养）" },
    { value: "application", label: "应用目标（实践任务）" },
    { value: "advanced", label: "进阶目标（拓展内容）" },
  ],
  projectComplexity: [
    { value: "entry", label: "入门" },
    { value: "intermediate", label: "中级" },
    { value: "advanced", label: "高级" },
    { value: "enterprise", label: "企业级" },
  ],
  interactionTiming: [
    { value: "before_project", label: "创建项目前" },
    { value: "during_outline", label: "生成大纲时" },
    { value: "before_chapter", label: "生成每章内容前" },
    { value: "key_decisions", label: "遇到关键决策点时" },
    { value: "completion", label: "完成整个项目时" },
  ],
  workflow: [
    {
      value: "iterative",
      label: "迭代式 - 先生成大纲，用户确认后再逐个生成正文（推荐）",
    },
    { value: "direct", label: "直出式 - 根据主题直接生成完整内容（速度快）" },
    { value: "correction", label: "纠错/润色式 - 用户提供草稿，AI进行优化" },
    { value: "guided", label: "引导式 - AI通过不断提问来引导用户完成内容创作" },
  ],
};

export const FILE_STRUCTURES = {
  syllabus_chapter: {
    name: "课程大纲 + 章节组织",
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

// 统一的表单字段接口
interface FormFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  required?: boolean;
}

// 基础输入字段组件
function FormInput({
  value,
  onChange,
  placeholder,
  label,
  required,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={label}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Input
        id={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white"
      />
    </div>
  );
}

// 多选框组件
function MultiSelectField({
  label,
  options,
  selectedValues,
  onChange,
  selectAll,
}: {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (value: string, checked: boolean) => void;
  selectAll?: () => void;
}) {
  const isAllSelected = selectedValues.length === options.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {selectAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="text-xs text-gray-500 hover:text-black"
          >
            {isAllSelected ? "取消全选" : "全选"}
          </Button>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={option.value}
              checked={selectedValues.includes(option.value)}
              onChange={(e) => onChange(option.value, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <label htmlFor={option.value} className="text-sm font-medium">
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// 单选组件 - 改进版
function OptimizedRadioGroup({
  value,
  onValueChange,
  options,
  name,
}: {
  value: string;
  onValueChange: (val: string) => void;
  options: { value: string; label: string }[];
  name: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex cursor-pointer items-start space-x-3 rounded-xl border p-4 transition-all hover:bg-gray-50",
            value === option.value
              ? "border-black bg-gray-50 ring-1 ring-black"
              : "border-gray-200 bg-white hover:border-gray-300",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onValueChange(e.target.value)}
            className="mt-0.5 h-4 w-4 shrink-0 border-gray-300 text-black focus:ring-black"
          />
          <span className="text-sm font-medium text-gray-900">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

// 表单数据类型定义
interface GuideFormData {
  projectName: string;
  subject: string;
  audience: string;
  lessonDuration: string;
  standardDuration: string;
  teachingGoals: string[];
  theoryPracticeRatio: number;
  projectComplexity: string;
  fileStruct: string;
  aiRole: string;
  aiRoleCustom: string;
  interactionTiming: string[];
  workflow: string;
  specialInstructions: string;
}

// 表单区域组件
function FormSection({
  title,
  description,
  color,
  children,
}: {
  title: string;
  description: string;
  color: "blue" | "green" | "purple" | "gray";
  children: React.ReactNode;
}) {
  const colorClasses = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    purple: "border-l-purple-500",
    gray: "border-l-gray-400",
  };

  return (
    <section className="space-y-6">
      <div className={cn("border-l-4 pl-4", colorClasses[color])}>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

// 卡片容器组件
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-6">
      {children}
    </div>
  );
}

// 第一部分：基本信息
function BasicInfoSection({
  formData,
  onChange,
}: {
  formData: GuideFormData;
  onChange: (
    field: keyof GuideFormData,
    value: string | number | string[],
  ) => void;
}) {
  return (
    <FormSection
      title="1. 空间基本信息"
      description="定义课程的核心信息和教学目标"
      color="blue"
    >
      <Card>
        <h3 className="text-lg font-medium text-gray-900">基础信息</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            label="课程名称"
            value={formData.projectName}
            onChange={(value) => onChange("projectName", value)}
            placeholder="例如：Python 数据分析基础"
          />
          <FormInput
            label="学科"
            value={formData.subject}
            onChange={(value) => onChange("subject", value)}
            placeholder="例如：计算机科学、K12数学、企业管理"
          />
        </div>
        <FormInput
          label="受众"
          value={formData.audience}
          onChange={(value) => onChange("audience", value)}
          placeholder="例如：零基础大学生、5-8岁儿童、企业中高层管理者"
        />
      </Card>

      <Card>
        <h3 className="text-lg font-medium text-gray-900">教学设置</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lessonDuration">单课时长（分钟）</Label>
            <Input
              id="lessonDuration"
              type="number"
              value={formData.lessonDuration}
              onChange={(e) => onChange("lessonDuration", e.target.value)}
              placeholder="例如：45"
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label>标准课时</Label>
            <div className="flex flex-wrap gap-2">
              {GUIDE_OPTIONS.standardDuration.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={
                    formData.standardDuration === opt.value
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    onChange("standardDuration", opt.value);
                    if (opt.value !== "other") {
                      onChange("lessonDuration", opt.value);
                    }
                  }}
                  className={cn(
                    formData.standardDuration === opt.value
                      ? "bg-black text-white"
                      : "bg-white",
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <MultiSelectField
          label="教学目标类型（可多选）"
          options={GUIDE_OPTIONS.teachingGoals}
          selectedValues={formData.teachingGoals}
          onChange={(value, checked) => {
            const current = formData.teachingGoals;
            const updated = checked
              ? [...current, value]
              : current.filter((item: string) => item !== value);
            onChange("teachingGoals", updated);
          }}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>理论实践比例</Label>
              <span className="text-sm font-medium text-gray-500">
                理论 {formData.theoryPracticeRatio}% : 实践{" "}
                {100 - formData.theoryPracticeRatio}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.theoryPracticeRatio}
              onChange={(e) =>
                onChange("theoryPracticeRatio", parseInt(e.target.value))
              }
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black"
            />
          </div>
          <div className="space-y-2">
            <Label>项目复杂度</Label>
            <div className="flex flex-wrap gap-2">
              {GUIDE_OPTIONS.projectComplexity.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={
                    formData.projectComplexity === opt.value
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => onChange("projectComplexity", opt.value)}
                  className={cn(
                    formData.projectComplexity === opt.value
                      ? "bg-black text-white"
                      : "bg-white",
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </FormSection>
  );
}

// 第二部分：项目结构
function ProjectStructureSection({
  formData,
  onChange,
}: {
  formData: GuideFormData;
  onChange: (field: keyof GuideFormData, value: string) => void;
}) {
  return (
    <FormSection
      title="2. 项目结构"
      description="选择合适的文件结构模板"
      color="green"
    >
      <Card>
        <FileStructureSelector
          selectedStructure={formData.fileStruct}
          projectName={formData.projectName}
          onSelect={(type) => onChange("fileStruct", type)}
        />
      </Card>
    </FormSection>
  );
}

// 第三部分：AI偏好
function AIPreferenceSection({
  formData,
  onChange,
}: {
  formData: GuideFormData;
  onChange: (field: keyof GuideFormData, value: string | string[]) => void;
}) {
  return (
    <FormSection
      title="3. AI偏好"
      description="定义AI助手的行为模式和交互方式"
      color="purple"
    >
      <Card>
        <h3 className="text-lg font-medium text-gray-900">语气和风格</h3>
        <div className="space-y-3">
          <Label className="text-base font-medium text-gray-700">
            请选择AI的教学角色与语气风格
          </Label>
          <OptimizedRadioGroup
            name="aiRole"
            value={formData.aiRole}
            onValueChange={(val) => onChange("aiRole", val)}
            options={GUIDE_OPTIONS.aiRole}
          />
          {formData.aiRole === "custom" && (
            <FormInput
              label="aiRoleCustom"
              value={formData.aiRoleCustom}
              onChange={(value) => onChange("aiRoleCustom", value)}
              placeholder="请输入自定义角色风格"
            />
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-medium text-gray-900">交互规则</h3>
        <MultiSelectField
          label="何时需要与用户交互（可多选）"
          options={GUIDE_OPTIONS.interactionTiming}
          selectedValues={formData.interactionTiming}
          onChange={(value, checked) => {
            const current = formData.interactionTiming;
            const updated = checked
              ? [...current, value]
              : current.filter((item: string) => item !== value);
            onChange("interactionTiming", updated);
          }}
          selectAll={() => {
            const allValues = GUIDE_OPTIONS.interactionTiming.map(
              (o) => o.value,
            );
            const isAllSelected = allValues.every((v) =>
              formData.interactionTiming.includes(v),
            );
            onChange("interactionTiming", isAllSelected ? [] : allValues);
          }}
        />
      </Card>

      <Card>
        <h3 className="text-lg font-medium text-gray-900">工作流偏好</h3>
        <div className="space-y-3">
          <Label className="text-base font-medium text-gray-700">
            请选择内容生成的工作流模式
          </Label>
          <OptimizedRadioGroup
            name="workflow"
            value={formData.workflow}
            onValueChange={(val) => onChange("workflow", val)}
            options={GUIDE_OPTIONS.workflow}
          />
        </div>
      </Card>
    </FormSection>
  );
}

// 第四部分：特殊指令
function SpecialInstructionsSection({
  formData,
  onChange,
}: {
  formData: GuideFormData;
  onChange: (field: keyof GuideFormData, value: string) => void;
}) {
  return (
    <FormSection
      title="4. 特殊指令（可选）"
      description="添加任何特殊的约束和要求"
      color="gray"
    >
      <Card>
        <div className="space-y-2">
          <Label htmlFor="specialInstructions">
            请输入任何特殊的指令或约束
          </Label>
          <Textarea
            id="specialInstructions"
            value={formData.specialInstructions}
            onChange={(e) => onChange("specialInstructions", e.target.value)}
            placeholder="例如：\n- '所有数学公式必须使用LaTeX格式'\n- '每个案例必须来自实际企业'\n- '生成内容必须包含中文和英文对照'..."
            className="min-h-[150px] bg-white"
          />
        </div>
      </Card>
    </FormSection>
  );
}

// 主组件 - 大幅简化
export function Guide() {
  const [formData, setFormData] = useState({
    projectName: "",
    subject: "",
    audience: "",
    lessonDuration: "",
    standardDuration: "",
    teachingGoals: [] as string[],
    theoryPracticeRatio: 50,
    projectComplexity: "",
    fileStruct: "",
    aiRole: "",
    aiRoleCustom: "",
    interactionTiming: [] as string[],
    workflow: "",
    specialInstructions: "",
  });

  const handleFieldChange = (
    field: keyof GuideFormData,
    value: string | number | string[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const selectedStructure =
      FILE_STRUCTURES[formData.fileStruct as keyof typeof FILE_STRUCTURES];
    const prompt = `请使用’create_claude_md‘subagent。请根据以下配置生成一份 CLAUDE.md 项目指导文件：

# 1. 空间基本信息
- 课程/项目名称：${formData.projectName}
- 学科领域：${formData.subject}
- 目标受众：${formData.audience}
- 单课时长：${formData.lessonDuration}分钟 (标准：${GUIDE_OPTIONS.standardDuration.find((o) => o.value === formData.standardDuration)?.label})
- 教学目标：${formData.teachingGoals.map((v) => GUIDE_OPTIONS.teachingGoals.find((o) => o.value === v)?.label).join(", ")}
- 理论实践比例：理论 ${formData.theoryPracticeRatio}% : 实践 ${100 - formData.theoryPracticeRatio}%
- 项目复杂度：${GUIDE_OPTIONS.projectComplexity.find((o) => o.value === formData.projectComplexity)?.label}

# 2. 项目结构
- 项目名称：${formData.projectName}
- 文件结构：
\`\`\`
${formData.projectName}/
${selectedStructure?.structure?.join("\n") || "项目目录结构"}
\`\`\`

# 3. AI偏好
- 语气风格：${GUIDE_OPTIONS.aiRole.find((o) => o.value === formData.aiRole)?.label}
${formData.aiRole === "custom" ? `- 自定义风格：${formData.aiRoleCustom}` : ""}
- 交互时机：${formData.interactionTiming.map((v) => GUIDE_OPTIONS.interactionTiming.find((o) => o.value === v)?.label).join(", ")}
- 工作流模式：${GUIDE_OPTIONS.workflow.find((o) => o.value === formData.workflow)?.label}

# 4. 特殊指令
${formData.specialInstructions || "无"}

请基于以上信息，生成一份完整的 CLAUDE.md 文件，包含具体的 Prompt 规则和文件模板。`;

    const event = new CustomEvent("saulgooo:insert-prompt", {
      detail: { prompt },
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex h-full w-full justify-center overflow-y-auto bg-white p-4 md:p-8">
      <div className="w-full max-w-3xl space-y-8 pb-20">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Sparkles className="h-4 w-4" />
            <span>Claude.md 生成助手</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            项目配置向导
          </h1>
          <p className="text-lg text-gray-500">
            请填写以下信息，帮助 AI 定义项目的行为规范和工作流程。
          </p>
        </div>

        <div className="space-y-12">
          <BasicInfoSection formData={formData} onChange={handleFieldChange} />
          <ProjectStructureSection
            formData={formData}
            onChange={handleFieldChange}
          />
          <AIPreferenceSection
            formData={formData}
            onChange={handleFieldChange}
          />
          <SpecialInstructionsSection
            formData={formData}
            onChange={handleFieldChange}
          />
        </div>

        <div className="sticky bottom-6 z-10 flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            className="rounded-full bg-black px-8 text-white shadow-lg transition-all hover:scale-105 hover:bg-gray-800"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            生成 Claude.md 配置
          </Button>
        </div>
      </div>
    </div>
  );
}
