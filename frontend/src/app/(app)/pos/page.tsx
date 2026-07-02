"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScanBarcode, Search, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { btn, input } from "@/components/ui";
import InvoiceTabs from "@/components/pos/InvoiceTabs";
import InvoicePanel, { type ItemInput } from "@/components/pos/InvoicePanel";
import ProductGrid from "@/components/pos/ProductGrid";
import CustomerPicker from "@/components/pos/CustomerPicker";
import PhoneScanModal from "@/components/pos/PhoneScanModal";
import CashModal from "@/components/pos/CashModal";
import PayosModal from "@/components/pos/PayosModal";
import type { Order, Product } from "@/lib/types";

type OrdersMap = { orders: Order[] };

export default function PosPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [showPhoneScan, setShowPhoneScan] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const drafts = useQuery({
    queryKey: ["drafts"],
    queryFn: () => api<OrdersMap>("/orders/drafts"),
  });

  const orders = useMemo(() => drafts.data?.orders ?? [], [drafts.data]);
  // activeId = null nghĩa là "tab đầu tiên" — không cần effect đồng bộ
  const active = orders.find((o) => o._id === activeId) ?? orders[0] ?? null;

  const updateCache = useCallback(
    (order: Order) => {
      qc.setQueryData<OrdersMap>(["drafts"], (old) => {
        if (!old) return { orders: [order] };
        const exists = old.orders.some((o) => o._id === order._id);
        const list = exists
          ? old.orders.map((o) => (o._id === order._id ? order : o))
          : [...old.orders, order];
        return { orders: list.filter((o) => ["DRAFT", "PENDING_PAYMENT"].includes(o.status)) };
      });
    },
    [qc]
  );

  const removeFromCache = useCallback(
    (orderId: string) => {
      qc.setQueryData<OrdersMap>(["drafts"], (old) =>
        old ? { orders: old.orders.filter((o) => o._id !== orderId) } : old
      );
      setActiveId((id) => (id === orderId ? null : id));
    },
    [qc]
  );

  const createOrder = useMutation({
    mutationFn: () => api<{ order: Order }>("/orders", { method: "POST", body: {} }),
    onSuccess: ({ order }) => {
      updateCache(order);
      setActiveId(order._id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setItems = useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: ItemInput[] }) =>
      api<{ order: Order }>(`/orders/${orderId}/items`, { method: "PUT", body: { items } }),
    onSuccess: ({ order }) => updateCache(order),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateOrder = useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: Record<string, unknown> }) =>
      api<{ order: Order }>(`/orders/${orderId}`, { method: "PUT", body }),
    onSuccess: ({ order }) => updateCache(order),
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelOrder = useMutation({
    mutationFn: (orderId: string) => api<{ order: Order }>(`/orders/${orderId}/cancel`, { method: "POST" }),
    onSuccess: (_, orderId) => {
      removeFromCache(orderId);
      setPayingOrder(null);
      toast.success("Đã hủy hóa đơn");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkout = useMutation({
    mutationFn: ({ orderId, paymentMethod }: { orderId: string; paymentMethod: "CASH" | "PAYOS" }) =>
      api<{ order: Order }>(`/orders/${orderId}/checkout`, { method: "POST", body: { paymentMethod } }),
    onSuccess: ({ order }) => {
      if (order.status === "PAID") {
        removeFromCache(order._id);
        setShowCash(false);
        toast.success(`Đã thanh toán ${order.code} — ${formatMoney(order.total)}`);
      } else if (order.status === "PENDING_PAYMENT") {
        updateCache(order);
        setPayingOrder(order);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Thêm sản phẩm vào hóa đơn đang mở (dùng chung cho quét máy, quét điện thoại, click)
  const addProduct = useCallback(
    async (product: Product) => {
      let orderId = active?._id;
      if (active && active.status !== "DRAFT") {
        toast.error("Hóa đơn này đang chờ thanh toán, hãy mở hóa đơn khác");
        return;
      }
      if (!orderId) {
        const { order } = await api<{ order: Order }>("/orders", { method: "POST", body: {} });
        updateCache(order);
        setActiveId(order._id);
        orderId = order._id;
      }
      const current = (qc.getQueryData<OrdersMap>(["drafts"])?.orders ?? []).find((o) => o._id === orderId);
      const items: ItemInput[] = (current?.items ?? []).map((it) => ({ productId: it.product, qty: it.qty }));
      const existing = items.find((it) => it.productId === product._id);
      if (existing) existing.qty += 1;
      else items.push({ productId: product._id, qty: 1 });
      setItems.mutate({ orderId, items });
    },
    [active, qc, setItems, updateCache]
  );

  const addByBarcode = useCallback(
    async (code: string) => {
      try {
        const { product } = await api<{ product: Product }>(`/products/barcode/${encodeURIComponent(code)}`);
        await addProduct(product);
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [addProduct]
  );

  const searchResults = useQuery({
    queryKey: ["product-search", debounced],
    queryFn: () =>
      api<{ products: Product[]; engine: string }>(`/products/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length > 0,
  });

  const quickProducts = useQuery({
    queryKey: ["products", "quick"],
    queryFn: () => api<{ products: Product[] }>("/products?limit=12"),
  });

  return (
    <div className="flex h-full flex-col">
      <InvoiceTabs
        orders={orders}
        activeId={active?._id ?? null}
        onSelect={setActiveId}
        onCreate={() => createOrder.mutate()}
        onCancel={(o) => {
          if (o.items.length === 0 || confirm(`Hủy ${o.label || "hóa đơn"} ${o.code}?`))
            cancelOrder.mutate(o._id);
        }}
      />

      <div className="flex min-h-0 flex-1">
        {/* Cột trái: quét + tìm sản phẩm */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                ref={barcodeRef}
                autoFocus
                placeholder="Quét mã vạch tại đây (Enter)"
                className={`${input} pl-10 font-mono`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const code = e.currentTarget.value.trim();
                    e.currentTarget.value = "";
                    if (code) addByBarcode(code);
                  }
                }}
              />
            </div>
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                placeholder="Tìm tên sản phẩm (gõ sai chính tả vẫn ra)…"
                className={`${input} pl-10`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className={btn.secondary} onClick={() => setShowPhoneScan(true)}>
              <Smartphone size={16} /> Quét bằng điện thoại
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ProductGrid
              products={debounced ? searchResults.data?.products : quickProducts.data?.products}
              searching={searchResults.isFetching}
              hasQuery={debounced.length > 0}
              onPick={addProduct}
            />
          </div>
        </div>

        {/* Cột phải: phiếu tính tiền */}
        <div className="flex w-95 shrink-0 flex-col border-l border-line bg-surface">
          <InvoicePanel
            order={active}
            checkoutPending={checkout.isPending}
            onCreate={() => createOrder.mutate()}
            onSetItems={(items) => active && setItems.mutate({ orderId: active._id, items })}
            onUpdate={(body) => active && updateOrder.mutate({ orderId: active._id, body })}
            onPickCustomer={() => setShowCustomer(true)}
            onCash={() => setShowCash(true)}
            onPayos={() => active && checkout.mutate({ orderId: active._id, paymentMethod: "PAYOS" })}
            onShowQr={() => active && setPayingOrder(active)}
            onCancel={() => active && cancelOrder.mutate(active._id)}
          />
        </div>
      </div>

      {showCustomer && active && (
        <CustomerPicker
          onClose={() => setShowCustomer(false)}
          onPick={(c) => {
            updateOrder.mutate({ orderId: active._id, body: { customerId: c._id } });
            setShowCustomer(false);
          }}
        />
      )}
      {showPhoneScan && <PhoneScanModal onClose={() => setShowPhoneScan(false)} onBarcode={addByBarcode} />}
      {showCash && active && (
        <CashModal
          total={active.total}
          pending={checkout.isPending}
          onClose={() => setShowCash(false)}
          onConfirm={() => checkout.mutate({ orderId: active._id, paymentMethod: "CASH" })}
        />
      )}
      {payingOrder && (
        <PayosModal
          order={payingOrder}
          onClose={() => setPayingOrder(null)}
          onPaid={() => {
            removeFromCache(payingOrder._id);
            setPayingOrder(null);
            toast.success(`Đã nhận thanh toán ${payingOrder.code}`);
          }}
          onCancel={() => cancelOrder.mutate(payingOrder._id)}
        />
      )}
    </div>
  );
}
