"use client";

import { use, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle2, ScanBarcode } from "lucide-react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export default function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [scans, setScans] = useState<{ code: string; at: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastRef = useRef<{ code: string; at: number } | null>(null);

  const session = useQuery({
    queryKey: ["scan-session", token],
    queryFn: () => api<{ valid: boolean }>(`/scan-sessions/${token}`),
    retry: false,
  });

  useEffect(() => {
    if (!session.data?.valid) return;
    const socket = getSocket();
    socket.emit("phone:join", { token });

    const scanner = new Html5Qrcode("scanner");
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 160 } },
        (decoded) => {
          const now = Date.now();
          // Chống quét trùng: bỏ qua cùng một mã trong vòng 2.5 giây
          if (lastRef.current && lastRef.current.code === decoded && now - lastRef.current.at < 2500)
            return;
          lastRef.current = { code: decoded, at: now };
          socket.emit("scan:barcode", { token, barcode: decoded });
          if (navigator.vibrate) navigator.vibrate(80);
          setScans((prev) => [{ code: decoded, at: now }, ...prev].slice(0, 15));
        },
        () => {}
      )
      .catch((err) => setError(`Không mở được camera: ${err}`));

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [session.data?.valid, token]);

  if (session.isLoading)
    return <Center>Đang kiểm tra phiên quét…</Center>;
  if (session.isError)
    return <Center>Phiên quét không hợp lệ hoặc đã hết hạn. Hãy tạo mã QR mới trên máy thu ngân.</Center>;

  return (
    <div className="flex min-h-screen flex-col bg-pine text-white">
      <header className="flex items-center gap-2 px-4 py-3">
        <ScanBarcode size={20} className="text-leaf" />
        <div>
          <div className="text-sm font-bold">TLUX — Máy quét di động</div>
          <div className="text-xs text-white/50">Hướng camera vào mã vạch sản phẩm</div>
        </div>
      </header>
      <div id="scanner" className="mx-4 overflow-hidden rounded-2xl bg-black" />
      {error && <p className="px-4 py-3 text-sm text-red-300">{error}</p>}
      <div className="flex-1 px-4 py-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
          Đã gửi tới máy thu ngân
        </h2>
        <ul className="space-y-1.5">
          {scans.map((s) => (
            <li key={s.at} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <CheckCircle2 size={15} className="text-leaf" />
              <span className="font-mono text-sm">{s.code}</span>
            </li>
          ))}
        </ul>
        {scans.length === 0 && !error && (
          <p className="text-sm text-white/40">Chưa quét mã nào</p>
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pine p-6 text-center text-sm text-white/80">
      {children}
    </div>
  );
}
