"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { ChevronRight, Bot } from "lucide-react";
import { useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

export default function WorkspaceLayout({
  children,
  left,
  center,
  right,
}: WorkspaceLayoutProps) {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  const toggleLeftPanel = () => {
    const panel = leftPanelRef.current;
    if (panel) {
      if (isLeftCollapsed) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  const toggleRightPanel = () => {
    const panel = rightPanelRef.current;
    if (panel) {
      if (isRightCollapsed) {
        panel.expand();
      } else {
        panel.collapse();
      }
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="relative flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* 左侧文件浏览区域 - 基于 workspaceId */}
          <ResizablePanel
            ref={leftPanelRef}
            defaultSize={20}
            minSize={15}
            maxSize={40}
            collapsible={true}
            onCollapse={() => setIsLeftCollapsed(true)}
            onExpand={() => setIsLeftCollapsed(false)}
            className={
              isLeftCollapsed
                ? "min-w-0 border-none"
                : "border-r border-gray-100 bg-[#f9f9f9]"
            }
          >
            <div className="h-full overflow-hidden">{left}</div>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className={
              isLeftCollapsed
                ? "hidden"
                : "w-px border-l border-gray-100 bg-transparent"
            }
          />

          {/* 中间文件预览区域 - 基于 workspaceId */}
          <ResizablePanel defaultSize={45} minSize={20} className="bg-white">
            <div className="h-full overflow-hidden">{center}</div>
          </ResizablePanel>

          <ResizableHandle
            withHandle
            className={
              isRightCollapsed
                ? "hidden"
                : "w-px border-l border-gray-100 bg-transparent"
            }
          />

          {/* 右侧Agent Chat区域 - 基于 sessionId */}
          <ResizablePanel
            ref={rightPanelRef}
            defaultSize={35}
            minSize={20}
            collapsible={true}
            onCollapse={() => setIsRightCollapsed(true)}
            onExpand={() => setIsRightCollapsed(false)}
            className={
              isRightCollapsed ? "min-w-0 border-none" : "bg-[#fcfcfc]"
            }
          >
            <div className="h-full overflow-hidden">{right}</div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Toggle Buttons Overlay */}
        {isLeftCollapsed && (
          <button
            onClick={toggleLeftPanel}
            className="absolute top-20 left-4 z-20 rounded-full border border-gray-100 bg-white p-2 text-gray-500 shadow-lg hover:text-black"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {isRightCollapsed && (
          <button
            onClick={toggleRightPanel}
            className="absolute top-20 right-4 z-20 rounded-full border border-gray-100 bg-white p-2 text-gray-500 shadow-lg hover:text-black"
          >
            <Bot className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 并行路由的children用于处理路由匹配 */}
      {children}
    </div>
  );
}
