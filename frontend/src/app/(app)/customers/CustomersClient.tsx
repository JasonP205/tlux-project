"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Star, CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { btn, input, label, Modal, Empty, PageTitle, TableSkeleton } from "@/components/ui";
import { BarcodeModal } from "@/components/BarcodeCard";
import type { Customer } from "@/lib/types";

export default function CustomersClient({ initial }: { initial?: { customers: Customer[] } }) {
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [card, setCard] = useState<Customer | null>(null);

  const customers = useQuery({
    queryKey: ["customers", q],
    queryFn: () => api<{ customers: Customer[] }>(`/customers?q=${encodeURIComponent(q)}&limit=100`),
    initialData: q === "" ? initial : undefined,
  });

  return (
    <div className="p-4 sm:p-6">
      <PageTitle
        title="Khách hàng"
        action={
          <button className={btn.primary} onClick={() => setCreating(true)}>
            <Plus size={16} /> Thêm khách hàng
          </button>
        }
      />
      <div className="relative mb-4 w-full sm:w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className={`${input} pl-9`}
          placeholder="Tìm tên hoặc số điện thoại…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {!customers.data ? (
        <TableSkeleton />
      ) : (
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-paper text-left text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Số điện thoại</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-right">Điểm tích lũy</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3">Thẻ thành viên</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.data?.customers.map((c) => (
              <tr key={c._id} className="hover:bg-paper/60">
                <td className="px-4 py-2.5">
                  <Link href={`/customers/${c._id}`} className="font-semibold text-leaf hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{c.phone}</td>
                <td className="px-4 py-2.5 text-muted">{c.email || "—"}</td>
                <td className="money px-4 py-2.5 text-right font-semibold">
                  <Star size={12} className="mr-1 inline text-amber" />
                  {c.points}
                </td>
                <td className="px-4 py-2.5 text-muted">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-2.5">
                  {c.memberCode && (
                    <button
                      className={`${btn.ghost} px-2`}
                      onClick={() => setCard(c)}
                      title="Xem / in thẻ thành viên"
                    >
                      <CreditCard size={15} />
                      <span className="font-mono text-xs">{c.memberCode}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.data?.customers.length === 0 && <Empty message="Chưa có khách hàng nào" />}
      </div>
      )}
      {creating && <CustomerForm onClose={() => setCreating(false)} />}
      {card && (
        <BarcodeModal
          title="Thẻ thành viên TLUX"
          subtitle={`${card.name} — quét tại quầy để tích/đổi điểm`}
          value={card.memberCode}
          onClose={() => setCard(null)}
        />
      )}
    </div>
  );
}

function CustomerForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/customers", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Đã thêm khách hàng");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal title="Thêm khách hàng" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          save.mutate({
            name: fd.get("name"),
            phone: fd.get("phone"),
            email: fd.get("email") || "",
            note: fd.get("note") || "",
          });
        }}
      >
        <div>
          <label className={label}>Tên khách hàng</label>
          <input name="name" required autoFocus className={input} />
        </div>
        <div>
          <label className={label}>Số điện thoại</label>
          <input name="phone" required className={input} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input name="email" type="email" className={input} />
        </div>
        <div>
          <label className={label}>Ghi chú</label>
          <input name="note" className={input} />
        </div>
        <button type="submit" className={`${btn.primary} w-full`} disabled={save.isPending}>
          Lưu khách hàng
        </button>
      </form>
    </Modal>
  );
}
