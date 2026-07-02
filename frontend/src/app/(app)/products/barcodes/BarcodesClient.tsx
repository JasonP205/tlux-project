"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import JsBarcode from "jsbarcode";
import { ArrowLeft, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { btn, PageTitle } from "@/components/ui";
import type { Product } from "@/lib/types";

export default function BarcodesClient({ initial }: { initial?: { products: Product[] } }) {
  const products = useQuery({
    queryKey: ["products", "barcodes"],
    queryFn: () => api<{ products: Product[] }>("/products?limit=100"),
    initialData: initial,
  });

  return (
    <div className="p-6 print:p-0">
      <div className="print:hidden">
        <Link href="/products" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Danh sách sản phẩm
        </Link>
        <PageTitle
          title="Tem mã vạch"
          action={
            <button className={btn.primary} onClick={() => window.print()}>
              <Printer size={16} /> In tem
            </button>
          }
        />
        <p className="mb-4 text-sm text-muted">
          Dùng trang này để in tem dán sản phẩm, hoặc quét thử trực tiếp trên màn hình bằng máy quét /
          tính năng &quot;Quét bằng điện thoại&quot; ở màn hình bán hàng.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 print:grid-cols-3 print:gap-2">
        {(products.data?.products ?? []).map((p) => (
          <BarcodeLabel key={p._id} product={p} />
        ))}
      </div>
    </div>
  );
}

function BarcodeLabel({ product }: { product: Product }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, product.barcode, {
        format: "CODE128",
        width: 1.6,
        height: 48,
        fontSize: 13,
        font: "monospace",
        margin: 4,
      });
    } catch {
      // Mã không hợp lệ với CODE128 — bỏ qua tem này
    }
  }, [product.barcode]);

  return (
    <div className="flex flex-col items-center rounded-xl border border-line bg-white p-3 text-center print:break-inside-avoid print:rounded-none">
      <div className="line-clamp-1 text-xs font-semibold">{product.name}</div>
      <div className="money text-xs text-muted">{formatMoney(product.price)}</div>
      <svg ref={ref} className="max-w-full" />
    </div>
  );
}
