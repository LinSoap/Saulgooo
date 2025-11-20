"use client";

import { useSession, signIn } from "next-auth/react";
import { Lock } from "lucide-react";
import { Button } from "~/components/ui/button";

interface WorkspacePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function WorkspacePage({ params: _params }: WorkspacePageProps) {
  const { data: session } = useSession();

  // 对于并行路由，我们仍然需要验证用户身份
  if (!session?.user) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 rounded-full bg-gray-50 p-6 shadow-sm">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">访问受限</h2>
          <p className="mb-8 max-w-xs text-sm leading-relaxed text-gray-500">
            您需要登录账户才能访问此工作区的内容与功能。
          </p>
          <Button
            onClick={() => void signIn()}
            className="rounded-full bg-black px-8 font-medium text-white hover:bg-gray-800"
          >
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  // 并行路由会自动处理内容渲染
  // page.tsx 只需要返回null或children
  return null;
}
