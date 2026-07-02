"use client";

import {
  Banknote,
  Minus,
  Plus,
  QrCode,
  Star,
  Trash2,
  TicketPercent,
  UserRound,
  X,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { btn, input, Badge, Empty } from "@/components/ui";
import type { Order } from "@/lib/types";

export type ItemInput = { productId: string; qty: number };

export default function InvoicePanel({
  order,
  checkoutPending,
  onCreate,
  onSetItems,
  onUpdate,
  onPickCustomer,
  onCash,
  onPayos,
  onShowQr,
  onCancel,
}: {
  order: Order | null;
  checkoutPending: boolean;
  onCreate: () => void;
  onSetItems: (items: ItemInput[]) => void;
  onUpdate: (body: Record<string, unknown>) => void;
  onPickCustomer: () => void;
  onCash: () => void;
  onPayos: () => void;
  onShowQr: () => void;
  onCancel: () => void;
}) {
  if (!order)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted">Chưa có hóa đơn nào đang mở</p>
        <button className={btn.primary} onClick={onCreate}>
          <Plus size={16} /> Tạo hóa đơn mới
        </button>
      </div>
    );

  const isDraft = order.status === "DRAFT";
  const toInputs = (transform?: (it: Order["items"][number]) => number) =>
    order.items
      .map((it) => ({ productId: it.product, qty: transform ? transform(it) : it.qty }))
      .filter((it) => it.qty > 0);

  return (
    <>
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted">{order.code}</span>
          {order.status === "PENDING_PAYMENT" && <Badge tone="amber">Chờ chuyển khoản</Badge>}
        </div>
        <input
          className="mt-1 w-full bg-transparent text-sm font-semibold placeholder:text-muted/50 focus:outline-none"
          placeholder="Ghi chú nhận diện khách (VD: Khách áo đỏ)…"
          defaultValue={order.label}
          key={order._id}
          disabled={!isDraft}
          onBlur={(e) => {
            if (e.target.value !== order.label) onUpdate({ label: e.target.value });
          }}
        />
      </div>

      {/* Khách hàng */}
      <div className="border-b border-line px-4 py-2.5">
        {order.customer ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserRound size={16} className="text-leaf" />
              <div>
                <div className="text-sm font-semibold">{order.customer.name}</div>
                <div className="text-xs text-muted">
                  {order.customer.phone} · <Star size={10} className="inline text-amber" />{" "}
                  {order.customer.points} điểm
                </div>
              </div>
            </div>
            {isDraft && (
              <button className={btn.ghost} onClick={() => onUpdate({ customerId: null })}>
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <button
            className="flex w-full items-center gap-2 text-sm text-muted hover:text-leaf cursor-pointer"
            onClick={onPickCustomer}
            disabled={!isDraft}
          >
            <UserRound size={16} /> Chọn khách hàng (tích điểm)
          </button>
        )}
      </div>

      {/* Danh sách món */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {order.items.length === 0 ? (
          <Empty message="Quét mã hoặc chọn sản phẩm để thêm vào hóa đơn" />
        ) : (
          <ul className="divide-y divide-line">
            {order.items.map((it) => (
              <li key={it.product} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{it.name}</div>
                  <div className="money text-xs text-muted">{formatMoney(it.price)}</div>
                </div>
                {isDraft ? (
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Giảm"
                      className="rounded-md border border-line p-1 hover:bg-paper cursor-pointer"
                      onClick={() =>
                        onSetItems(toInputs((x) => (x.product === it.product ? x.qty - 1 : x.qty)))
                      }
                    >
                      <Minus size={13} />
                    </button>
                    <span className="money w-7 text-center text-sm font-bold">{it.qty}</span>
                    <button
                      aria-label="Tăng"
                      className="rounded-md border border-line p-1 hover:bg-paper cursor-pointer"
                      onClick={() =>
                        onSetItems(toInputs((x) => (x.product === it.product ? x.qty + 1 : x.qty)))
                      }
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      aria-label="Xóa món"
                      className="ml-1 rounded-md p-1 text-muted hover:bg-danger-soft hover:text-danger cursor-pointer"
                      onClick={() =>
                        onSetItems(toInputs((x) => (x.product === it.product ? 0 : x.qty)))
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <span className="money text-sm">×{it.qty}</span>
                )}
                <div className="money w-20 text-right text-sm font-bold">
                  {formatMoney(it.price * it.qty)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Giảm giá + điểm + tổng */}
      <div className="space-y-2 border-t border-line px-4 py-3">
        {isDraft && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <TicketPercent size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                placeholder="Mã giảm giá"
                defaultValue={order.discountCode ?? ""}
                key={`dc-${order._id}`}
                className={`${input} pl-8 uppercase`}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    onUpdate({ discountCode: e.currentTarget.value.trim() || null });
                }}
              />
            </div>
            {order.customer && (
              <input
                type="number"
                min={0}
                max={order.customer.points}
                placeholder="Đổi điểm"
                defaultValue={order.pointsRedeemed || ""}
                key={`pt-${order._id}`}
                className={`${input} w-24`}
                title={`Khách có ${order.customer.points} điểm (1 điểm = 100đ)`}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    onUpdate({ pointsRedeemed: Number(e.currentTarget.value) || 0 });
                }}
              />
            )}
          </div>
        )}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted">
            <span>Tạm tính</span>
            <span className="money">{formatMoney(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-leaf">
              <span>Giảm giá ({order.discountCode})</span>
              <span className="money">−{formatMoney(order.discountAmount)}</span>
            </div>
          )}
          {order.pointsDiscount > 0 && (
            <div className="flex justify-between text-leaf">
              <span>Đổi {order.pointsRedeemed} điểm</span>
              <span className="money">−{formatMoney(order.pointsDiscount)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-bold">Khách phải trả</span>
            <span className="money text-2xl font-extrabold text-ink">{formatMoney(order.total)}</span>
          </div>
        </div>
        {isDraft ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              className={btn.primary}
              disabled={order.items.length === 0 || checkoutPending}
              onClick={onCash}
            >
              <Banknote size={17} /> Tiền mặt
            </button>
            <button
              className={btn.secondary}
              disabled={order.items.length === 0 || checkoutPending}
              onClick={onPayos}
            >
              <QrCode size={17} /> Chuyển khoản
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button className={btn.secondary} onClick={onShowQr}>
              <QrCode size={17} /> Xem mã QR
            </button>
            <button className={btn.danger} onClick={onCancel}>
              Hủy đơn
            </button>
          </div>
        )}
      </div>
    </>
  );
}
