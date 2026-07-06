"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  TicketPercent,
  ReceiptText,
  UserCog,
  Settings,
} from "lucide-react";
import { NavUser } from "@/components/nav-user";
import { useBranding } from "@/lib/hooks";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { Role, User } from "@/lib/types";

const MENU: { href: string; label: string; icon: React.ElementType; roles: Role[] }[] = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER"] },
  { href: "/pos", label: "Bán hàng", icon: ShoppingCart, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { href: "/orders", label: "Hóa đơn", icon: ReceiptText, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { href: "/products", label: "Sản phẩm", icon: Package, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "CASHIER"] },
  { href: "/inventory", label: "Kho hàng", icon: Warehouse, roles: ["ADMIN", "MANAGER", "WAREHOUSE"] },
  { href: "/customers", label: "Khách hàng", icon: Users, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { href: "/discounts", label: "Mã giảm giá", icon: TicketPercent, roles: ["ADMIN", "MANAGER"] },
  { href: "/users", label: "Nhân viên", icon: UserCog, roles: ["ADMIN"] },
  { href: "/settings", label: "Cài đặt", icon: Settings, roles: ["ADMIN"] },
];

export function menuFor(role: Role) {
  return MENU.filter((m) => m.roles.includes(role));
}

export function AppSidebar({
  user,
  onLogout,
  ...props
}: { user: User; onLogout: () => void } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data } = useBranding();
  const branding = data?.branding;

  return (
    <Sidebar collapsible="icon" className="print:hidden" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-accent">
              <Link href={MENU.find((m) => m.roles.includes(user.role))?.href ?? "/pos"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding?.logoUrl ?? "/logo.png"}
                  alt=""
                  className="size-8 shrink-0 rounded-lg bg-white object-contain"
                />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-base font-extrabold tracking-tight">
                    {branding?.storeName ?? "TLUX"}
                  </span>
                  <span className="truncate text-[11px] text-sidebar-foreground/60">
                    {branding?.storeSlogan ?? "Quản lý bán hàng"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {menuFor(user.role).map((m) => (
              <SidebarMenuItem key={m.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(m.href)}
                  tooltip={m.label}
                  className="data-[active=true]:bg-leaf data-[active=true]:text-white"
                >
                  <Link href={m.href}>
                    <m.icon />
                    <span>{m.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
