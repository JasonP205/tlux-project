"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar, menuFor } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe, useLogout } from "@/lib/hooks";
import type { Role } from "@/lib/types";

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/dashboard",
  MANAGER: "/dashboard",
  WAREHOUSE: "/inventory",
  CASHIER: "/pos",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (isLoading)
    return (
      <div className="flex h-screen overflow-hidden">
        {/* Khung xương trong lúc xác thực phiên đăng nhập */}
        <div className="hidden w-64 shrink-0 flex-col gap-2 bg-pine p-4 md:flex">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg bg-white/10" />
            <Skeleton className="h-4 w-24 bg-white/10" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full bg-white/10" />
          ))}
        </div>
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-7 w-48" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  if (!data) return null;

  const user = data.user;
  const menu = menuFor(user.role);
  const current = menu.find((m) => pathname.startsWith(m.href));

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} onLogout={() => logout.mutate()} />
        <SidebarInset className="h-screen overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 print:hidden">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <span className="text-sm font-semibold">{current?.label ?? "TLUX"}</span>
          </header>
          <div className="flex-1 overflow-y-auto">
            {current ? (
              children
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                Bạn không có quyền truy cập trang này
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
