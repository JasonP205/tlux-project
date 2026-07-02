"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMoney, formatDateTime } from "@/lib/format";
import { input, Modal, Badge, Empty, PageTitle } from "@/components/ui";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_LABELS: Record<OrderStatus, { label: string; tone: "green" | "amber" | "red" | "gray" }> = {
  PAID: { label: "Đã thanh toán", tone: "green" },
  PENDING_PAYMENT: { label: "Chờ chuyển khoản", tone: "amber" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
  DRAFT: { label: "Nháp", tone: "gray" },
};

export default function OrdersClient({ initial }: { initial?: { orders: Order[]; total: number } }) {
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);

  const orders = useQuery({
    queryKey: ["orders", status],
    queryFn: () => api<{ orders: Order[]; total: number }>(`/orders?limit=100&status=${status}`),
    initialData: status === "" ? initial : undefined,
  });

  return (
    <div className="p-6">
      <PageTitle title="Hóa đơn" />
      <div className="mb-4">
        <select className={`${input} w-52`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="PAID">Đã thanh toán</option>
          <option value="PENDING_PAYMENT">Chờ chuyển khoản</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-3">Mã hóa đơn</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Thu ngân</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Thanh toán</th>
              <th className="px-4 py-3 text-right">Tổng tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.data?.orders.map((o) => {
              const st = STATUS_LABELS[o.status];
              return (
                <tr key={o._id} className="cursor-pointer hover:bg-paper/60" onClick={() => setDetail(o)}>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold">{o.code}</td>
                  <td className="px-4 py-2.5">{formatDateTime(o.paidAt || o.createdAt)}</td>
                  <td className="px-4 py-2.5">{typeof o.cashier === "object" ? o.cashier.name : "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{o.customer?.name || "Khách lẻ"}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {o.paymentMethod === "CASH" ? "Tiền mặt" : o.paymentMethod === "PAYOS" ? "Chuyển khoản" : "—"}
                  </td>
                  <td className="money px-4 py-2.5 text-right font-bold">{formatMoney(o.total)}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.data?.orders.length === 0 && <Empty message="Không có hóa đơn nào" />}
      </div>

      {detail && (
        <Modal title={`Hóa đơn ${detail.code}`} onClose={() => setDetail(null)}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>{formatDateTime(detail.paidAt || detail.createdAt)}</span>
              <Badge tone={STATUS_LABELS[detail.status].tone}>{STATUS_LABELS[detail.status].label}</Badge>
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {detail.items.map((it) => (
                <li key={it.product} className="flex justify-between py-2">
                  <span>
                    {it.name} <span className="text-muted">×{it.qty}</span>
                  </span>
                  <span className="money font-semibold">{formatMoney(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1">
              <Row label="Tạm tính" value={formatMoney(detail.subtotal)} />
              {detail.discountAmount > 0 && (
                <Row label={`Giảm giá (${detail.discountCode})`} value={`−${formatMoney(detail.discountAmount)}`} />
              )}
              {detail.pointsDiscount > 0 && (
                <Row label={`Đổi ${detail.pointsRedeemed} điểm`} value={`−${formatMoney(detail.pointsDiscount)}`} />
              )}
              <div className="flex justify-between pt-1 text-base font-extrabold">
                <span>Tổng cộng</span>
                <span className="money">{formatMoney(detail.total)}</span>
              </div>
              {detail.pointsEarned > 0 && (
                <div className="text-xs text-leaf">Khách được cộng {detail.pointsEarned} điểm</div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <span>{label}</span>
      <span className="money">{value}</span>
    </div>
  );
}
