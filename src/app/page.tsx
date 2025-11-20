"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
  FileText,
  Code2,
  Microscope,
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Globe2,
  Award,
  Building2,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="text-brand-black h-full overflow-y-auto bg-white font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-xl transition-all duration-300">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="rounded-lg bg-black p-1.5">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-serif text-xl font-bold tracking-tight">
              Saulgooo
            </span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-black"
            >
              功能特性
            </button>
            <button
              onClick={() => scrollToSection("partners")}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-black"
            >
              合作院校
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm font-medium text-gray-500 transition-colors hover:text-black"
            >
              定价方案
            </button>

            <div className="mx-2 h-5 w-px bg-gray-200"></div>

            <button
              onClick={() => router.push("/login")}
              className="text-sm font-medium text-gray-900 transition-colors hover:text-black"
            >
              登录
            </button>
            <button
              onClick={() => router.push("/login")}
              className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-gray-200 transition-all hover:scale-105 hover:bg-gray-800 active:scale-95"
            >
              免费注册
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-40 pb-20">
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600">
              <span className="relative flex h-2 w-2">
                <span className="bg-brand-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                <span className="bg-brand-accent relative inline-flex h-2 w-2 rounded-full"></span>
              </span>
              Listen to the future of education
            </div>
          </div>

          <h1 className="mb-8 text-5xl leading-[1.1] font-bold tracking-tight text-balance md:text-7xl">
            您的课程在进化，
            <br />
            <span className="relative inline-block">
              AI 助手
              <svg
                className="absolute -bottom-1 left-0 -z-10 h-3 w-full text-gray-200"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 5 Q 50 10 100 5"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                />
              </svg>
            </span>
            在辅助吗？
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed font-light text-balance text-gray-500">
            Saulgooo 为高校教师提供严谨、专业的 AI 辅助工具。
            从大纲设计到科研辅助，让繁琐的操作自动化，让您专注于知识本身。
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => router.push("/login")}
              className="group flex items-center gap-2 rounded-full bg-black px-8 py-4 text-lg font-medium text-white shadow-xl shadow-gray-200 transition-all hover:-translate-y-1 hover:bg-gray-800"
            >
              开始创建课程
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-8 py-4 text-lg font-medium text-black transition-all hover:-translate-y-1 hover:bg-gray-50">
              <PlayCircle className="h-5 w-5" />
              观看演示
            </button>
          </div>
        </div>

        {/* Abstract Decorative Line */}
        <div className="pointer-events-none absolute top-1/2 left-0 -z-10 h-64 w-full opacity-20">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 1200 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M-100 150 C 200 150, 300 50, 600 150 C 900 250, 1000 150, 1300 150"
              stroke="black"
              strokeWidth="2"
              strokeDasharray="8 8"
            />
          </svg>
        </div>
      </section>

      {/* Partners Section */}
      <section
        id="partners"
        className="border-y border-gray-100 bg-gray-50/50 py-12"
      >
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-10 text-center text-xs font-bold tracking-widest text-gray-400 uppercase">
            被全球顶尖学术机构信赖
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale md:gap-24">
            <div className="flex items-center gap-2 font-serif text-2xl font-bold text-gray-800">
              <Building2 className="h-8 w-8" /> Univ. of Science
            </div>
            <div className="flex items-center gap-2 font-serif text-2xl font-bold text-gray-800">
              <Globe2 className="h-8 w-8" /> Global Tech Institute
            </div>
            <div className="flex items-center gap-2 font-serif text-2xl font-bold text-gray-800">
              <Award className="h-8 w-8" /> Arts Academy
            </div>
            <div className="flex items-center gap-2 font-serif text-2xl font-bold text-gray-800">
              <Microscope className="h-8 w-8" /> Med Research Center
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase Grid */}
      <section id="features" className="relative bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <div className="mb-4 font-serif text-gray-400 italic">
              Capabilities
            </div>
            <h2 className="mb-6 text-3xl font-bold md:text-5xl">
              学术级 AI 能力
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              不仅仅是生成文本，而是理解学术逻辑、引用规范与教学目标。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Feature 1 */}
            <div className="group relative overflow-hidden rounded-4xl bg-[#111] p-12 text-white transition-transform duration-500 hover:-translate-y-2">
              <div className="bg-brand-accent shadow-brand-accent/20 mb-10 flex h-16 w-16 items-center justify-center rounded-3xl shadow-lg transition-transform duration-300 group-hover:scale-110">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-3xl font-bold">智能大纲设计</h3>
              <p className="text-lg leading-relaxed text-gray-400">
                输入课程名称与学时，AI
                将基于最新学科标准，自动生成包含章节目标、重难点解析的完整教学大纲。
              </p>
              <div className="bg-brand-accent/20 group-hover:bg-brand-accent/20 absolute -right-20 -bottom-20 h-80 w-80 rounded-full blur-3xl transition-colors duration-500"></div>
            </div>

            {/* Feature 2 */}
            <div className="group relative overflow-hidden rounded-4xl bg-[#111] p-12 text-white transition-transform duration-500 hover:-translate-y-2">
              <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500 shadow-lg shadow-orange-500/20 transition-transform duration-300 group-hover:scale-110">
                <Microscope className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-3xl font-bold">科研与实验助手</h3>
              <p className="text-lg leading-relaxed text-gray-400">
                自动整理参考文献（IEEE/APA格式），设计实验步骤，甚至协助编写数据分析代码（Python/R）。
              </p>
              <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-white/5 blur-3xl transition-colors duration-500 group-hover:bg-orange-500/20"></div>
            </div>

            {/* Feature 3 */}
            <div className="group relative overflow-hidden rounded-4xl bg-[#111] p-12 text-white transition-transform duration-500 hover:-translate-y-2">
              <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500 shadow-lg shadow-rose-500/20 transition-transform duration-300 group-hover:scale-110">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-3xl font-bold">灵感源自对话</h3>
              <p className="text-lg leading-relaxed text-gray-400">
                &quot;如何让线性代数更生动？&quot;
                &quot;帮我出一套期中试卷，难度中等。&quot;
                与您的专属学术助教随时交流。
              </p>
              <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-white/5 blur-3xl transition-colors duration-500 group-hover:bg-rose-500/20"></div>
            </div>

            {/* Feature 4 */}
            <div className="group relative overflow-hidden rounded-4xl bg-[#111] p-12 text-white transition-transform duration-500 hover:-translate-y-2">
              <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-500 shadow-lg shadow-purple-500/20 transition-transform duration-300 group-hover:scale-110">
                <Code2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-4 text-3xl font-bold">自动化教学评估</h3>
              <p className="text-lg leading-relaxed text-gray-400">
                根据Bloom教育目标分类学，自动生成作业评价标准、代码评分脚本，大幅提升批改效率。
              </p>
              <div className="absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-white/5 blur-3xl transition-colors duration-500 group-hover:bg-purple-500/20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Workflow Section */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-16 lg:flex-row">
            <div className="lg:w-1/2">
              <div className="mb-4 font-serif text-gray-400 italic">
                Seamless Workflow
              </div>
              <h2 className="mb-6 text-4xl leading-tight font-bold">
                从一个想法，
                <br />
                到一门精品课。
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-gray-500">
                Saulgooo
                将课程建设的周期从数周缩短至数小时。您只需提供核心教学理念，剩下的结构化工作、资料整理、排版设计，全部交给
                AI。
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white p-2 text-black shadow-sm">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">极速构建</h4>
                    <p className="text-gray-500">
                      拖拽式大纲调整，内容一键生成。
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white p-2 text-black shadow-sm">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">双语支持</h4>
                    <p className="text-gray-500">
                      完美支持中英文学术环境切换。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Abstract Dashboard UI */}
            <div className="w-full lg:w-1/2">
              <div className="relative rotate-2 rounded-4xl border border-gray-200 bg-white p-4 shadow-2xl transition-transform duration-700 hover:rotate-0">
                <div className="absolute inset-0 rounded-4xl bg-linear-to-tr from-gray-100 to-transparent opacity-50"></div>
                <div className="relative z-10 flex h-[400px] flex-col rounded-xl border border-gray-100 bg-white p-6">
                  <div className="mb-8 flex items-center gap-4 border-b border-gray-50 pb-4">
                    <div className="h-3 w-3 rounded-full bg-red-400"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                    <div className="h-3 w-3 rounded-full bg-green-400"></div>
                    <div className="ml-auto h-2 w-32 rounded-full bg-gray-100"></div>
                  </div>
                  <div className="flex flex-1 gap-6">
                    <div className="w-1/3 space-y-3 rounded-xl bg-gray-50 p-4">
                      <div className="h-2 w-full rounded-full bg-gray-200"></div>
                      <div className="h-2 w-2/3 rounded-full bg-gray-200"></div>
                      <div className="h-2 w-3/4 rounded-full bg-gray-200"></div>
                    </div>
                    <div className="w-2/3 space-y-4">
                      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-300">
                        Content Generation
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded-full bg-gray-100"></div>
                        <div className="h-2 w-full rounded-full bg-gray-100"></div>
                        <div className="h-2 w-5/6 rounded-full bg-gray-100"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center">
            <div className="mb-4 font-serif text-gray-400 italic">Plans</div>
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              为学术需求量身定制
            </h2>
            <p className="text-lg text-gray-500">
              从个人讲师到整个院系，我们都有合适的方案。
            </p>
          </div>

          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-3">
            {/* Plan 1: Basic */}
            <div className="rounded-4xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-10">
              <h3 className="mb-2 text-xl font-bold">讲师版</h3>
              <p className="mb-8 text-sm text-gray-400">
                适合个人备课与基础教学
              </p>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-bold">¥0</span>
                <span className="text-gray-400">/ 月</span>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="mb-8 w-full rounded-full border border-gray-200 py-3 font-medium transition-colors hover:bg-black hover:text-white"
              >
                免费开始
              </button>
              <div className="space-y-4">
                {[
                  "基础课程大纲生成",
                  "每月 50 次 AI 对话",
                  "标准教案模板",
                  "社区支持",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm text-gray-600"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Plan 2: Pro (Highlighted) */}
            <div className="relative z-10 scale-105 overflow-hidden rounded-4xl bg-[#111] p-8 text-white shadow-2xl md:p-12">
              <div className="bg-brand-accent absolute top-0 right-0 rounded-bl-2xl px-4 py-2 text-xs font-bold">
                MOST POPULAR
              </div>
              <h3 className="mb-2 text-2xl font-bold">教授版</h3>
              <p className="mb-8 text-sm text-gray-400">
                专为深度科研与教学设计
              </p>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-5xl font-bold">¥98</span>
                <span className="text-gray-400">/ 月</span>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="mb-8 w-full rounded-full bg-white py-4 font-bold text-black transition-colors hover:bg-gray-100"
              >
                立即订阅
              </button>
              <div className="space-y-4">
                {[
                  "无限量 AI 课程生成",
                  "高级学术润色 (LaTeX)",
                  "智能组卷与自动批改",
                  "实验方案设计助手",
                  "优先邮件支持",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm text-gray-300"
                  >
                    <CheckCircle2 className="text-brand-accent h-5 w-5 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Plan 3: Enterprise */}
            <div className="rounded-4xl border border-gray-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-10">
              <h3 className="mb-2 text-xl font-bold">院系版</h3>
              <p className="mb-8 text-sm text-gray-400">
                适用于学院或教研室协作
              </p>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-bold">定制</span>
              </div>
              <button className="mb-8 w-full rounded-full border border-gray-200 py-3 font-medium transition-colors hover:bg-black hover:text-white">
                联系销售
              </button>
              <div className="space-y-4">
                {[
                  "包含所有教授版功能",
                  "多人协作空间",
                  "教研室资源共享库",
                  "专属 API 接口",
                  "SLA 服务保障",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm text-gray-600"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-black" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#111] py-20 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mb-10">
            <GraduationCap className="mx-auto mb-6 h-12 w-12 text-white" />
            <h2 className="mb-2 font-serif text-3xl font-bold">Saulgooo</h2>
            <p className="text-sm text-gray-500">
              Empowering Educators with Intelligence.
            </p>
          </div>
          <div className="mb-12 flex flex-col justify-center gap-8 text-sm text-gray-400 md:flex-row md:gap-16">
            <a href="#" className="transition-colors hover:text-white">
              产品功能
            </a>
            <a href="#" className="transition-colors hover:text-white">
              关于我们
            </a>
            <a href="#" className="transition-colors hover:text-white">
              学术博客
            </a>
            <a href="#" className="transition-colors hover:text-white">
              帮助中心
            </a>
            <a href="#" className="transition-colors hover:text-white">
              隐私政策
            </a>
          </div>
          <p className="text-xs text-gray-600">
            © 2024 Saulgooo Academic. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
