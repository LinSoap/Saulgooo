"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
// Next.js 并行路由的props是固定的
interface WorkspaceLayoutProps {
  children: React.ReactNode; // 主要的page.tsx内容
  left: React.ReactNode; // @left插槽内容
  center: React.ReactNode; // @center插槽内容
  right: React.ReactNode; // @right插槽内容
}

export default function WorkspaceLayout({
  children,
  left,
  center,
  right,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      {/* Header可以在这里添加 */}
      <ResizablePanelGroup direction="horizontal" className="h-full flex-1">
        {/* 左侧文件浏览区域 - 基于 workspaceId */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
          <div className="bg-background/50 h-full overflow-hidden border-r">
            {left}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 中间文件预览区域 - 基于 workspaceId */}
        <ResizablePanel defaultSize={45} minSize={20}>
          <div className="bg-background/30 h-full overflow-hidden border-r">
            {center}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 右侧Agent Chat区域 - 基于 sessionId */}
        <ResizablePanel defaultSize={35} minSize={20}>
          <div className="bg-background/70 h-full overflow-hidden">{right}</div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* 并行路由的children用于处理路由匹配 */}
      {children}
    </div>
  );
}
