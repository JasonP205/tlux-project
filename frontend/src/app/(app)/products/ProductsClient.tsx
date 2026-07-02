"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Barcode } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney, formatDate, daysUntil } from "@/lib/format";
import { useMe } from "@/lib/hooks";
import { btn, input, label, Modal, Badge, Empty, PageTitle } from "@/components/ui";
import type { Category, Product } from "@/lib/types";

export default function ProductsClient({
  initialProducts,
  initialCategories,
}: {
  initialProducts?: { products: Product[]; total: number };
  initialCategories?: { categories: Category[] };
}) {
  const { data: me } = useMe();
  const canEdit = me && ["ADMIN", "MANAGER"].includes(me.user.role);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const qc = useQueryClient();

  const products = useQuery({
    queryKey: ["products", { q, category }],
    queryFn: () =>
      api<{ products: Product[]; total: number }>(
        `/products?limit=100&q=${encodeURIComponent(q)}&category=${category}`
      ),
    initialData: q === "" && category === "" ? initialProducts : undefined,
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

  return (
    <div className="p-6">
      <PageTitle
        title="Sản phẩm"
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
      <div className="mb-4 flex gap-2">
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className={`${input} pl-9`}
            placeholder="Tìm tên hoặc mã vạch…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className={`${input} w-48`} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categories.data?.categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
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
                      <button className={btn.ghost} onClick={() => setEditing(p)} aria-label="Sửa">
                        <Pencil size={15} />
                      </button>
                      <button
                        className={btn.ghost}
                        onClick={() => confirm(`Ngừng kinh doanh "${p.name}"?`) && remove.mutate(p._id)}
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

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          categories={categories.data?.categories ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ProductForm({
  product,
  categories,
  onClose,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<string | null>(product?.image?.url ?? null);

  const save = useMutation({
    mutationFn: (formData: FormData) =>
      product
        ? api(`/products/${product._id}`, { method: "PUT", formData })
        : api("/products", { method: "POST", formData }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(product ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal title={product ? "Sửa sản phẩm" : "Thêm sản phẩm"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(new FormData(e.currentTarget));
        }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview || "/product-placeholder.svg"}
            alt=""
            className="h-16 w-16 rounded-lg border border-line bg-paper object-cover"
          />
          <div className="flex-1">
            <label className={label}>Hình sản phẩm</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              className="text-xs"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(URL.createObjectURL(f));
              }}
            />
          </div>
        </div>
        <div>
          <label className={label}>Tên sản phẩm</label>
          <input name="name" required defaultValue={product?.name} className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Mã vạch</label>
            <input name="barcode" required defaultValue={product?.barcode} className={`${input} font-mono`} />
          </div>
          <div>
            <label className={label}>Đơn vị</label>
            <input name="unit" defaultValue={product?.unit ?? "cái"} className={input} />
          </div>
          <div>
            <label className={label}>Giá bán (đ)</label>
            <input name="price" type="number" min={0} required defaultValue={product?.price} className={input} />
          </div>
          <div>
            <label className={label}>Giá vốn (đ)</label>
            <input name="costPrice" type="number" min={0} defaultValue={product?.costPrice} className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Danh mục</label>
          <select name="category" defaultValue={product?.category?._id ?? ""} className={input}>
            <option value="">— Không —</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={`${btn.primary} w-full`} disabled={save.isPending}>
          {save.isPending ? "Đang lưu…" : "Lưu sản phẩm"}
        </button>
      </form>
    </Modal>
  );
}
