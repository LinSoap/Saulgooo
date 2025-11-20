"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

import {
  GraduationCap,
  LogOut,
  Settings,
  Home,
  Bot,
  Library,
  Blocks,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface DashboardSidebarProps {
  children: React.ReactNode;
}

export default function DashboardSidebar({ children }: DashboardSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-[#f9f9f9]">
      {/* Sidebar */}
      <div className="flex h-full w-64 shrink-0 flex-col bg-[#111] p-4 text-white">
        {/* Logo Area */}
        <div
          className="group mb-6 flex cursor-pointer items-center gap-3 px-2 py-6"
          onClick={() => router.push("/")}
        >
          <div className="rounded-xl bg-white p-2 shadow-lg transition-transform group-hover:scale-105">
            <GraduationCap className="h-5 w-5 text-black" />
          </div>
          <div>
            <h1 className="font-serif text-lg leading-none font-bold tracking-tight">
              Saulgooo
            </h1>
            <p className="mt-1 text-[10px] tracking-widest text-gray-400 uppercase">
              Faculty Pro
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          <Link
            href="/dashboard"
            className={cn(
              "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 transition-all duration-300",
              isActive("/dashboard")
                ? "bg-white font-medium text-black shadow-md"
                : "text-gray-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Home
              className={cn(
                "h-5 w-5 transition-colors",
                isActive("/dashboard")
                  ? "text-black"
                  : "text-gray-500 group-hover:text-white",
              )}
            />
            <span className="text-sm tracking-wide">Home</span>
          </Link>

          <Link
            href="/ai-assistant"
            className={cn(
              "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 transition-all duration-300",
              isActive("/ai-assistant")
                ? "bg-white font-medium text-black shadow-md"
                : "text-gray-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Bot
              className={cn(
                "h-5 w-5 transition-colors",
                isActive("/ai-assistant")
                  ? "text-black"
                  : "text-gray-500 group-hover:text-white",
              )}
            />
            <span className="text-sm tracking-wide">AI 助教</span>
          </Link>

          <Link
            href="/plugin"
            className={cn(
              "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 transition-all duration-300",
              isActive("/plugin")
                ? "bg-white font-medium text-black shadow-md"
                : "text-gray-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Blocks
              className={cn(
                "h-5 w-5 transition-colors",
                isActive("/plugin")
                  ? "text-black"
                  : "text-gray-500 group-hover:text-white",
              )}
            />
            <span className="text-sm tracking-wide">插件中心</span>
          </Link>

          <Link
            href="/resources"
            className={cn(
              "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 transition-all duration-300",
              isActive("/resources")
                ? "bg-white font-medium text-black shadow-md"
                : "text-gray-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Library
              className={cn(
                "h-5 w-5 transition-colors",
                isActive("/resources")
                  ? "text-black"
                  : "text-gray-500 group-hover:text-white",
              )}
            />
            <span className="text-sm tracking-wide">资源库</span>
          </Link>

          <Link
            href="/settings"
            className={cn(
              "group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 transition-all duration-300",
              isActive("/settings")
                ? "bg-white font-medium text-black shadow-md"
                : "text-gray-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Settings
              className={cn(
                "h-5 w-5 transition-colors",
                isActive("/settings")
                  ? "text-black"
                  : "text-gray-500 group-hover:text-white",
              )}
            />
            <span className="text-sm tracking-wide">设置</span>
          </Link>
        </nav>

        {/* User Profile Snippet */}
        <div className="mt-auto border-t border-white/10 pt-6">
          <div className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#111] bg-linear-to-tr from-gray-200 to-gray-400 text-xs font-bold text-black">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {session?.user?.name ?? "未知用户"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {session?.user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="h-full flex-1 overflow-hidden bg-[#f9f9f9]">
        {children}
      </div>
    </div>
  );
}
