"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "~/components/ui/resizable";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { LogOut, Settings, User, Home, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
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

  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* 左侧面板 */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="bg-card flex h-full flex-col border-r">
            {/* 用户状态区域 */}
            <div className="bg-background flex flex-col items-center border-b p-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-auto w-auto p-0"
                  >
                    <Avatar className="mb-2 h-12 w-12">
                      <AvatarImage
                        src={session?.user?.image || undefined}
                        alt={session?.user?.name || "用户头像"}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {session?.user?.name?.[0]?.toUpperCase() ||
                          session?.user?.email?.[0]?.toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm">
                    <div className="text-foreground font-medium">
                      {session?.user?.name || "未知用户"}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {session?.user?.email}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>个人资料</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>设置</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="text-center">
                <h3 className="text-foreground text-sm font-semibold">
                  {session?.user?.name || session?.user?.email || "未知用户"}
                </h3>
                <p className="text-muted-foreground text-xs">在线状态</p>
              </div>
            </div>

            {/* 导航区域 */}
            <nav className="flex flex-1 flex-col p-4">
              <div className="space-y-2">
                <Link href="/">
                  <Button
                    variant={pathname === "/" ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      pathname === "/" && "bg-secondary",
                    )}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    主页
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 内容区域 */}
        <ResizablePanel defaultSize={80}>
          <div className="bg-background h-full overflow-auto">{children}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
