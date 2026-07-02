"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Modal, Badge } from "@/components/ui";

export default function PhoneScanModal({
  onClose,
  onBarcode,
}: {
  onClose: () => void;
  onBarcode: (code: string) => void;
}) {
  const [connected, setConnected] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const session = useQuery({
    queryKey: ["scan-session"],
    queryFn: () => api<{ token: string; lanIps: string[] }>("/scan-sessions", { method: "POST" }),
    staleTime: Infinity,
    gcTime: 0,
  });

  const token = session.data?.token;

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    socket.emit("pos:join", { token });
    const onConnected = () => setConnected(true);
    const onScan = ({ barcode }: { barcode: string }) => {
      setLastCode(barcode);
      onBarcode(barcode);
    };
    socket.on("phone:connected", onConnected);
    socket.on("scan:barcode", onScan);
    return () => {
      socket.off("phone:connected", onConnected);
      socket.off("scan:barcode", onScan);
    };
  }, [token, onBarcode]);

  // Dev trên localhost: điện thoại không mở được "localhost" → dùng IP LAN của máy chủ
  let scanUrl: string | null = null;
  if (token && typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const isLocal = ["localhost", "127.0.0.1"].includes(hostname);
    const lanIp = session.data?.lanIps?.[0];
    const host = isLocal && lanIp ? lanIp : hostname;
    scanUrl = `${protocol}//${host}${port ? `:${port}` : ""}/scan/${token}`;
  }

  return (
    <Modal title="Quét bằng điện thoại" onClose={onClose}>
      <div className="flex flex-col items-center gap-3 text-center">
        {scanUrl ? (
          <>
            <p className="text-sm text-muted">
              Dùng camera điện thoại (cùng mạng Wi-Fi) quét mã QR này để mở trang quét. Mã vạch quét được
              sẽ tự thêm vào hóa đơn đang mở.
            </p>
            <div className="rounded-xl border border-line bg-white p-4">
              <QRCodeSVG value={scanUrl} size={200} />
            </div>
            <div className="font-mono text-xs break-all text-muted">{scanUrl}</div>
            {connected ? (
              <Badge tone="green">Điện thoại đã kết nối</Badge>
            ) : (
              <Badge tone="gray">Đang chờ điện thoại kết nối…</Badge>
            )}
            {lastCode && <div className="font-mono text-xs text-muted">Vừa quét: {lastCode}</div>}
          </>
        ) : (
          <p className="text-sm text-muted">Đang tạo phiên quét…</p>
        )}
      </div>
    </Modal>
  );
}
