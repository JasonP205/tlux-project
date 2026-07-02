"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { btn, input, label, Modal } from "@/components/ui";

export default function CashModal({
  total,
  pending,
  onClose,
  onConfirm,
}: {
  total: number;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [received, setReceived] = useState<number>(total);
  const change = received - total;

  return (
    <Modal title="Thanh toán tiền mặt" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Khách phải trả</span>
          <span className="money text-lg font-extrabold">{formatMoney(total)}</span>
        </div>
        <div>
          <label className={label}>Tiền khách đưa</label>
          <input
            type="number"
            autoFocus
            className={`${input} money text-lg font-bold`}
            value={received}
            min={0}
            onChange={(e) => setReceived(Number(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && change >= 0 && onConfirm()}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[total, 100000, 200000, 500000].map((v, i) => (
              <button
                key={i}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold hover:bg-paper cursor-pointer"
                onClick={() => setReceived(v)}
              >
                {i === 0 ? "Vừa đủ" : formatMoney(v)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Tiền thối lại</span>
          <span className={`money text-lg font-bold ${change < 0 ? "text-danger" : "text-leaf"}`}>
            {change < 0 ? "Khách đưa thiếu" : formatMoney(change)}
          </span>
        </div>
        <button className={`${btn.primary} w-full`} disabled={change < 0 || pending} onClick={onConfirm}>
          {pending ? "Đang xử lý…" : "Xác nhận đã thu tiền"}
        </button>
      </div>
    </Modal>
  );
}
