"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus, AlertTriangle, CalendarClock, Smartphone, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, daysUntil } from "@/lib/format";
import { btn, input, label, Modal, Badge, Empty, PageTitle } from "@/components/ui";
import ProductForm from "@/components/ProductForm";
import PhoneScanModal from "@/components/pos/PhoneScanModal";
import type { Category, InventoryBatch, Product } from "@/lib/types";

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
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);
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
    <div className="p-4 sm:p-6">
      <PageTitle
        title="Kho hàng"
        subtitle="Số lượng tồn theo từng lô nhập (kèm hạn sử dụng) — thông tin và giá bán sửa ở trang Sản phẩm"
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

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-paper text-left text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3 text-right">Nhập</th>
              <th className="px-4 py-3 text-right">Còn lại</th>
              <th className="px-4 py-3">Ngày nhập kho</th>
              <th className="px-4 py-3">Hạn sử dụng</th>
              <th className="px-4 py-3">Người nhập</th>
              <th className="px-4 py-3">Ghi chú</th>
              <th className="px-4 py-3" />
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
                  <td className="px-4 py-2.5 text-right">
                    <button className={btn.ghost} onClick={() => setEditingBatch(b)} aria-label="Sửa lô">
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {batches.data?.batches.length === 0 && <Empty message="Chưa có lô hàng nào — nhấn Nhập kho để bắt đầu" />}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {editingBatch && <EditBatchModal batch={editingBatch} onClose={() => setEditingBatch(null)} />}
    </div>
  );
}

// Sửa lô đã nhập: nhập nhầm số lượng/HSD, hoặc hạ "còn lại" khi hủy hàng hỏng
function EditBatchModal({ batch, onClose }: { batch: InventoryBatch; onClose: () => void }) {
  const qc = useQueryClient();
  const sold = batch.quantityIn - batch.remaining;

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/inventory/batches/${batch._id}`, { method: "PUT", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["inventory-alerts"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Đã cập nhật lô hàng");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal title="Sửa lô hàng" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const quantityIn = Number(fd.get("quantityIn"));
          const remaining = Number(fd.get("remaining"));
          update.mutate({
            ...(quantityIn !== batch.quantityIn ? { quantityIn } : null),
            // Gửi remaining sau quantityIn: server áp quantityIn trước rồi mới ghi đè remaining
            ...(remaining !== batch.remaining ? { remaining } : null),
            expiryDate: fd.get("expiryDate") || null,
            note: fd.get("note") ?? "",
          });
        }}
      >
        <div className="rounded-lg bg-paper px-3 py-2 text-sm">
          <span className="font-semibold">{batch.product?.name}</span>
          <span className="text-muted"> — nhập ngày {formatDate(batch.importDate)}</span>
          {sold > 0 && <span className="text-muted"> · đã xuất {sold}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Số lượng nhập</label>
            <input
              name="quantityIn"
              type="number"
              min={Math.max(1, sold)}
              required
              defaultValue={batch.quantityIn}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Còn lại</label>
            <input
              name="remaining"
              type="number"
              min={0}
              required
              defaultValue={batch.remaining}
              className={input}
            />
          </div>
        </div>
        <div>
          <label className={label}>Hạn sử dụng</label>
          <input
            name="expiryDate"
            type="date"
            defaultValue={batch.expiryDate ? batch.expiryDate.slice(0, 10) : ""}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Ghi chú</label>
          <input name="note" defaultValue={batch.note} className={input} />
        </div>
        <button type="submit" className={`${btn.primary} w-full`} disabled={update.isPending}>
          {update.isPending ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </form>
    </Modal>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  // Mã vạch quét ra chưa có trong hệ thống → mở form đăng ký sản phẩm mới với mã đó
  const [newBarcode, setNewBarcode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const results = useQuery({
    queryKey: ["product-search", q],
    queryFn: () => api<{ products: Product[] }>(`/products/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length > 0,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<{ categories: Category[] }>("/categories"),
  });

  // Quét mã (USB kết thúc bằng Enter, hoặc camera điện thoại): có sẵn → sang bước nhập lô,
  // chưa có → form thêm sản phẩm, lưu xong tiếp tục nhập lô luôn
  const lookupBarcode = async (code: string) => {
    try {
      const { product } = await api<{ product: Product }>(
        `/products/barcode/${encodeURIComponent(code)}?includeInactive=1`
      );
      if (!product.active) {
        // Hàng ngừng kinh doanh quét lại → điền form, lưu sẽ kích hoạt bán lại (POST cùng mã vạch)
        toast.info(`Mã này thuộc "${product.name}" đang ngừng kinh doanh — lưu để bán lại`);
        setNewBarcode(code);
        return;
      }
      setProduct(product);
      setQ("");
    } catch {
      toast.info(`Mã ${code} chưa có — nhập thông tin sản phẩm mới`);
      setNewBarcode(code);
    }
  };

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

  if (newBarcode) {
    return (
      <ProductForm
        product={null}
        categories={categories.data?.categories ?? []}
        initialBarcode={newBarcode}
        onClose={() => setNewBarcode(null)}
        onSaved={(p) => {
          setNewBarcode(null);
          setProduct(p);
          setQ("");
        }}
      />
    );
  }

  return (
    <Modal
      title="Nhập kho theo lô"
      description="Cộng số lượng vào kho cho sản phẩm đã có trong danh mục. Quét mã chưa có sẽ mở form khai báo sản phẩm trước."
      onClose={onClose}
    >
      {!product ? (
        <div className="space-y-3">
          <div>
            <label className={label}>Quét mã vạch hoặc tìm sản phẩm cần nhập</label>
            <div className="flex gap-2">
              <input
                autoFocus
                className={input}
                placeholder="Quét mã vạch hoặc gõ tên sản phẩm…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  // Máy quét USB kết thúc bằng Enter → tra đúng mã; chưa có thì mở form sản phẩm mới
                  if (e.key === "Enter" && q.trim()) {
                    e.preventDefault();
                    lookupBarcode(q.trim());
                  }
                }}
              />
              <button
                type="button"
                className={btn.secondary}
                onClick={() => setScanning(true)}
                title="Quét bằng camera điện thoại"
              >
                <Smartphone size={15} />
              </button>
            </div>
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
      {scanning && (
        <PhoneScanModal
          onClose={() => setScanning(false)}
          onBarcode={(code) => {
            setScanning(false);
            lookupBarcode(code);
          }}
        />
      )}
    </Modal>
  );
}
