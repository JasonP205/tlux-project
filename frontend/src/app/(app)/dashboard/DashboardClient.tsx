"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, ReceiptText, CalendarDays, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Empty, PageTitle } from "@/components/ui";

export interface Stats {
  today: { revenue: number; count: number };
  month: { revenue: number; count: number };
  daily: { _id: string; revenue: number; count: number }[];
  topProducts: { _id: string; name: string; qty: number; revenue: number }[];
}

export default function DashboardClient({ initial }: { initial?: Stats }) {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => api<Stats>("/orders/stats"),
    initialData: initial,
    refetchInterval: 60_000,
  });

  const s = stats.data;
  const maxDaily = Math.max(1, ...(s?.daily ?? []).map((d) => d.revenue));

  return (
    <div className="p-6">
      <PageTitle title="Tổng quan" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Banknote size={16} />} label="Doanh thu hôm nay" value={formatMoney(s?.today.revenue ?? 0)} />
        <Stat icon={<ReceiptText size={16} />} label="Hóa đơn hôm nay" value={`${s?.today.count ?? 0}`} />
        <Stat icon={<CalendarDays size={16} />} label="Doanh thu tháng này" value={formatMoney(s?.month.revenue ?? 0)} />
        <Stat icon={<TrendingUp size={16} />} label="Hóa đơn tháng này" value={`${s?.month.count ?? 0}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Doanh thu 7 ngày gần nhất</h2>
          {!s || s.daily.length === 0 ? (
            <Empty message="Chưa có dữ liệu bán hàng" />
          ) : (
            <ul className="space-y-2.5">
              {s.daily.map((d) => (
                <li key={d._id} className="grid grid-cols-[74px_1fr_auto] items-center gap-3 text-sm">
                  <span className="text-xs text-muted">
                    {new Date(d._id).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <div className="h-5 rounded bg-paper">
                    <div
                      className="h-5 rounded bg-leaf"
                      style={{ width: `${Math.max(2, (d.revenue / maxDaily) * 100)}%` }}
                      role="img"
                      aria-label={`${formatMoney(d.revenue)}, ${d.count} hóa đơn`}
                    />
                  </div>
                  <span className="money text-right font-semibold">{formatMoney(d.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Bán chạy nhất tháng</h2>
          {!s || s.topProducts.length === 0 ? (
            <Empty message="Chưa có dữ liệu bán hàng" />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold text-muted">
                <tr>
                  <th className="pb-2">Sản phẩm</th>
                  <th className="pb-2 text-right">SL bán</th>
                  <th className="pb-2 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {s.topProducts.map((p) => (
                  <tr key={p._id}>
                    <td className="py-2 font-semibold">{p.name}</td>
                    <td className="money py-2 text-right">{p.qty}</td>
                    <td className="money py-2 text-right">{formatMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <span className="text-leaf">{icon}</span> {label}
      </div>
      <div className="money mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
