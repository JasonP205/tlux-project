"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  TicketPercent,
  ReceiptText,
  UserCog,
  LogOut,
  Store,
} from "lucide-react";
import { useMe, useLogout } from "@/lib/hooks";
import type { Role } from "@/lib/types";

const MENU: { href: string; label: string; icon: React.ElementType; roles: Role[] }[] = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER"] },
  { href: "/pos", label: "Bán hàng", icon: ShoppingCart, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { href: "/orders", label: "Hóa đơn", icon: ReceiptText, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { href: "/products", label: "Sản phẩm", icon: Package, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "CASHIER"] },
  { href: "/inventory", label: "Kho hàng", icon: Warehouse, roles: ["ADMIN", "MANAGER", "WAREHOUSE"] },
  { href: "/customers", label: "Khách hàng", icon: Users, roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { href: "/discounts", label: "Mã giảm giá", icon: TicketPercent, roles: ["ADMIN", "MANAGER"] },
  { href: "/users", label: "Nhân viên", icon: UserCog, roles: ["ADMIN"] },
];

const ROLE_NAMES: Record<Role, string> = {
  ADMIN: "Quản trị",
  MANAGER: "Quản lý",
  WAREHOUSE: "Thủ kho",
  CASHIER: "Thu ngân",
};

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
    return <div className="flex h-screen items-center justify-center text-muted">Đang tải…</div>;
  if (!data) return null;

  const user = data.user;
  const menu = MENU.filter((m) => m.roles.includes(user.role));
  const allowed = menu.some((m) => pathname.startsWith(m.href));

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col bg-pine text-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf">
            <Store size={18} />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight">TLUX</div>
            <div className="text-[11px] text-white/50">Quản lý bán hàng</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {menu.map((m) => {
            const active = pathname.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-leaf text-white" : "text-white/70 hover:bg-pine-light hover:text-white"
                }`}
              >
                <m.icon size={17} />
                {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-2">
            <div className="text-sm font-semibold">{user.name}</div>
            <div className="text-xs text-white/50">{ROLE_NAMES[user.role]}</div>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/70 hover:bg-pine-light hover:text-white cursor-pointer"
          >
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {allowed ? (
          children
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            Bạn không có quyền truy cập trang này
          </div>
        )}
      </main>
    </div>
  );
}
