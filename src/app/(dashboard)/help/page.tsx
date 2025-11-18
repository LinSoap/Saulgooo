"use client";

import {
  BookOpen,
  MessageSquare,
  Users,
  Settings,
  Code,
  Zap,
  Globe,
  HelpCircle,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <HelpCircle className="h-8 w-8" />
          使用说明
        </h1>
        <p className="text-muted-foreground mt-2">
          了解如何使用 Saulgooo 平台进行教学协作和 AI 辅助开发
        </p>
      </div>

      <div className="space-y-8">
        {/* 快速开始 */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
            <Zap className="h-6 w-6" />
            快速开始
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">1. 创建工作空间</h3>
              <p className="text-muted-foreground mb-2 text-sm">
                点击&quot;创建工作空间&quot;卡片，输入工作空间名称和描述，可选择需要的插件。
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">2. 导入插件</h3>
              <p className="text-muted-foreground mb-2 text-sm">
                在创建工作空间时选择需要的 AI 代理、技能工具或工作流配置。
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">3. 开始协作</h3>
              <p className="text-muted-foreground mb-2 text-sm">
                进入工作空间，在对话区域输入您的问题或任务，AI 将提供实时帮助。
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">4. 下载结果</h3>
              <p className="text-muted-foreground mb-2 text-sm">
                完成工作后，可将生成的文档,&ldquo;ppt等资料&rdquo;导出下载，方便离线使用。
              </p>
            </div>
          </div>
        </section>

        {/* 核心功能 */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
            <BookOpen className="h-6 w-6" />
            核心功能
          </h2>

          <div className="space-y-6">
            {/* 工作空间管理 */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-medium">
                <Globe className="h-5 w-5" />
                工作空间管理
              </h3>
              <ul className="ml-7 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <strong>创建工作空间</strong>
                    ：为每个课程或项目创建独立的工作空间
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <strong>插件管理</strong>：从插件中心导入 AI
                    代理、技能工具和配置文件
                  </div>
                </li>
              </ul>
            </div>

            {/* AI 代理 */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-medium">
                <Users className="h-5 w-5" />
                AI 代理
              </h3>
              <ul className="ml-7 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <strong>课程设计专家</strong>
                    ：帮助创建完整的课程结构和学习路径
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <strong>语音识别助手</strong>：提供语音转文字和语音处理功能
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <strong>自定义代理</strong>：根据需要导入或创建专门的 AI
                    代理
                  </div>
                </li>
              </ul>
            </div>

            {/* 技能工具 */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-medium">
                <Code className="h-5 w-5" />
                技能工具
              </h3>
              <ul className="ml-7 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <strong>文档处理</strong>：支持 Word、PPT、PDF
                    等格式的处理和生成
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <strong>代码生成</strong>：辅助编写各种编程语言的代码
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-1">•</span>
                  <div>
                    <strong>数据分析</strong>：提供数据可视化和分析工具
                  </div>
                </li>
              </ul>
            </div>

            {/* Claude 工作流 */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-medium">
                <Settings className="h-5 w-5" />
                Claude 工作流配置
              </h3>
              <p className="text-muted-foreground ml-7">
                通过 CLAUDE.md 文件配置 Claude 的工作模式、项目结构和协作流程，
                实现 AI 辅助的标准化工作流程。
              </p>
            </div>
          </div>
        </section>

        {/* 常见问题 */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
            <MessageSquare className="h-6 w-6" />
            常见问题
          </h2>

          <div className="space-y-4">
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                如何创建新的工作空间？
              </summary>
              <p className="text-muted-foreground mt-2 text-sm">
                在 dashboard
                页面点击&quot;创建工作空间&quot;卡片，输入名称和描述，
                可选择需要的插件，然后点击创建即可。
              </p>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                如何导入插件到工作空间？
              </summary>
              <p className="text-muted-foreground mt-2 text-sm">
                有两种方式： 1. 创建工作空间时直接选择需要的插件 2.
                从插件中心选择插件，点击&ldquo;导入到工作区&rdquo;，选择目标工作空间
              </p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                Claude 工作流配置文件 CLAUDE.md 是什么？
              </summary>
              <p className="text-muted-foreground mt-2 text-sm">
                CLAUDE.md 是一个用于配置 Claude AI 工作流的 Markdown 文件，
                包含项目说明、开发指南和工作流程等内容，帮助规范团队协作。每个空间只能有一个
                &ldquo;CLAUDE.md&rdquo; 文件。
              </p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                什么是 Agents、Skills
              </summary>
              <p className="text-muted-foreground mt-2 text-sm">
                Agents 是具备特定能力的 AI
                代理。可以完成某个特定的任务。专注于单一功能。
                而Skills更加强大，可以完成一系列复杂的任务，甚至是一个完整的工作流。专注于一系列任务。
                两则都是在需要时才被调用，协助完成工作。
              </p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                为什么我的空间里有.claude文件夹，它是做什么的？
              </summary>
              <p className="text-muted-foreground mt-2 text-sm">
                .claude 文件夹用于存放与 Claude AI 相关的配置和资源文件， 包括
                Agents、Skills，帮助管理和组织工作空间内的 AI
                功能。请不要删除或修改此文件夹内的内容，以免影响工作空间的正常使用。
              </p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                在使用过程中为什么会生成一些代码文件？
              </summary>
              <p className="text-muted-foreground mt-2 text-sm">
                在使用某些 Agents 或 Skills 时，Claude AI
                可能会根据任务需求生成相应的代码文件。这些文件用于实现特定功能或逻辑，帮助完成复杂任务。
                您可以根据需要查看、修改或删除这些代码文件，但请确保不会影响工作空间的整体功能。
              </p>
            </details>
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                为什么我刚添加的插件无法在工作空间中使用？
              </summary>
              <p className="text-muted-foreground mt-2 text-sm">
                新添加的插件需要开始新对话后才能生效。在工作区助手的系统信息中可以查看当前已加载的插件列表。
              </p>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
}
