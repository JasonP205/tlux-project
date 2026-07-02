"use client";

import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Order } from "@/lib/types";

export default function InvoiceTabs({
  orders,
  activeId,
  onSelect,
  onCancel,
  onCreate,
}: {
  orders: Order[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCancel: (order: Order) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex items-end gap-1 border-b border-line bg-paper px-4 pt-3">
      {orders.map((o, i) => (
        <button
          key={o._id}
          data-active={o._id === activeId}
          onClick={() => onSelect(o._id)}
          className={`receipt-tab flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold ${
            o._id === activeId
              ? "border-line bg-surface text-ink"
              : "border-transparent bg-transparent text-muted hover:bg-line/40"
          } cursor-pointer`}
        >
          {o.label || `Hóa đơn ${i + 1}`}
          {o.status === "PENDING_PAYMENT" && <Badge tone="amber">chờ CK</Badge>}
          {o.items.length > 0 && <span className="text-xs text-muted">({o.items.length})</span>}
          <span
            role="button"
            aria-label="Hủy hóa đơn"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(o);
            }}
            className="rounded p-0.5 text-muted hover:bg-danger-soft hover:text-danger"
          >
            <X size={13} />
          </span>
        </button>
      ))}
      <button
        onClick={onCreate}
        className="mb-1 ml-1 flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-leaf hover:bg-leaf-soft cursor-pointer"
      >
        <Plus size={16} /> Hóa đơn mới
      </button>
    </div>
  );
}
