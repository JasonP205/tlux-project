"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getSocket } from "@/lib/socket";
import { formatMoney, itemLineTotal } from "@/lib/format";
import { useBranding } from "@/lib/hooks";
import type { Order } from "@/lib/types";

export default function DisplayClient({ cashierId }: { cashierId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [connected, setConnected] = useState(false);
  const branding = useBranding().data?.branding;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<Order | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      socket.emit("display:join", { cashierId });
      setConnected(true);
    };
    const apply = (o: Order | null) => {
      current.current = o;
      setOrder(o);
    };
    const onUpdate = ({ order: incoming }: { order: Order | null }) => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
      // Sau khi thanh toán, giữ màn hình "cảm ơn" vài giây thay vì về màn chờ ngay
      if (!incoming && current.current?.status === "PAID") {
        holdTimer.current = setTimeout(() => apply(null), 6000);
        return;
      }
      apply(incoming);
    };
    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("display:update", onUpdate);
    return () => {
      socket.off("connect", join);
      socket.off("display:update", onUpdate);
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, [cashierId]);

  const paid = order?.status === "PAID";
  const awaitingTransfer = order?.status === "PENDING_PAYMENT" && Boolean(order.payosQrCode);

  return (
    <div className="flex min-h-screen flex-col bg-pine text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-8 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={branding?.logoUrl ?? "/logo.png"} alt="" className="h-11 w-11 rounded-xl bg-white object-contain" />
        <div>
          <div className="text-xl font-extrabold tracking-wide">{branding?.storeName ?? "TLUX"}</div>
          <div className="text-xs text-white/50">Kính chào quý khách</div>
        </div>
        <span
          className={`ml-auto inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-leaf" : "bg-danger"}`}
          title={connected ? "Đã kết nối" : "Mất kết nối"}
        />
      </header>

      {!order || order.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding?.logoUrl ?? "/logo.png"} alt="" className="h-24 w-24 rounded-3xl bg-white object-contain opacity-90" />
          <p className="text-2xl font-bold">Chào mừng đến với {branding?.storeName ?? "TLUX"}</p>
          <p className="text-white/50">Hóa đơn của quý khách sẽ hiển thị tại đây</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-8 py-4">
            <table className="w-full text-lg">
              <thead className="text-left text-sm uppercase tracking-wide text-white/40">
                <tr>
                  <th className="py-2">Sản phẩm</th>
                  <th className="py-2 text-center">SL</th>
                  <th className="py-2 text-right">Đơn giá</th>
                  <th className="py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {order.items.map((it) => (
                  <tr key={it.product}>
                    <td className="py-2.5 font-semibold">
                      {it.name}
                      {it.discountPercent > 0 && (
                        <span className="ml-2 text-sm font-bold text-emerald-300">−{it.discountPercent}%</span>
                      )}
                    </td>
                    <td className="money py-2.5 text-center">{it.qty}</td>
                    <td className="money py-2.5 text-right text-white/70">{formatMoney(it.price)}</td>
                    <td className="money py-2.5 text-right font-bold">{formatMoney(itemLineTotal(it))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="border-t border-white/10 bg-pine-light/60 px-8 py-5">
            <div className="mx-auto flex max-w-3xl flex-col gap-1">
              {/* Chờ chuyển khoản: hiện mã QR PayOS để khách quét bằng app ngân hàng */}
              {awaitingTransfer && (
                <div className="mb-3 flex items-center justify-center gap-8 rounded-2xl bg-white/5 p-5">
                  <div className="rounded-xl bg-white p-3">
                    <QRCodeSVG value={order.payosQrCode!} size={190} />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-amber">Quét mã QR để chuyển khoản</p>
                    <p className="mt-1 max-w-sm text-white/60">
                      Dùng app ngân hàng bất kỳ. Màn hình sẽ tự xác nhận ngay khi nhận được tiền.
                    </p>
                  </div>
                </div>
              )}
              <Row label="Tạm tính" value={formatMoney(order.subtotal)} />
              {order.discountAmount > 0 && (
                <Row label={`Giảm giá (${order.discountCode})`} value={`−${formatMoney(order.discountAmount)}`} accent />
              )}
              {order.pointsDiscount > 0 && (
                <Row label={`Đổi ${order.pointsRedeemed} điểm`} value={`−${formatMoney(order.pointsDiscount)}`} accent />
              )}
              {order.vatAmount > 0 && (
                <Row label={`VAT (${order.vatRate}%)`} value={`+${formatMoney(order.vatAmount)}`} />
              )}
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-bold">
                  {paid
                    ? "ĐÃ THANH TOÁN — CẢM ƠN QUÝ KHÁCH!"
                    : awaitingTransfer
                      ? "CHỜ THANH TOÁN"
                      : "TỔNG CỘNG"}
                </span>
                <span className={`money text-5xl font-extrabold ${paid ? "text-emerald-400" : "text-amber"}`}>
                  {formatMoney(order.total)}
                </span>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-base ${accent ? "text-emerald-300" : "text-white/60"}`}>
      <span>{label}</span>
      <span className="money">{value}</span>
    </div>
  );
}
