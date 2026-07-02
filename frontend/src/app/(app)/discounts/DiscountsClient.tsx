"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Power } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { btn, input, label, Modal, Badge, Empty, PageTitle } from "@/components/ui";
import type { DiscountCode } from "@/lib/types";

export default function DiscountsClient({ initial }: { initial?: { discounts: DiscountCode[] } }) {
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  const discounts = useQuery({
    queryKey: ["discounts"],
    queryFn: () => api<{ discounts: DiscountCode[] }>("/discounts"),
    initialData: initial,
  });

  const toggle = useMutation({
    mutationFn: (d: DiscountCode) => api(`/discounts/${d._id}`, { method: "PUT", body: { active: !d.active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/discounts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Đã xóa mã giảm giá");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6">
      <PageTitle
        title="Mã giảm giá"
        action={
          <button className={btn.primary} onClick={() => setCreating(true)}>
            <Plus size={16} /> Tạo mã giảm giá
          </button>
        }
      />
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Giảm</th>
              <th className="px-4 py-3 text-right">Đơn tối thiểu</th>
              <th className="px-4 py-3 text-right">Đã dùng</th>
              <th className="px-4 py-3">Hiệu lực</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {discounts.data?.discounts.map((d) => (
              <tr key={d._id} className="hover:bg-paper/60">
                <td className="px-4 py-2.5 font-mono text-sm font-bold">{d.code}</td>
                <td className="px-4 py-2.5 font-semibold">
                  {d.type === "PERCENT" ? `${d.value}%` : formatMoney(d.value)}
                  {d.maxDiscount != null && (
                    <span className="ml-1 text-xs text-muted">(tối đa {formatMoney(d.maxDiscount)})</span>
                  )}
                </td>
                <td className="money px-4 py-2.5 text-right">{formatMoney(d.minOrderTotal)}</td>
                <td className="money px-4 py-2.5 text-right">
                  {d.usedCount}
                  {d.usageLimit != null && <span className="text-muted">/{d.usageLimit}</span>}
                </td>
                <td className="px-4 py-2.5 text-muted">
                  {d.validFrom || d.validTo
                    ? `${formatDate(d.validFrom)} → ${formatDate(d.validTo)}`
                    : "Không giới hạn"}
                </td>
                <td className="px-4 py-2.5">
                  {d.active ? <Badge tone="green">Đang chạy</Badge> : <Badge tone="gray">Tạm khóa</Badge>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button className={btn.ghost} onClick={() => toggle.mutate(d)} aria-label="Bật/tắt">
                    <Power size={15} />
                  </button>
                  <button
                    className={btn.ghost}
                    onClick={() => confirm(`Xóa mã ${d.code}?`) && remove.mutate(d._id)}
                    aria-label="Xóa"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {discounts.data?.discounts.length === 0 && <Empty message="Chưa có mã giảm giá nào" />}
      </div>
      {creating && <DiscountForm onClose={() => setCreating(false)} />}
    </div>
  );
}

function DiscountForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/discounts", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Đã tạo mã giảm giá");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal title="Tạo mã giảm giá" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          save.mutate({
            code: fd.get("code"),
            type,
            value: Number(fd.get("value")),
            maxDiscount: fd.get("maxDiscount") ? Number(fd.get("maxDiscount")) : null,
            minOrderTotal: Number(fd.get("minOrderTotal")) || 0,
            usageLimit: fd.get("usageLimit") ? Number(fd.get("usageLimit")) : null,
            validFrom: fd.get("validFrom") || null,
            validTo: fd.get("validTo") || null,
          });
        }}
      >
        <div>
          <label className={label}>Mã (khách nhập tại quầy)</label>
          <input name="code" required autoFocus className={`${input} font-mono uppercase`} placeholder="VD: TET2026" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Loại giảm</label>
            <select className={input} value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
              <option value="PERCENT">Theo phần trăm (%)</option>
              <option value="FIXED">Số tiền cố định (đ)</option>
            </select>
          </div>
          <div>
            <label className={label}>{type === "PERCENT" ? "Phần trăm giảm" : "Số tiền giảm (đ)"}</label>
            <input name="value" type="number" min={1} max={type === "PERCENT" ? 100 : undefined} required className={input} />
          </div>
          {type === "PERCENT" && (
            <div>
              <label className={label}>Giảm tối đa (đ)</label>
              <input name="maxDiscount" type="number" min={0} className={input} />
            </div>
          )}
          <div>
            <label className={label}>Đơn tối thiểu (đ)</label>
            <input name="minOrderTotal" type="number" min={0} className={input} />
          </div>
          <div>
            <label className={label}>Giới hạn lượt dùng</label>
            <input name="usageLimit" type="number" min={1} className={input} placeholder="Không giới hạn" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Từ ngày</label>
            <input name="validFrom" type="date" className={input} />
          </div>
          <div>
            <label className={label}>Đến hết ngày</label>
            <input name="validTo" type="date" className={input} />
          </div>
        </div>
        <button type="submit" className={`${btn.primary} w-full`} disabled={save.isPending}>
          Tạo mã
        </button>
      </form>
    </Modal>
  );
}
