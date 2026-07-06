"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Phone, Mail, ReceiptText } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Badge, Empty, TableSkeleton } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer, Order } from "@/lib/types";

type Detail = { customer: Customer; orders: Order[]; totalSpent: number };

export default function CustomerDetailClient({ id, initial }: { id: string; initial?: Detail }) {
  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => api<Detail>(`/customers/${id}`),
    initialData: initial,
  });

  if (isLoading)
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-7 w-56" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  if (!data) return <div className="p-6 text-muted">Không tìm thấy khách hàng</div>;

  const { customer, orders, totalSpent } = data;

  return (
    <div className="p-6">
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Danh sách khách hàng
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Phone size={14} /> {customer.phone}
            </span>
            {customer.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} /> {customer.email}
              </span>
            )}
          </div>
          {customer.note && <p className="mt-1 text-sm text-muted">{customer.note}</p>}
        </div>
        <div className="flex gap-3">
          <StatCard label="Điểm tích lũy" value={`${customer.points}`} icon={<Star size={15} className="text-amber" />} />
          <StatCard label="Tổng chi tiêu" value={formatMoney(totalSpent)} icon={<ReceiptText size={15} className="text-leaf" />} />
          <StatCard label="Số hóa đơn" value={`${orders.length}`} />
        </div>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Lịch sử mua hàng</h2>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-3">Mã hóa đơn</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Số món</th>
              <th className="px-4 py-3 text-right">Tổng tiền</th>
              <th className="px-4 py-3 text-right">Điểm cộng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o._id} className="hover:bg-paper/60">
                <td className="px-4 py-2.5 font-mono text-xs">{o.code}</td>
                <td className="px-4 py-2.5">{formatDateTime(o.paidAt)}</td>
                <td className="px-4 py-2.5">{o.items.length}</td>
                <td className="money px-4 py-2.5 text-right font-semibold">{formatMoney(o.total)}</td>
                <td className="px-4 py-2.5 text-right">
                  {o.pointsEarned > 0 ? <Badge tone="green">+{o.pointsEarned}</Badge> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <Empty message="Khách chưa có hóa đơn nào" />}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon} {label}
      </div>
      <div className="money mt-0.5 text-lg font-extrabold">{value}</div>
    </div>
  );
}
