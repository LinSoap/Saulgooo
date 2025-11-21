"use client";

import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { Sparkles, Plus, X } from "lucide-react";
import { cn } from "~/lib/utils";

// 选项定义
const OPTIONS = {
  coreFiles: [
    { value: "syllabus", label: "课程大纲.md - 整体教学规划 (Syllabus)" },
    { value: "knowledge_graph", label: "知识图谱.md - 知识点层级与关系" },
    {
      value: "lesson_plan",
      label: "教案.md - 教学设计文件（目标、重点、活动）",
    },
    {
      value: "teacher_manual",
      label: "教学手册.md - 教师操作手册（脚本、时间、检查点）",
    },
    {
      value: "student_manual",
      label: "学生手册.md - 学生指导手册（目标、步骤、提交物）",
    },
    { value: "courseware", label: "课件.md - 课件大纲/PPT结构" },
    { value: "exercises", label: "习题.md - 练习和作业" },
    { value: "assessment", label: "评估标准.md - 评价体系" },
  ],
  directoryStructure: [
    { value: "chapter", label: "按章节组织 (01-章节名/02-章节名/)" },
    { value: "module", label: "按模块组织 (module-1/module-2/)" },
    { value: "lesson", label: "按课时组织 (lesson-1/lesson-2/)" },
    { value: "resource", label: "按资源类型 (docs/exercises/resources/)" },
    { value: "custom", label: "自定义结构" },
  ],
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

// 简单的 RadioGroup 组件
function RadioGroup({
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

export function Guide() {
  const [formData, setFormData] = useState({
    // Step 1: 基础信息
    projectName: "",
    subject: "",
    audience: "",
    // Step 2: 核心文件
    coreFiles: [] as string[],
    coreFilesCustom: [] as string[],
    newCustomFile: "",
    // Step 3: 目录结构
    directoryStructure: "",
    directoryStructureCustom: "",
    // Step 4: AI角色
    aiRole: "",
    aiRoleCustom: "",
    // Step 5: 教学上下文
    lessonDuration: "",
    standardDuration: "",
    teachingGoals: [] as string[],
    theoryPracticeRatio: 50, // 0-100, represents theory percentage
    projectComplexity: "",
    // Step 6: 交互规则
    interactionTiming: [] as string[],
    // Step 7: 工作流
    workflow: "",
    // Step 8: 特殊指令
    specialInstructions: "",
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (
    field: "coreFiles" | "teachingGoals" | "interactionTiming",
    value: string,
    checked: boolean,
  ) => {
    setFormData((prev) => {
      const current = prev[field];
      if (checked) {
        return { ...prev, [field]: [...current, value] };
      } else {
        return { ...prev, [field]: current.filter((item) => item !== value) };
      }
    });
  };

  const handleSelectAll = (
    field: "coreFiles" | "interactionTiming",
    options: { value: string }[],
  ) => {
    setFormData((prev) => {
      const allValues = options.map((o) => o.value);
      const currentValues = prev[field];
      const isAllSelected = allValues.every((v) => currentValues.includes(v));

      if (isAllSelected) {
        return { ...prev, [field]: [] };
      } else {
        return { ...prev, [field]: allValues };
      }
    });
  };

  const addCustomFile = () => {
    if (formData.newCustomFile.trim()) {
      setFormData((prev) => ({
        ...prev,
        coreFilesCustom: [...prev.coreFilesCustom, prev.newCustomFile.trim()],
        newCustomFile: "",
      }));
    }
  };

  const removeCustomFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      coreFilesCustom: prev.coreFilesCustom.filter((_, i) => i !== index),
    }));
  };

  const handleStandardDurationClick = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      standardDuration: value,
      lessonDuration: value === "other" ? prev.lessonDuration : value,
    }));
  };

  const handleSubmit = () => {
    // 构建 Prompt
    const prompt = `请根据以下配置生成一份 CLAUDE.md 项目指导文件：

# 1. 基础信息
- 课程/项目名称：${formData.projectName}
- 学科领域：${formData.subject}
- 目标受众：${formData.audience}

# 2. 核心文件定义
- 需要生成的文件：${formData.coreFiles.map((v) => OPTIONS.coreFiles.find((o) => o.value === v)?.label).join(", ")}
${formData.coreFilesCustom.length > 0 ? `- 其他文件：${formData.coreFilesCustom.join(", ")}` : ""}

# 3. 目录结构规则
- 组织方式：${OPTIONS.directoryStructure.find((o) => o.value === formData.directoryStructure)?.label}
${formData.directoryStructure === "custom" ? `- 自定义结构：${formData.directoryStructureCustom}` : ""}

# 4. AI角色与语气
- 角色风格：${OPTIONS.aiRole.find((o) => o.value === formData.aiRole)?.label}
${formData.aiRole === "custom" ? `- 自定义风格：${formData.aiRoleCustom}` : ""}

# 5. 教学上下文
- 单课时长：${formData.lessonDuration}分钟 (标准：${OPTIONS.standardDuration.find((o) => o.value === formData.standardDuration)?.label})
- 教学目标：${formData.teachingGoals.map((v) => OPTIONS.teachingGoals.find((o) => o.value === v)?.label).join(", ")}
- 理论实践比例：理论 ${formData.theoryPracticeRatio}% : 实践 ${100 - formData.theoryPracticeRatio}%
- 项目复杂度：${OPTIONS.projectComplexity.find((o) => o.value === formData.projectComplexity)?.label}

# 6. 交互规则
- 交互时机：${formData.interactionTiming.map((v) => OPTIONS.interactionTiming.find((o) => o.value === v)?.label).join(", ")}
- 交互方式：提供默认选项
- 解释详细度：简洁说明

# 7. 工作流偏好
- 模式：${OPTIONS.workflow.find((o) => o.value === formData.workflow)?.label}

# 8. 特殊指令
${formData.specialInstructions || "无"}

请基于以上信息，生成一份完整的 CLAUDE.md 文件，包含具体的 Prompt 规则和文件模板。`;

    // 触发自定义事件
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

        <div className="space-y-10">
          {/* 第1步：基础信息 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              第一步：基础信息
            </h3>
            <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-6">
              <div className="space-y-2">
                <Label htmlFor="projectName">课程/项目名称</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) =>
                    handleInputChange("projectName", e.target.value)
                  }
                  placeholder="例如：Python 数据分析基础"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">学科领域</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder="例如：计算机科学、K12数学、企业管理"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">目标受众画像</Label>
                <Input
                  id="audience"
                  value={formData.audience}
                  onChange={(e) =>
                    handleInputChange("audience", e.target.value)
                  }
                  placeholder="例如：零基础大学生、5-8岁儿童、企业中高层管理者"
                  className="bg-white"
                />
              </div>
            </div>
          </section>

          {/* 第2步：核心文件定义 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              第二步：核心文件定义
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium text-gray-700">
                  请定义您需要的核心文件类型（可多选）
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleSelectAll("coreFiles", OPTIONS.coreFiles)
                  }
                  className="text-xs text-gray-500 hover:text-black"
                >
                  {formData.coreFiles.length === OPTIONS.coreFiles.length
                    ? "取消全选"
                    : "全选"}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {OPTIONS.coreFiles.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex items-start space-x-3 rounded-xl border p-4 transition-all hover:bg-gray-50",
                      formData.coreFiles.includes(option.value)
                        ? "border-black bg-gray-50 ring-1 ring-black"
                        : "border-gray-200 bg-white hover:border-gray-300",
                    )}
                  >
                    <Checkbox
                      id={`core-${option.value}`}
                      checked={formData.coreFiles.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(
                          "coreFiles",
                          option.value,
                          checked as boolean,
                        )
                      }
                      className="mt-0.5 data-[state=checked]:border-black data-[state=checked]:bg-black"
                    />
                    <label
                      htmlFor={`core-${option.value}`}
                      className="w-full cursor-pointer pt-0.5 text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>

              {/* 其他文件列表 */}
              <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <Label className="text-sm font-medium text-gray-700">
                  其他文件（可选）
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.newCustomFile}
                    onChange={(e) =>
                      handleInputChange("newCustomFile", e.target.value)
                    }
                    placeholder="输入文件名，例如：实验报告.md"
                    className="bg-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomFile();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addCustomFile}
                    variant="outline"
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </Button>
                </div>
                {formData.coreFilesCustom.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.coreFilesCustom.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm shadow-sm ring-1 ring-gray-200"
                      >
                        <span>{file}</span>
                        <button
                          onClick={() => removeCustomFile(index)}
                          className="ml-1 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 第3步：目录结构规则 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              第三步：目录结构规则
            </h3>
            <div className="space-y-3">
              <Label className="text-base font-medium text-gray-700">
                选择文件组织方式
              </Label>
              <RadioGroup
                name="directoryStructure"
                value={formData.directoryStructure}
                onValueChange={(val) =>
                  handleInputChange("directoryStructure", val)
                }
                options={OPTIONS.directoryStructure}
              />
              {formData.directoryStructure === "custom" && (
                <div className="mt-2">
                  <Input
                    value={formData.directoryStructureCustom}
                    onChange={(e) =>
                      handleInputChange(
                        "directoryStructureCustom",
                        e.target.value,
                      )
                    }
                    placeholder="请输入自定义目录结构"
                    className="bg-white"
                  />
                </div>
              )}
            </div>
          </section>

          {/* 第4步：AI角色与语气 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              第四步：AI角色与语气
            </h3>
            <div className="space-y-3">
              <Label className="text-base font-medium text-gray-700">
                请选择AI的教学角色与语气风格
              </Label>
              <RadioGroup
                name="aiRole"
                value={formData.aiRole}
                onValueChange={(val) => handleInputChange("aiRole", val)}
                options={OPTIONS.aiRole}
              />
              {formData.aiRole === "custom" && (
                <div className="mt-2">
                  <Input
                    value={formData.aiRoleCustom}
                    onChange={(e) =>
                      handleInputChange("aiRoleCustom", e.target.value)
                    }
                    placeholder="请输入自定义角色风格"
                    className="bg-white"
                  />
                </div>
              )}
            </div>
          </section>

          {/* 第5步：教学上下文 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              第五步：教学上下文
            </h3>
            <div className="space-y-6 rounded-xl border border-gray-200 bg-gray-50/50 p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lessonDuration">单课时长（分钟）</Label>
                  <Input
                    id="lessonDuration"
                    type="number"
                    value={formData.lessonDuration}
                    onChange={(e) =>
                      handleInputChange("lessonDuration", e.target.value)
                    }
                    placeholder="例如：45"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>标准课时</Label>
                  <div className="flex flex-wrap gap-2">
                    {OPTIONS.standardDuration.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={
                          formData.standardDuration === opt.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleStandardDurationClick(opt.value)}
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

              <div className="space-y-2">
                <Label>教学目标类型（可多选）</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {OPTIONS.teachingGoals.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`goal-${option.value}`}
                        checked={formData.teachingGoals.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(
                            "teachingGoals",
                            option.value,
                            checked as boolean,
                          )
                        }
                      />
                      <label
                        htmlFor={`goal-${option.value}`}
                        className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

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
                      handleInputChange(
                        "theoryPracticeRatio",
                        parseInt(e.target.value),
                      )
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black"
                  />
                </div>
                <div className="space-y-2">
                  <Label>项目复杂度</Label>
                  <div className="flex flex-wrap gap-2">
                    {OPTIONS.projectComplexity.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={
                          formData.projectComplexity === opt.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          handleInputChange("projectComplexity", opt.value)
                        }
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
            </div>
          </section>

          {/* 第6步：交互规则设置 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              第六步：交互规则设置
            </h3>
            <div className="space-y-6 rounded-xl border border-gray-200 bg-gray-50/50 p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>何时需要与用户交互（可多选）</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleSelectAll(
                        "interactionTiming",
                        OPTIONS.interactionTiming,
                      )
                    }
                    className="text-xs text-gray-500 hover:text-black"
                  >
                    {formData.interactionTiming.length ===
                    OPTIONS.interactionTiming.length
                      ? "取消全选"
                      : "全选"}
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {OPTIONS.interactionTiming.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`timing-${option.value}`}
                        checked={formData.interactionTiming.includes(
                          option.value,
                        )}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(
                            "interactionTiming",
                            option.value,
                            checked as boolean,
                          )
                        }
                      />
                      <label
                        htmlFor={`timing-${option.value}`}
                        className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 第7步：工作流偏好 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              第七步：工作流偏好
            </h3>
            <div className="space-y-3">
              <Label className="text-base font-medium text-gray-700">
                请选择内容生成的工作流模式
              </Label>
              <RadioGroup
                name="workflow"
                value={formData.workflow}
                onValueChange={(val) => handleInputChange("workflow", val)}
                options={OPTIONS.workflow}
              />
            </div>
          </section>

          {/* 第8步：特殊指令 */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              第八步：特殊指令（可选）
            </h3>
            <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-6">
              <div className="space-y-2">
                <Label htmlFor="specialInstructions">
                  请输入任何特殊的指令或约束
                </Label>
                <Textarea
                  id="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={(e) =>
                    handleInputChange("specialInstructions", e.target.value)
                  }
                  placeholder="例如：&#10;- '所有数学公式必须使用LaTeX格式'&#10;- '每个案例必须来自实际企业'&#10;- '生成内容必须包含中文和英文对照'..."
                  className="min-h-[150px] bg-white"
                />
              </div>
            </div>
          </section>
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
