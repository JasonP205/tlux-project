"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney, formatDateTime, itemLineTotal } from "@/lib/format";
import { btn, Modal } from "@/components/ui";
import { BarcodeSvg } from "@/components/BarcodeCard";
import type { Order, Settings } from "@/lib/types";

const PAYMENT_LABELS: Record<string, string> = { CASH: "Tiền mặt", PAYOS: "Chuyển khoản" };

// In hóa đơn khổ 80mm: mở cửa sổ riêng chỉ chứa hóa đơn rồi gọi print
function printReceipt(html: string) {
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return;
  // <base> để ảnh logo (/logo.png) resolve đúng origin trong cửa sổ about:blank
  w.document.write(`<!doctype html><html><head><title>Hóa đơn</title><base href="${window.location.origin}">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&family=Playfair+Display:wght@800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 80mm; height: auto; }
    body { font-family: "Be Vietnam Pro", system-ui, -apple-system, sans-serif; font-size: 12px; color: #111; }
    .receipt { width: 80mm; padding: 3mm 3mm 2mm; }
  </style></head><body><div class="receipt">${html}</div></body></html>`);
  w.document.close();

  // Khổ giấy in: "size: 80mm auto" KHÔNG hợp lệ (bị trình duyệt bỏ qua → in ra A4 thừa giấy),
  // nên đo chiều cao nội dung thật rồi đặt @page đúng bằng khổ đó trước khi gọi print.
  // Phải đợi ảnh (logo) + webfont tải xong rồi mới đo/in, nếu không bản in thiếu logo, sai font.
  const doPrint = async () => {
    await Promise.all([...w.document.images].map((img) => img.decode().catch(() => undefined)));
    await w.document.fonts.ready.catch(() => undefined);
    const receipt = w.document.querySelector<HTMLElement>(".receipt");
    const heightMm = Math.ceil(((receipt?.offsetHeight ?? 600) * 25.4) / 96) + 2;
    const style = w.document.createElement("style");
    style.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
    w.document.head.appendChild(style);
    w.print();
    w.close();
  };
  if (w.document.readyState === "complete") void doPrint();
  else w.addEventListener("load", () => void doPrint());
}

