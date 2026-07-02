"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { btn, input, label, Modal, Badge } from "@/components/ui";
import type { Customer } from "@/lib/types";

export default function CustomerPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (c: Customer) => void;
}) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const customers = useQuery({
    queryKey: ["customers", q],
    queryFn: () => api<{ customers: Customer[] }>(`/customers?q=${encodeURIComponent(q)}&limit=8`),
  });

  const create = useMutation({
    mutationFn: () => api<{ customer: Customer }>("/customers", { method: "POST", body: { name, phone } }),
    onSuccess: ({ customer }) => onPick(customer),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal title="Chọn khách hàng" onClose={onClose}>
      {!creating ? (
        <div className="space-y-3">
          <input
            autoFocus
            className={input}
            placeholder="Tìm theo tên hoặc số điện thoại…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="max-h-64 divide-y divide-line overflow-y-auto">
            {(customers.data?.customers ?? []).map((c) => (
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
          <button className={`${btn.secondary} w-full`} onClick={() => setCreating(true)}>
            <Plus size={15} /> Thêm khách hàng mới
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={label}>Tên khách hàng</label>
            <input autoFocus className={input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={label}>Số điện thoại</label>
            <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className={`${btn.primary} flex-1`} disabled={create.isPending} onClick={() => create.mutate()}>
              Lưu và chọn
            </button>
            <button className={btn.secondary} onClick={() => setCreating(false)}>
              Quay lại
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
