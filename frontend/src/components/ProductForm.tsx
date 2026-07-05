"use client";

import { useState } from "react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { btn, input, label, Modal, AppSelect } from "@/components/ui";
import PhoneScanModal from "@/components/pos/PhoneScanModal";
import type { Category, Product } from "@/lib/types";

type ProductsPage = { products: Product[]; total: number };

// Form thêm/sửa sản phẩm, dùng ở trang Sản phẩm và khi nhập kho gặp mã vạch mới.
// - Không có onSaved (trang Sản phẩm): optimistic — đóng modal ngay, lỗi thì hoàn tác cache.
// - Có onSaved (nhập kho): chờ server trả sản phẩm thật rồi gọi onSaved để tiếp tục nhập lô.
export default function ProductForm({
  product,
  categories,
  initialBarcode = "",
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  initialBarcode?: string;
  onClose: () => void;
  onSaved?: (product: Product) => void;
}) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<string | null>(product?.image?.url ?? null);
  const [barcode, setBarcode] = useState(product?.barcode ?? initialBarcode);
  const [categoryId, setCategoryId] = useState(product?.category?._id ?? "none");
  const [scanning, setScanning] = useState(false);

  const save = useMutation({
    mutationFn: (formData: FormData) =>
      product
        ? api<{ product: Product }>(`/products/${product._id}`, { method: "PUT", formData })
        : api<{ product: Product }>("/products", { method: "POST", formData }),
    onMutate: async (fd) => {
      if (onSaved) return { snapshots: [] as [QueryKey, ProductsPage | undefined][] };
      const cat = categories.find((c) => c._id === categoryId) ?? null;
      const optimistic = {
        name: String(fd.get("name") ?? ""),
        barcode,
        price: Number(fd.get("price") ?? 0),
        costPrice: Number(fd.get("costPrice") ?? 0),
        unit: String(fd.get("unit") ?? "cái"),
        category: cat,
        image: { url: preview, publicId: product?.image?.publicId ?? null },
      };
      await qc.cancelQueries({ queryKey: ["products"] });
      const snapshots = qc.getQueriesData<ProductsPage>({ queryKey: ["products"] });
      qc.setQueriesData<ProductsPage>({ queryKey: ["products"] }, (old) => {
        if (!old) return old;
        if (product)
          return {
            ...old,
            products: old.products.map((p) => (p._id === product._id ? { ...p, ...optimistic } : p)),
          };
        const temp = {
          _id: `tmp-${Date.now()}`,
          description: "",
          active: true,
          stock: Number(fd.get("initialQty") || 0),
          nearestExpiry: null,
          ...optimistic,
        } satisfies Product;
        return { ...old, products: [temp, ...old.products], total: old.total + 1 };
      });
      onClose();
      return { snapshots };
    },
    onSuccess: async (data, fd) => {
      toast.success(product ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm");
      if (onSaved) return onSaved(data.product);
      // Có nhập tồn kho ban đầu → tạo luôn lô nhập kho đầu tiên cho sản phẩm mới
      const qty = Number(fd.get("initialQty") || 0);
      if (!product && qty > 0) {
        try {
          await api("/inventory/import", {
            method: "POST",
            body: {
              productId: data.product._id,
              quantity: qty,
              expiryDate: fd.get("initialExpiry") || undefined,
              note: "Nhập khi tạo sản phẩm",
            },
          });
          qc.invalidateQueries({ queryKey: ["batches"] });
          qc.invalidateQueries({ queryKey: ["inventory-alerts"] });
        } catch (err) {
          toast.error(`Sản phẩm đã tạo nhưng nhập kho thất bại: ${(err as Error).message}`);
        }
      }
    },
    onError: (e: Error, _fd, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) qc.setQueryData(key, data);
      toast.error(onSaved ? e.message : `Lưu sản phẩm thất bại — đã hoàn tác. ${e.message}`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  return (
    <Modal
      title={product ? "Sửa sản phẩm" : "Thêm sản phẩm"}
      description={
        product
          ? "Sửa thông tin và giá bán. Số lượng tồn kho quản lý ở trang Kho hàng."
          : onSaved
            ? "Mã vạch này chưa có trong hệ thống — khai báo sản phẩm trước, lưu xong sẽ đến bước nhập số lượng lô."
            : "Khai báo hàng hóa mới: tên, giá bán, mã vạch. Về sau muốn cộng thêm số lượng thì dùng Nhập kho ở trang Kho hàng."
      }
      onClose={onClose}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("category", categoryId === "none" ? "" : categoryId);
          save.mutate(fd);
        }}
      >
        {/* Quét mã vạch có sẵn trên bao bì: máy quét USB gõ thẳng vào ô này, hoặc quét bằng điện thoại */}
        <div>
          <label className={label}>Mã vạch</label>
          <div className="flex gap-2">
            <input
              name="barcode"
              required
              autoFocus={!initialBarcode}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                // Máy quét USB kết thúc bằng Enter — chặn submit sớm khi form chưa điền xong
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Quét mã trên bao bì sản phẩm…"
              className={`${input} font-mono`}
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
          <input name="name" required autoFocus={Boolean(initialBarcode)} defaultValue={product?.name} className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Giá bán (đ)</label>
            <input name="price" type="number" min={0} required defaultValue={product?.price} className={input} />
          </div>
          <div>
            <label className={label}>Giá vốn (đ)</label>
            <input name="costPrice" type="number" min={0} defaultValue={product?.costPrice} className={input} />
          </div>
          <div>
            <label className={label}>Đơn vị</label>
            <input name="unit" defaultValue={product?.unit ?? "cái"} className={input} />
          </div>
          <div>
            <label className={label}>Danh mục</label>
            <AppSelect
              value={categoryId}
              onValueChange={setCategoryId}
              options={[
                { value: "none", label: "— Không —" },
                ...categories.map((c) => ({ value: c._id, label: c.name })),
              ]}
            />
          </div>
        </div>
        {/* Tồn kho ban đầu (tạo lô nhập kho đầu tiên); flow nhập kho có bước nhập lô riêng nên ẩn */}
        {!product && !onSaved && (
          <div className="rounded-lg bg-paper p-3">
            <p className="mb-2 text-xs font-semibold text-muted">Tồn kho ban đầu — không bắt buộc</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Số lượng</label>
                <input
                  name="initialQty"
                  type="number"
                  min={0}
                  placeholder="0"
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Hạn sử dụng lô đầu</label>
                <input name="initialExpiry" type="date" className={input} />
              </div>
            </div>
          </div>
        )}
        <button type="submit" className={`${btn.primary} w-full`} disabled={save.isPending}>
          {save.isPending ? "Đang lưu…" : "Lưu sản phẩm"}
        </button>
      </form>
      {scanning && (
        <PhoneScanModal
          onClose={() => setScanning(false)}
          onBarcode={(code) => {
            setBarcode(code);
            setScanning(false);
            toast.success(`Đã quét mã ${code}`);
          }}
        />
      )}
    </Modal>
  );
}
