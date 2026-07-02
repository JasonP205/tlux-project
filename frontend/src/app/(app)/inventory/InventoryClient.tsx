"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus, AlertTriangle, CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, daysUntil } from "@/lib/format";
import { btn, input, label, Modal, Badge, Empty, PageTitle } from "@/components/ui";
import type { InventoryBatch, Product } from "@/lib/types";

type Alerts = {
  expiringBatches: InventoryBatch[];
  lowStockProducts: (Product & { stock: number })[];
  outOfStockProducts: Product[];
};

export default function InventoryClient({
  initialBatches,
  initialAlerts,
}: {
  initialBatches?: { batches: InventoryBatch[] };
  initialAlerts?: Alerts;
}) {
  const [showImport, setShowImport] = useState(false);
  const batches = useQuery({
    queryKey: ["batches"],
    queryFn: () => api<{ batches: InventoryBatch[] }>("/inventory/batches?limit=100"),
    initialData: initialBatches,
  });
  const alerts = useQuery({
    queryKey: ["inventory-alerts"],
    queryFn: () => api<Alerts>("/inventory/alerts"),
    initialData: initialAlerts,
  });

  const a = alerts.data;

  return (
    <div className="p-6">
      <PageTitle
        title="Kho hàng"
        action={
          <button className={btn.primary} onClick={() => setShowImport(true)}>
            <PackagePlus size={16} /> Nhập kho
          </button>
        }
      />

      {a && (a.expiringBatches.length > 0 || a.lowStockProducts.length > 0 || a.outOfStockProducts.length > 0) && (
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          {a.expiringBatches.length > 0 && (
            <div className="rounded-xl border border-amber/40 bg-amber-soft p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber">
                <CalendarClock size={16} /> {a.expiringBatches.length} lô sắp hết hạn (30 ngày tới)
              </div>
              <ul className="space-y-1 text-sm">
                {a.expiringBatches.slice(0, 5).map((b) => (
                  <li key={b._id} className="flex justify-between">
                    <span>
                      {b.product?.name} <span className="text-muted">(còn {b.remaining})</span>
                    </span>
                    <span className="font-semibold">
                      {formatDate(b.expiryDate)} — {daysUntil(b.expiryDate)} ngày
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(a.lowStockProducts.length > 0 || a.outOfStockProducts.length > 0) && (
            <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-danger">
                <AlertTriangle size={16} /> Sắp hết / hết hàng
              </div>
              <ul className="space-y-1 text-sm">
                {a.outOfStockProducts.slice(0, 4).map((p) => (
                  <li key={p._id} className="flex justify-between">
                    <span>{p.name}</span>
                    <Badge tone="red">Hết hàng</Badge>
                  </li>
                ))}
                {a.lowStockProducts.slice(0, 4).map((p) => (
                  <li key={p._id} className="flex justify-between">
                    <span>{p.name}</span>
                    <span className="font-semibold">còn {p.stock}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3 text-right">Nhập</th>
              <th className="px-4 py-3 text-right">Còn lại</th>
              <th className="px-4 py-3">Ngày nhập kho</th>
              <th className="px-4 py-3">Hạn sử dụng</th>
              <th className="px-4 py-3">Người nhập</th>
              <th className="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {batches.data?.batches.map((b) => {
              const days = daysUntil(b.expiryDate);
              return (
                <tr key={b._id} className="hover:bg-paper/60">
                  <td className="px-4 py-2.5 font-semibold">{b.product?.name ?? "—"}</td>
                  <td className="money px-4 py-2.5 text-right">{b.quantityIn}</td>
                  <td className="money px-4 py-2.5 text-right font-semibold">
                    {b.remaining === 0 ? <Badge tone="gray">Hết lô</Badge> : b.remaining}
                  </td>
                  <td className="px-4 py-2.5">{formatDate(b.importDate)}</td>
                  <td className="px-4 py-2.5">
                    {b.expiryDate ? (
                      days != null && days <= 0 ? (
                        <Badge tone="red">Hết hạn {formatDate(b.expiryDate)}</Badge>
                      ) : days != null && days <= 30 && b.remaining > 0 ? (
                        <Badge tone="amber">
                          {formatDate(b.expiryDate)} ({days} ngày)
                        </Badge>
                      ) : (
                        formatDate(b.expiryDate)
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{b.createdBy?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{b.note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {batches.data?.batches.length === 0 && <Empty message="Chưa có lô hàng nào — nhấn Nhập kho để bắt đầu" />}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<Product | null>(null);

  const results = useQuery({
    queryKey: ["product-search", q],
    queryFn: () => api<{ products: Product[] }>(`/products/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  });

  const doImport = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/inventory/import", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["inventory-alerts"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Đã nhập kho");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal title="Nhập kho theo lô" onClose={onClose}>
      {!product ? (
        <div className="space-y-3">
          <div>
            <label className={label}>Tìm sản phẩm cần nhập</label>
            <input
              autoFocus
              className={input}
              placeholder="Tên hoặc mã vạch…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ul className="max-h-64 divide-y divide-line overflow-y-auto">
            {(results.data?.products ?? []).map((p) => (
              <li key={p._id}>
                <button
                  className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-paper cursor-pointer"
                  onClick={() => setProduct(p)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image?.url || "/product-placeholder.svg"}
                    alt=""
                    className="h-9 w-9 rounded-md border border-line object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="font-mono text-xs text-muted">{p.barcode}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            doImport.mutate({
              productId: product._id,
              quantity: Number(fd.get("quantity")),
              importDate: fd.get("importDate") || undefined,
              expiryDate: fd.get("expiryDate") || undefined,
              note: fd.get("note") || "",
            });
          }}
        >
          <div className="flex items-center justify-between rounded-lg bg-paper px-3 py-2">
            <span className="text-sm font-semibold">{product.name}</span>
            <button type="button" className={btn.ghost} onClick={() => setProduct(null)}>
              Đổi
            </button>
          </div>
          <div>
            <label className={label}>Số lượng nhập</label>
            <input name="quantity" type="number" min={1} required autoFocus className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Ngày nhập kho</label>
              <input name="importDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={input} />
            </div>
            <div>
              <label className={label}>Hạn sử dụng</label>
              <input name="expiryDate" type="date" className={input} />
            </div>
          </div>
          <div>
            <label className={label}>Ghi chú</label>
            <input name="note" className={input} placeholder="VD: NCC Minh Anh, đợt Tết…" />
          </div>
          <button type="submit" className={`${btn.primary} w-full`} disabled={doImport.isPending}>
            {doImport.isPending ? "Đang lưu…" : "Xác nhận nhập kho"}
          </button>
        </form>
      )}
    </Modal>
  );
}
