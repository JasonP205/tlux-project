"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { btn, input, label, Modal, Badge } from "@/components/ui";
import type { Customer } from "@/lib/types";

const isPhone = (s: string) => /^0\d{8,10}$/.test(s);

export default function CustomerPicker({
  onClose,
  onPick,
  onPickNew,
}: {
  onClose: () => void;
  onPick: (c: Customer) => void;
  // Khách mới: chưa lưu DB ngay, chỉ lưu khi hóa đơn thanh toán thành công
  onPickNew: (c: { name: string; phone: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const query = q.trim();

  const customers = useQuery({
    queryKey: ["customers", query],
    queryFn: () => api<{ customers: Customer[] }>(`/customers?q=${encodeURIComponent(query)}&limit=8`),
  });

  const results = customers.data?.customers ?? [];
  // Nhập đủ SĐT mà không có khách nào trùng → hiện ô nhập tên để tạo khách mới
  const phoneNotFound =
    isPhone(query) && customers.isSuccess && !results.some((c) => c.phone === query);

  return (
    <Modal title="Chọn khách hàng" onClose={onClose}>
      <div className="space-y-3">
        <input
          autoFocus
          className={input}
          placeholder="Nhập số điện thoại hoặc tên khách…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="max-h-64 divide-y divide-line overflow-y-auto">
            {results.map((c) => (
              <li key={c._id}>
                <button
                  className="flex w-full items-center justify-between px-1 py-2.5 text-left hover:bg-paper cursor-pointer"
                  onClick={() => onPick(c)}
                >
                  <div>
                    <div className="text-sm font-semibold">{c.name}</div>
                    <div className="text-xs text-muted">{c.phone}</div>
                  </div>
                  <Badge tone="green">{c.points} điểm</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}

        {phoneNotFound && (
          <div className="space-y-3 rounded-xl border border-dashed border-leaf/50 bg-leaf-soft/40 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-leaf-dark">
              <UserPlus size={15} /> Số {query} chưa có trong hệ thống
            </div>
            <div>
              <label className={label}>Tên khách hàng</label>
              <input
                autoFocus
                className={input}
                placeholder="VD: Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) onPickNew({ name: name.trim(), phone: query });
                }}
              />
            </div>
            <button
              className={`${btn.primary} w-full`}
              disabled={!name.trim()}
              onClick={() => onPickNew({ name: name.trim(), phone: query })}
            >
              Dùng cho hóa đơn này
            </button>
            <p className="text-xs text-muted">
              Khách sẽ được lưu vào hệ thống và bắt đầu tích điểm khi hóa đơn thanh toán thành công.
            </p>
          </div>
        )}

        {!phoneNotFound && results.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">
            {query
              ? "Không tìm thấy — nhập đủ số điện thoại để thêm khách mới"
              : "Nhập SĐT: nếu chưa có sẽ tạo khách mới ngay tại quầy"}
          </p>
        )}
      </div>
    </Modal>
  );
}