// Nội dung hóa đơn (chỉ style inline — được copy nguyên vẹn qua innerHTML vào cửa sổ in).
// Dùng chung cho ReceiptDialog và preview ở trang Cài đặt.
export function ReceiptContent({ order, settings: s }: { order: Order; settings?: Settings | null }) {
  const cashierName = typeof order.cashier === "string" ? "" : order.cashier?.name;

  return (
    <div style={{ fontSize: 12.5, color: "#111", lineHeight: 1.45 }}>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s?.logo?.url ?? "/logo.png"}
          alt=""
          style={{ width: 56, height: 56, margin: "0 auto 4px", objectFit: "contain" }}
        />
        <div
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: 2,
          }}
        >
          {s?.storeName ?? "TLUX"}
        </div>
        {s?.storeAddress && <div style={{ fontSize: 10.5, color: "#555" }}>{s.storeAddress}</div>}
        {s?.storePhone && <div style={{ fontSize: 10.5, color: "#555" }}>ĐT: {s.storePhone}</div>}
        <div style={{ fontWeight: 700, marginTop: 8, fontSize: 14 }}>HÓA ĐƠN BÁN HÀNG</div>
      </div>

      <div style={{ borderTop: "1px dashed #999", padding: "6px 0", fontSize: 11.5 }}>
        <div>Số HĐ: <b>{order.code}</b></div>
        <div>Thời gian: {formatDateTime(order.paidAt ?? order.createdAt)}</div>
        {cashierName && <div>Thu ngân: {cashierName}</div>}
        {order.customer && (
          <div>
            Khách hàng: {order.customer.name} ({order.customer.phone})
          </div>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1px dashed #999" }}>
        <thead>
          <tr style={{ fontSize: 11, color: "#555", textAlign: "left" }}>
            <th style={{ padding: "5px 0" }}>Sản phẩm</th>
            <th style={{ textAlign: "center" }}>SL</th>
            <th style={{ textAlign: "right" }}>Đ.giá</th>
            <th style={{ textAlign: "right" }}>T.tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.product} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ padding: "4px 4px 4px 0" }}>
                {it.name}
                {it.discountPercent > 0 && (
                  <span style={{ fontSize: 10.5, color: "#555" }}> (giảm {it.discountPercent}%)</span>
                )}
              </td>
              <td style={{ textAlign: "center" }}>{it.qty}</td>
              <td style={{ textAlign: "right" }}>{formatMoney(it.price)}</td>
              <td style={{ textAlign: "right", fontWeight: 600 }}>{formatMoney(itemLineTotal(it))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #999", paddingTop: 6, marginTop: 4 }}>
        <Row label="Tạm tính" value={formatMoney(order.subtotal)} />
        {order.discountAmount > 0 && (
          <Row label={`Giảm giá (${order.discountCode})`} value={`−${formatMoney(order.discountAmount)}`} />
        )}
        {order.pointsDiscount > 0 && (
          <Row label={`Đổi ${order.pointsRedeemed} điểm`} value={`−${formatMoney(order.pointsDiscount)}`} />
        )}
        {order.vatAmount > 0 && (
          <Row label={`VAT (${order.vatRate}%)`} value={`+${formatMoney(order.vatAmount)}`} />
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15, padding: "4px 0" }}>
          <span>TỔNG CỘNG</span>
          <span>{formatMoney(order.total)}</span>
        </div>
        {order.paymentMethod && (
          <Row label="Thanh toán" value={PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod} />
        )}
        {order.pointsEarned > 0 && <Row label="Điểm tích lũy" value={`+${order.pointsEarned} điểm`} />}
      </div>

      {/* Mã vạch số hóa đơn — căn giữa, quét tại trang Hóa đơn để tra cứu nhanh */}
      <div style={{ borderTop: "1px dashed #999", marginTop: 6, paddingTop: 4 }}>
        <BarcodeSvg value={order.code} height={38} barWidth={1.3} style={{ display: "block", margin: "0 auto" }} />
      </div>

      {/* WiFi cho khách: chữ hoặc QR (quét là điện thoại tự kết nối) tùy Cài đặt */}
      {s && s.wifiDisplay !== "off" && s.wifiName && (
        <div style={{ textAlign: "center", borderTop: "1px dashed #999", marginTop: 4, paddingTop: 6, fontSize: 11.5 }}>
          {s.wifiDisplay === "text" ? (
            <div>
              WiFi: <b>{s.wifiName}</b>
              {s.wifiPassword && (
                <>
                  {" — "}Mật khẩu: <b>{s.wifiPassword}</b>
                </>
              )}
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Quét để kết nối WiFi</div>
              <QRCodeSVG
                value={`WIFI:T:WPA;S:${s.wifiName};P:${s.wifiPassword};;`}
                size={92}
                style={{ display: "block", margin: "0 auto" }}
              />
              <div style={{ fontSize: 10.5, color: "#777", marginTop: 3 }}>{s.wifiName}</div>
            </>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", borderTop: "1px dashed #999", marginTop: 4, paddingTop: 8, fontSize: 11.5 }}>
        <div style={{ fontWeight: 600 }}>{s?.receiptFooter ?? "Cảm ơn quý khách, hẹn gặp lại!"}</div>
        {(s?.receiptReturnNote ?? "Đổi trả trong 3 ngày kèm hóa đơn") && (
          <div style={{ color: "#777", marginTop: 2 }}>
            {s?.receiptReturnNote ?? "Đổi trả trong 3 ngày kèm hóa đơn"}
          </div>
        )}
        <span style={{}}>Một sản phẩm của Jason Dev</span>
      </div>
    </div>
  );
}

export default function ReceiptDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ settings: Settings }>("/settings"),
    staleTime: 60_000,
  });

  return (
    <Modal title="Hóa đơn thanh toán" onClose={onClose}>
      <div className="space-y-4">
        <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-line bg-white p-4">
          <div ref={ref}>
            <ReceiptContent order={order} settings={data?.settings} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className={btn.primary} onClick={() => printReceipt(ref.current?.innerHTML ?? "")}>
            <Printer size={16} /> In hóa đơn
          </button>
          <button className={btn.secondary} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "1.5px 0", fontSize: 12 }}>
      <span style={{ color: "#444" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
