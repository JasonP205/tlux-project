"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Printer, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatMoney, formatDateTime, itemLineTotal } from "@/lib/format";
import { btn, input, Modal, Badge, Empty, PageTitle, AppSelect } from "@/components/ui";
import ReceiptDialog from "@/components/pos/ReceiptDialog";
import type { Order, OrderStatus } from "@/lib/types";

const STATUS_LABELS: Record<OrderStatus, { label: string; tone: "green" | "amber" | "red" | "gray" }> = {
  PAID: { label: "Đã thanh toán", tone: "green" },
  PENDING_PAYMENT: { label: "Chờ chuyển khoản", tone: "amber" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
  DRAFT: { label: "Nháp", tone: "gray" },
};

export default function OrdersClient({ initial }: { initial?: { orders: Order[]; total: number } }) {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  const [printing, setPrinting] = useState<Order | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const orders = useQuery({
    queryKey: ["orders", status, debounced],
    queryFn: () =>
      api<{ orders: Order[]; total: number }>(
        `/orders?limit=100&status=${status}&q=${encodeURIComponent(debounced)}`
      ),
    initialData: status === "" && debounced === "" ? initial : undefined,
  });

  // Đơn hủy tách section riêng; bảng chính chỉ hiện đơn còn hiệu lực
  const all = orders.data?.orders ?? [];
  const activeOrders = all.filter((o) => o.status !== "CANCELLED");
  const cancelledOrders = all.filter((o) => o.status === "CANCELLED");

  // Quét mã vạch trên hóa đơn in (máy quét USB kết thúc bằng Enter) → mở thẳng chi tiết
  const lookupCode = async (code: string) => {
    const { orders: found } = await api<{ orders: Order[] }>(
      `/orders?limit=2&q=${encodeURIComponent(code)}`
    );
    const exact = found.find((o) => o.code.toUpperCase() === code.toUpperCase()) ?? found[0];
    if (exact) {
      setDetail(exact);
      setQ("");
    } else {
      toast.error(`Không tìm thấy hóa đơn ${code}`);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageTitle title="Hóa đơn" />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-80">
          <ScanBarcode size={16} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" />
          <input
            className={`${input} pl-9 font-mono`}
            placeholder="Quét mã vạch hóa đơn hoặc gõ mã…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) {
                e.preventDefault();
                lookupCode(q.trim());
              }
            }}
          />
        </div>
        <AppSelect
          className="w-full sm:w-52"
          value={status || "all"}
          onValueChange={(v) => setStatus(v === "all" ? "" : v)}
          options={[
            { value: "all", label: "Tất cả trạng thái" },
            { value: "PAID", label: "Đã thanh toán" },
            { value: "PENDING_PAYMENT", label: "Chờ chuyển khoản" },
          ]}
        />
      </div>

      <OrdersTable orders={activeOrders} onPick={setDetail} empty="Không có hóa đơn nào" />

      {/* Hóa đơn đã hủy: tách riêng, mặc định thu gọn */}
      {cancelledOrders.length > 0 && (
        <section className="mt-6">
          <button
            className="flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink cursor-pointer"
            onClick={() => setShowCancelled((v) => !v)}
          >
            {showCancelled ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            Hóa đơn đã hủy ({cancelledOrders.length})
          </button>
          {showCancelled && (
            <div className="mt-3 opacity-75">
              <OrdersTable orders={cancelledOrders} onPick={setDetail} empty="Không có hóa đơn đã hủy" />
            </div>
          )}
        </section>
      )}

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
                    {it.discountPercent > 0 && (
                      <span className="ml-1 text-xs font-semibold text-leaf">−{it.discountPercent}%</span>
                    )}
                  </span>
                  <span className="money font-semibold">{formatMoney(itemLineTotal(it))}</span>
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
              {detail.vatAmount > 0 && <Row label={`VAT (${detail.vatRate}%)`} value={`+${formatMoney(detail.vatAmount)}`} />}
              <div className="flex justify-between pt-1 text-base font-extrabold">
                <span>Tổng cộng</span>
                <span className="money">{formatMoney(detail.total)}</span>
              </div>
              {detail.pointsEarned > 0 && (
                <div className="text-xs text-leaf">Khách được cộng {detail.pointsEarned} điểm</div>
              )}
            </div>
            {detail.status === "PAID" && (
              <button
                className={`${btn.primary} w-full`}
                onClick={() => {
                  setPrinting(detail);
                  setDetail(null);
                }}
              >
                <Printer size={16} /> In hóa đơn
              </button>
            )}
          </div>
        </Modal>
      )}
      {printing && <ReceiptDialog order={printing} onClose={() => setPrinting(null)} />}
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

function OrdersTable({
  orders,
  onPick,
  empty,
}: {
  orders: Order[];
  onPick: (o: Order) => void;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[720px] text-sm">
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
          {orders.map((o) => {
            const st = STATUS_LABELS[o.status];
            return (
              <tr key={o._id} className="cursor-pointer hover:bg-paper/60" onClick={() => onPick(o)}>
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
      {orders.length === 0 && <Empty message={empty} />}
    </div>
  );
}
