import { SessionProvider } from "next-auth/react";
import DashboardSidebar from "~/components/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SessionProvider>
      <DashboardSidebar>{children}</DashboardSidebar>
    </SessionProvider>
  );
}
