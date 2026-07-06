"use client";

import { formatMoney } from "@/lib/format";
import { Empty } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/lib/types";

// Khung xương thẻ sản phẩm khi đang tải / đang tìm
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
          <Skeleton className="h-24 w-full rounded-none" />
          <div className="space-y-2 p-2.5">
            <Skeleton className="h-4 w-4/5" />
            <div className="flex justify-between pt-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3.5 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProductGrid({
  products,
  searching,
  hasQuery,
  onPick,
}: {
  products: Product[] | undefined;
  searching: boolean;
  hasQuery: boolean;
  onPick: (p: Product) => void;
}) {
  if ((searching && hasQuery) || !products) return <GridSkeleton />;
  if (products.length === 0)
    return <Empty message={hasQuery ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm"} />;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <button
          key={p._id}
          onClick={() => onPick(p)}
          disabled={(p.stock ?? 0) <= 0}
          className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-left hover:border-leaf disabled:opacity-50 cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.image?.url || "/product-placeholder.svg"}
            alt={p.name}
            className="h-24 w-full bg-paper object-cover"
          />
          <div className="flex flex-1 flex-col gap-0.5 p-2.5">
            <div className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</div>
            <div className="mt-auto flex items-center justify-between pt-1">
              <span className="money text-sm font-bold text-leaf">{formatMoney(p.price)}</span>
              <span className="text-xs text-muted">Còn {p.stock ?? 0}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
