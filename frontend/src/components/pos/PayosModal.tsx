"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { btn, Modal } from "@/components/ui";
import type { Order } from "@/lib/types";

export default function PayosModal({
  order,
  onClose,
  onPaid,
  onCancel,
}: {
  order: Order;
  onClose: () => void;
  onPaid: () => void;
  onCancel: () => void;
}) {
  // Vừa nghe socket, vừa poll dự phòng mỗi 3 giây
  const status = useQuery({
    queryKey: ["order-status", order._id],
    queryFn: () => api<{ order: Order }>(`/orders/${order._id}`),
    refetchInterval: 3000,
  });

  useEffect(() => {
    const socket = getSocket();
    socket.emit("order:watch", { orderId: order._id });
    const onPaidEvent = ({ orderId }: { orderId: string }) => {
      if (orderId === order._id) onPaid();
    };
    socket.on("order:paid", onPaidEvent);
    return () => {
      socket.emit("order:unwatch", { orderId: order._id });
      socket.off("order:paid", onPaidEvent);
    };
  }, [order._id, onPaid]);

  useEffect(() => {
    if (status.data?.order.status === "PAID") onPaid();
  }, [status.data, onPaid]);

  return (
    <Modal title={`Chuyển khoản — ${order.code}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="money text-2xl font-extrabold">{formatMoney(order.total)}</div>
        {order.payosQrCode ? (
          <div className="rounded-xl border border-line bg-white p-4">
            <QRCodeSVG value={order.payosQrCode} size={220} />
          </div>
        ) : (
          <p className="text-sm text-danger">Không có mã QR — kiểm tra cấu hình PayOS</p>
        )}
        <p className="text-sm text-muted">
          Khách quét mã bằng app ngân hàng. Màn hình sẽ tự xác nhận khi nhận được tiền.
        </p>
        {order.payosCheckoutUrl && (
          <a href={order.payosCheckoutUrl} target="_blank" className="text-sm font-semibold text-leaf underline">
            Mở trang thanh toán PayOS
          </a>
        )}
        <div className="flex w-full gap-2 pt-2">
          <button className={`${btn.secondary} flex-1`} onClick={onClose}>
            Thu sau (giữ đơn)
          </button>
          <button className={`${btn.danger} flex-1`} onClick={onCancel}>
            Hủy đơn
          </button>
        </div>
      </div>
    </Modal>
  );
}
