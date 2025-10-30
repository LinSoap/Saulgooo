"use client";

import { useSession } from "next-auth/react";

interface WorkspacePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { data: session } = useSession();

  // 对于并行路由，我们仍然需要验证用户身份
  if (!session?.user) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold">
            Authentication Required
          </h2>
          <p className="text-muted-foreground">
            Please log in to view this workspace
          </p>
        </div>
      </div>
    );
  }

  // 并行路由会自动处理内容渲染
  // page.tsx 只需要返回null或children
  return null;
}
