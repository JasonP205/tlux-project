"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, ReceiptText, CalendarDays, TrendingUp } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Empty, PageTitle } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export interface Stats {
  today: { revenue: number; count: number };
  month: { revenue: number; count: number };
  daily: { _id: string; revenue: number; count: number }[];
  monthly: { _id: string; revenue: number; count: number }[];
  byPayment: { _id: "CASH" | "PAYOS"; revenue: number; count: number }[];
  topProducts: { _id: string; name: string; qty: number; revenue: number }[];
}

const LEAF = "#10b981";
const AMBER = "#f59e0b";
const PINE = "#0f172a";
const GRID = "#e2e8f0";
const MUTED = "#64748b";

const PAYMENT_LABELS: Record<string, string> = { CASH: "Tiền mặt", PAYOS: "Chuyển khoản" };

function moneyTicks(v: number | string) {
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("vi-VN")}tr`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("vi-VN")}k`;
  return `${n}`;
}

export default function DashboardClient({ initial }: { initial?: Stats }) {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () => api<Stats>("/orders/stats"),
    initialData: initial,
    refetchInterval: 60_000,
  });

  const s = stats.data;

  const lineData = {
    labels: (s?.daily ?? []).map((d) =>
      new Date(d._id).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
    ),
    datasets: [
      {
        label: "Doanh thu",
        data: (s?.daily ?? []).map((d) => d.revenue),
        borderColor: LEAF,
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: LEAF,
      },
    ],
  };

  const barData = {
    labels: (s?.monthly ?? []).map((m) => {
      const [y, mo] = m._id.split("-");
      return `${mo}/${y.slice(2)}`;
    }),
    datasets: [
      {
        label: "Doanh thu",
        data: (s?.monthly ?? []).map((m) => m.revenue),
        backgroundColor: LEAF,
        borderRadius: 6,
        maxBarThickness: 36,
      },
    ],
  };

  const payData = {
    labels: (s?.byPayment ?? []).map((p) => PAYMENT_LABELS[p._id] ?? p._id),
    datasets: [
      {
        data: (s?.byPayment ?? []).map((p) => p.revenue),
        backgroundColor: [LEAF, AMBER, PINE],
        borderWidth: 0,
      },
    ],
  };

  const moneyTooltip = {
    callbacks: {
      label: (ctx: { parsed: unknown }) => {
        const p = ctx.parsed as number | { y?: number | null };
        const v = typeof p === "number" ? p : (p?.y ?? 0);
        return ` ${formatMoney(v)}`;
      },
    },
  };

  const axisOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: moneyTooltip },
    scales: {
      x: { grid: { display: false }, ticks: { color: MUTED, font: { size: 11 } } },
      y: {
        grid: { color: GRID },
        ticks: { color: MUTED, font: { size: 11 }, callback: moneyTicks },
        beginAtZero: true,
      },
    },
  } as const;

  return (
    <div className="p-4 sm:p-6">
      <PageTitle title="Tổng quan" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Banknote size={16} />} label="Doanh thu hôm nay" value={formatMoney(s?.today.revenue ?? 0)} />
        <Stat icon={<ReceiptText size={16} />} label="Hóa đơn hôm nay" value={`${s?.today.count ?? 0}`} />
        <Stat icon={<CalendarDays size={16} />} label="Doanh thu tháng này" value={formatMoney(s?.month.revenue ?? 0)} />
        <Stat icon={<TrendingUp size={16} />} label="Hóa đơn tháng này" value={`${s?.month.count ?? 0}`} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-surface p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold">Doanh thu 30 ngày gần nhất</h2>
          {!s ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : s.daily.length === 0 ? (
            <Empty message="Chưa có dữ liệu bán hàng" />
          ) : (
            <div className="h-64">
              <Line data={lineData} options={axisOptions} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Cơ cấu thanh toán tháng này</h2>
          {!s ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : s.byPayment.length === 0 ? (
            <Empty message="Chưa có dữ liệu bán hàng" />
          ) : (
            <div className="h-64">
              <Doughnut
                data={payData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "62%",
                  plugins: {
                    legend: { position: "bottom", labels: { color: MUTED, boxWidth: 12 } },
                    tooltip: moneyTooltip,
                  },
                }}
              />
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Doanh thu 12 tháng</h2>
          {!s ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : s.monthly.length === 0 ? (
            <Empty message="Chưa có dữ liệu bán hàng" />
          ) : (
            <div className="h-64">
              <Bar data={barData} options={axisOptions} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-bold">Bán chạy nhất tháng</h2>
          {!s ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : s.topProducts.length === 0 ? (
            <Empty message="Chưa có dữ liệu bán hàng" />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
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
