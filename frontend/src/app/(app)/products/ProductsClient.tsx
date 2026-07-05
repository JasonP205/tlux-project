"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Barcode, ChevronLeft, ChevronRight, TicketPercent, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney, formatDate, daysUntil } from "@/lib/format";
import { useMe } from "@/lib/hooks";
import { btn, input, label, Modal, Badge, Empty, PageTitle, AppSelect, ConfirmDialog } from "@/components/ui";
import ProductForm from "@/components/ProductForm";
import { BarcodeSvg, printBarcode } from "@/components/BarcodeCard";
import type { Category, Product } from "@/lib/types";

export const PAGE_SIZE = 20;

function productsUrl(page: number, category: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}

export default function ProductsClient({
  page,
  category,
  initialProducts,
  initialCategories,
}: {
  page: number;
  category: string;
  initialProducts?: { products: Product[]; total: number };
  initialCategories?: { categories: Category[] };
}) {
  const { data: me } = useMe();
  const canEdit = me && ["ADMIN", "MANAGER"].includes(me.user.role);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [promoFor, setPromoFor] = useState<Product | null>(null);
  const qc = useQueryClient();

  // Tìm kiếm theo tên luôn xem từ trang 1; duyệt bình thường thì phân trang theo URL
  const effectivePage = q ? 1 : page;

  const products = useQuery({
    queryKey: ["products", { q, category, page: effectivePage }],
    queryFn: () =>
      api<{ products: Product[]; total: number }>(
        `/products?limit=${PAGE_SIZE}&page=${effectivePage}&q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`
      ),
    initialData: q === "" && page === effectivePage ? initialProducts : undefined,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<{ categories: Category[] }>("/categories"),
    initialData: initialCategories,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Đã ngừng kinh doanh sản phẩm");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = products.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-4 sm:p-6">
      <PageTitle
        title="Sản phẩm"
        subtitle="Danh mục hàng hóa: tên, giá bán, mã vạch, hình ảnh — muốn cộng thêm số lượng, dùng Nhập kho ở trang Kho hàng"
        action={
          <div className="flex gap-2">
            <Link href="/products/barcodes" className={btn.secondary}>
              <Barcode size={16} /> Tem mã vạch
            </Link>
            {canEdit && (
              <button className={btn.primary} onClick={() => setEditing("new")}>
                <Plus size={16} /> Thêm sản phẩm
              </button>
            )}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" />
          <input
            className={`${input} pl-9`}
            placeholder="Tìm tên hoặc mã vạch…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <AppSelect
          className="w-full sm:w-48"
          value={category || "all"}
          onValueChange={(v) => router.push(productsUrl(1, v === "all" ? "" : v))}
          options={[
            { value: "all", label: "Tất cả danh mục" },
            ...(categories.data?.categories ?? []).map((c) => ({ value: c.slug, label: c.name })),
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-paper text-left text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Mã vạch</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3 text-right">Giá bán</th>
              <th className="px-4 py-3 text-right">Tồn kho</th>
              <th className="px-4 py-3">HSD gần nhất</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.data?.products.map((p) => {
              const days = daysUntil(p.nearestExpiry);
              return (
                <tr key={p._id} className="hover:bg-paper/60">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image?.url || "/product-placeholder.svg"}
                        alt=""
                        className="h-10 w-10 rounded-lg border border-line bg-paper object-cover"
                      />
                      <div>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs text-muted">{p.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{p.barcode}</td>
                  <td className="px-4 py-2.5 text-muted">{p.category?.name || "—"}</td>
                  <td className="money px-4 py-2.5 text-right font-semibold">{formatMoney(p.price)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {(p.stock ?? 0) === 0 ? (
                      <Badge tone="red">Hết hàng</Badge>
                    ) : (p.stock ?? 0) <= 10 ? (
                      <Badge tone="amber">{p.stock}</Badge>
                    ) : (
                      <span className="money">{p.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.nearestExpiry ? (
                      days != null && days <= 30 ? (
                        <Badge tone={days <= 7 ? "red" : "amber"}>
                          {formatDate(p.nearestExpiry)} ({days} ngày)
                        </Badge>
                      ) : (
                        <span className="text-muted">{formatDate(p.nearestExpiry)}</span>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5 text-right">
                      <button
                        className={btn.ghost}
                        onClick={() => setPromoFor(p)}
                        aria-label="Tem giảm giá"
                        title="In tem giảm giá"
                      >
                        <TicketPercent size={15} />
                      </button>
                      <button className={btn.ghost} onClick={() => setEditing(p)} aria-label="Sửa">
                        <Pencil size={15} />
                      </button>
                      <button
                        className={btn.ghost}
                        onClick={() => setDeleting(p)}
                        aria-label="Ngừng kinh doanh"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.data?.products.length === 0 && <Empty message="Không có sản phẩm nào" />}
      </div>

      {/* Phân trang: 20 sản phẩm/trang, URL dạng /products?page=2&category=banhkeo */}
      {!q && totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between" aria-label="Phân trang">
          <span className="text-sm text-muted">
            {total} sản phẩm · trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={productsUrl(Math.max(1, page - 1), category)}
              className={`${btn.secondary} px-2.5 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
              aria-disabled={page <= 1}
            >
              <ChevronLeft size={16} />
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
              .map((n, idx, arr) => (
                <span key={n} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== n - 1 && <span className="px-1 text-muted">…</span>}
                  <Link
                    href={productsUrl(n, category)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
                      n === page ? "bg-leaf text-white" : "border border-line bg-surface hover:bg-paper"
                    }`}
                    aria-current={n === page ? "page" : undefined}
                  >
                    {n}
                  </Link>
                </span>
              ))}
            <Link
              href={productsUrl(Math.min(totalPages, page + 1), category)}
              className={`${btn.secondary} px-2.5 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
              aria-disabled={page >= totalPages}
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </nav>
      )}

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          categories={categories.data?.categories ?? []}
          onClose={() => setEditing(null)}
        />
      )}
      {promoFor && <PromoLabelModal product={promoFor} onClose={() => setPromoFor(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        title="Ngừng kinh doanh sản phẩm?"
        description={deleting ? `"${deleting.name}" sẽ bị ẩn khỏi bán hàng và tìm kiếm.` : undefined}
        confirmLabel="Ngừng kinh doanh"
        danger
        onConfirm={() => deleting && remove.mutate(deleting._id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

// Tem giảm giá in sẵn cho 1 sản phẩm (hàng gần hết hạn, xả kho…):
// mã PMP<%><mã vạch gốc> — quét tại POS sẽ tự thêm sản phẩm kèm mức giảm này
function PromoLabelModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [percent, setPercent] = useState(30);
  const clamped = Math.min(100, Math.max(1, Math.round(percent) || 1));
  const code = `PMP${clamped}${product.barcode}`;
  const discounted = Math.round((product.price * (100 - clamped)) / 100);

  return (
    <Modal
      title="Tem giảm giá sản phẩm"
      description="Dành cho hàng cận hạn sử dụng hoặc cần thanh lý. Quét tem tại quầy sẽ áp dụng đúng mức giảm cho sản phẩm."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{product.name}</div>
            <div className="money text-xs text-muted">Giá gốc {formatMoney(product.price)}</div>
          </div>
          <div className="w-28">
            <label className={label}>Mức giảm (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className={input}
            />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 text-center">
          <div className="mb-1 text-sm font-bold">
            Giảm {clamped}% — còn <span className="money text-leaf">{formatMoney(discounted)}</span>
          </div>
          <div id="promo-barcode-box" className="flex justify-center">
            <BarcodeSvg value={code} height={52} barWidth={1.5} />
          </div>
        </div>
        <button
          className={`${btn.primary} w-full`}
          onClick={() =>
            printBarcode(
              `Giảm ${clamped}% — ${product.name}`,
              `Còn ${formatMoney(discounted)} (giá gốc ${formatMoney(product.price)})`,
              document.querySelector("#promo-barcode-box")?.innerHTML ?? ""
            )
          }
          id="promo-print"
        >
          <Printer size={16} /> In tem
        </button>
      </div>
    </Modal>
  );
}
