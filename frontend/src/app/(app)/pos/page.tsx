"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MonitorSmartphone, ScanBarcode, Search, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney, itemLineTotal } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { useMe } from "@/lib/hooks";
import { btn, input, ConfirmDialog } from "@/components/ui";
import InvoiceTabs from "@/components/pos/InvoiceTabs";
import InvoicePanel, { type ItemInput } from "@/components/pos/InvoicePanel";
import ProductGrid from "@/components/pos/ProductGrid";
import CustomerPicker from "@/components/pos/CustomerPicker";
import PhoneScanModal from "@/components/pos/PhoneScanModal";
import CashModal from "@/components/pos/CashModal";
import PayosModal from "@/components/pos/PayosModal";
import ReceiptDialog from "@/components/pos/ReceiptDialog";
import type { Customer, Order, OrderItem, Product } from "@/lib/types";

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
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const { data: me } = useMe();
  const cashierId = me?.user._id;

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

  // Đẩy hóa đơn đang mở sang màn hình khách (trang /display/<cashierId>)
  const emitDisplay = useCallback(
    (order: Order | null) => {
      if (cashierId) getSocket().emit("display:update", { cashierId, order });
    },
    [cashierId]
  );
  useEffect(() => {
    emitDisplay(active);
    // Socket rớt rồi nối lại (server restart, mất mạng) → đẩy lại trạng thái để
    // cache phía server và các màn hình khách mở sau vẫn có hóa đơn hiện tại
    const socket = getSocket();
    const onReconnect = () => emitDisplay(active);
    socket.on("connect", onReconnect);
    return () => {
      socket.off("connect", onReconnect);
    };
  }, [active, emitDisplay]);

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

  // Đổi số lượng bằng click nhanh: cập nhật cache ngay (optimistic), còn request thì
  // serialize theo từng hóa đơn — chỉ 1 request đang bay, các click dồn lại chỉ gửi
  // trạng thái cuối cùng (tránh nhiều PUT song song đè nhau gây VersionError ở server)
  const pendingItems = useRef(new Map<string, ItemInput[]>());
  const itemsInFlight = useRef(new Set<string>());

  const flushItems = async (orderId: string) => {
    if (itemsInFlight.current.has(orderId)) return;
    const items = pendingItems.current.get(orderId);
    if (!items) return;
    pendingItems.current.delete(orderId);
    itemsInFlight.current.add(orderId);
    try {
      const { order } = await api<{ order: Order }>(`/orders/${orderId}/items`, {
        method: "PUT",
        body: { items },
      });
      // Bỏ qua nếu đã có thay đổi mới hơn đang chờ gửi — tránh ghi đè bản optimistic mới
      if (!pendingItems.current.has(orderId)) updateCache(order);
    } catch (e) {
      toast.error((e as Error).message);
      pendingItems.current.delete(orderId);
      qc.invalidateQueries({ queryKey: ["drafts"] }); // hoàn tác optimistic về trạng thái server
    } finally {
      itemsInFlight.current.delete(orderId);
      void flushItems(orderId);
    }
  };

  const setItems = ({ orderId, items }: { orderId: string; items: ItemInput[] }) => {
      // Optimistic: vá qty + tổng tiền tạm tính (server sẽ trả bản chuẩn kèm giảm giá tính lại)
      qc.setQueryData<OrdersMap>(["drafts"], (old) => {
        if (!old) return old;
        return {
          orders: old.orders.map((o) => {
            if (o._id !== orderId) return o;
            const byId = new Map(o.items.map((it) => [it.product, it]));
            const nextItems = items
              .map((it) => {
                const cur = byId.get(it.productId);
                return cur
                  ? { ...cur, qty: it.qty, discountPercent: it.discountPercent ?? cur.discountPercent ?? 0 }
                  : null;
              })
              .filter((it): it is OrderItem => it !== null);
            const subtotal = nextItems.reduce((s, it) => s + itemLineTotal(it), 0);
            const taxable = Math.max(0, subtotal - o.discountAmount - o.pointsDiscount);
            const vatAmount = Math.round((taxable * (o.vatRate ?? 0)) / 100);
            return { ...o, items: nextItems, subtotal, vatAmount, total: taxable + vatAmount };
          }),
        };
      });
    pendingItems.current.set(orderId, items);
    void flushItems(orderId);
  };

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
        setReceiptOrder(order);
        emitDisplay(order); // màn hình khách hiện "đã thanh toán"
        toast.success(`Đã thanh toán ${order.code} — ${formatMoney(order.total)}`);
      } else if (order.status === "PENDING_PAYMENT") {
        updateCache(order);
        setPayingOrder(order);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Thêm sản phẩm vào hóa đơn đang mở (dùng chung cho quét máy, quét điện thoại, click).
  // promo = tem giảm giá PMP quét được: áp % giảm cho dòng sản phẩm đó
  const addProduct = async (product: Product, promo?: { discountPercent: number; promoBarcode: string }) => {
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
    const items: ItemInput[] = (current?.items ?? []).map((it) => ({
      productId: it.product,
      qty: it.qty,
      discountPercent: it.discountPercent || 0,
      promoBarcode: it.promoBarcode ?? null,
    }));
    const existing = items.find((it) => it.productId === product._id);
    if (existing) {
      existing.qty += 1;
      if (promo) {
        existing.discountPercent = promo.discountPercent;
        existing.promoBarcode = promo.promoBarcode;
      }
    } else {
      items.push({
        productId: product._id,
        qty: 1,
        discountPercent: promo?.discountPercent ?? 0,
        promoBarcode: promo?.promoBarcode ?? null,
      });
    }
    setItems({ orderId, items });
  };

  // Quét mã tại POS: PMP… = tem giảm giá sản phẩm, PM… = mã khuyến mãi,
  // TLX… = thẻ thành viên, còn lại = mã vạch sản phẩm
  const addByBarcode = async (raw: string) => {
      const code = raw.trim();
      const upper = code.toUpperCase();
      try {
        // Tem giảm giá in sẵn: PMP<%><mã vạch gốc> (VD: PMP50abcdef = giảm 50% sản phẩm abcdef).
        // Mã vạch gốc thường toàn số nên phần % nhập nhằng — thử tách 3/2/1 chữ số, mã nào tra ra sản phẩm thì dùng
        if (/^PMP\d/i.test(code)) {
          const rest = code.slice(3);
          for (const len of [3, 2, 1]) {
            const pct = Number(rest.slice(0, len));
            const bc = rest.slice(len);
            if (!bc || !/^\d+$/.test(rest.slice(0, len)) || pct > 100 || pct < 1) continue;
            try {
              const { product } = await api<{ product: Product }>(
                `/products/barcode/${encodeURIComponent(bc)}`
              );
              await addProduct(product, { discountPercent: pct, promoBarcode: code });
              toast.success(`Đã áp giảm ${pct}% cho ${product.name}`);
              return;
            } catch {
              // thử cách tách tiếp theo
            }
          }
          return toast.error("Tem giảm giá không khớp sản phẩm nào");
        }
        if (upper.startsWith("PM")) {
          if (!active || active.status !== "DRAFT")
            return toast.error("Mở hóa đơn nháp trước khi áp mã khuyến mãi");
          updateOrder.mutate({ orderId: active._id, body: { discountCode: upper } });
          return;
        }
        if (upper.startsWith("TLX")) {
          if (!active || active.status !== "DRAFT")
            return toast.error("Mở hóa đơn nháp trước khi quét thẻ thành viên");
          const { customer } = await api<{ customer: Customer }>(`/customers/by-code/${encodeURIComponent(upper)}`);
          updateOrder.mutate({ orderId: active._id, body: { customerId: customer._id } });
          toast.success(`Khách hàng: ${customer.name} (${customer.points} điểm)`);
          return;
        }
        const { product } = await api<{ product: Product }>(`/products/barcode/${encodeURIComponent(code)}`);
        await addProduct(product);
      } catch (e) {
        toast.error((e as Error).message);
      }
  };

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
          if (o.items.length === 0) cancelOrder.mutate(o._id);
          else setCancelTarget(o);
        }}
      />

      {/* Mobile: xếp dọc (sản phẩm trên, phiếu tính tiền dưới); desktop: 2 cột */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Cột trái: quét + tìm sản phẩm */}
        <div className="flex min-h-0 min-w-0 flex-[3] flex-col gap-3 p-3 sm:p-4 lg:flex-1">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-40 flex-1">
              <ScanBarcode size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                ref={barcodeRef}
                autoFocus
                placeholder="Quét mã vạch tại đây…"
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
            <div className="relative min-w-40 flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                placeholder="Tìm sản phẩm…"
                className={`${input} pl-10`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className={btn.secondary} onClick={() => setShowPhoneScan(true)} title="Quét bằng camera điện thoại">
              <Smartphone size={16} />
              <span className="hidden xl:inline">Quét bằng điện thoại</span>
            </button>
            <button
              className={btn.secondary}
              onClick={() => cashierId && window.open(`/display/${cashierId}`, "_blank")}
              title="Mở màn hình phụ cho khách xem hóa đơn"
            >
              <MonitorSmartphone size={16} />
              <span className="hidden xl:inline">Màn hình khách</span>
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

        {/* Cột phải: phiếu tính tiền (mobile: nửa dưới màn hình) */}
        <div className="flex min-h-0 flex-[2] shrink-0 flex-col border-t border-line bg-surface lg:w-95 lg:flex-none lg:border-t-0 lg:border-l">
          <InvoicePanel
            order={active}
            checkoutPending={checkout.isPending}
            maxItemDiscount={me && ["ADMIN", "MANAGER"].includes(me.user.role) ? 100 : 20}
            onCreate={() => createOrder.mutate()}
            onSetItems={(items) => active && setItems({ orderId: active._id, items })}
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
          onPickNew={(c) => {
            updateOrder.mutate({ orderId: active._id, body: { pendingCustomer: c } });
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
          onPaid={(paidOrder) => {
            removeFromCache(payingOrder._id);
            const paid =
              paidOrder ?? { ...payingOrder, status: "PAID" as const, paymentMethod: "PAYOS" as const };
            setPayingOrder(null);
            setReceiptOrder(paid);
            emitDisplay(paid);
            toast.success(`Đã nhận thanh toán ${payingOrder.code}`);
          }}
          onCancel={() => cancelOrder.mutate(payingOrder._id)}
        />
      )}
      {receiptOrder && <ReceiptDialog order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
      <ConfirmDialog
        open={cancelTarget !== null}
        title="Hủy hóa đơn?"
        description={
          cancelTarget
            ? `${cancelTarget.label || "Hóa đơn"} ${cancelTarget.code} có ${cancelTarget.items.length} sản phẩm sẽ bị hủy.`
            : undefined
        }
        confirmLabel="Hủy hóa đơn"
        danger
        onConfirm={() => cancelTarget && cancelOrder.mutate(cancelTarget._id)}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
