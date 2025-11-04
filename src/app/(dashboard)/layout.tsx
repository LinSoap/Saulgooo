"use client";

import { SessionProvider } from "next-auth/react";
import DashboardSidebar from "~/components/features/dashboard/DashboardSidebar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  // 在 workspace 页面不显示 sidebar
  const showSidebar = !pathname.includes("/workspace/");

  return (
    <SessionProvider>
      {showSidebar ? (
        <DashboardSidebar>{children}</DashboardSidebar>
      ) : (
        <>{children}</>
      )}
    </SessionProvider>
  );
}
