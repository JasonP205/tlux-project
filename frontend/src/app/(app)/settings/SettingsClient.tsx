"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store, ReceiptText, Percent, Star, Warehouse, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { btn, input, label, PageTitle, AppSelect } from "@/components/ui";
import { ReceiptContent } from "@/components/pos/ReceiptDialog";
import type { Order, Settings } from "@/lib/types";

// Hóa đơn mẫu cho khung preview
const SAMPLE_ORDER = {
  _id: "preview",
  code: "HD260705-DEMO1",
  label: "",
  cashier: { _id: "x", name: "Nguyễn Thu Ngân" },
  customer: null,
  pendingCustomer: null,
  items: [
    { product: "a", name: "Bánh Oreo 133g", barcode: "", price: 16000, qty: 2, discountPercent: 0 },
    { product: "b", name: "Nước suối Lavie 500ml", barcode: "", price: 6000, qty: 1, discountPercent: 0 },
  ],
  subtotal: 38000,
  discountCode: null,
  discountAmount: 0,
  pointsRedeemed: 0,
  pointsDiscount: 0,
  pointsEarned: 3,
  vatRate: 0,
  vatAmount: 0,
  total: 38000,
  paymentMethod: "CASH",
  status: "PAID",
  payosCheckoutUrl: null,
  payosQrCode: null,
  paidAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
} satisfies Order;

export default function SettingsClient({ initial }: { initial?: { settings: Settings } }) {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<{ settings: Settings }>("/settings"),
    initialData: initial,
  });

  // form = dữ liệu server + các thay đổi đang nhập dở (draft) — không cần effect đồng bộ
  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const base = settings.data?.settings;
  const form: Settings | null = base ? { ...base, ...draft } : null;

  const save = useMutation({
    mutationFn: () => {
      if (!form) throw new Error("Chưa tải xong cài đặt");
      if (logoFile) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(form))
          if (k !== "logo" && v !== null && typeof v !== "object") fd.set(k, String(v));
        fd.set("logo", logoFile);
        return api<{ settings: Settings }>("/settings", { method: "PUT", formData: fd });
      }
      return api<{ settings: Settings }>("/settings", { method: "PUT", body: form });
    },
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
      qc.invalidateQueries({ queryKey: ["branding"] });
      setDraft({});
      setLogoFile(null);
      setLogoPreview(null);
      toast.success("Đã lưu cài đặt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) return null;
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // Preview dùng cài đặt đang nhập dở (kể cả logo vừa chọn chưa lưu) + VAT mẫu
  const previewSettings: Settings = {
    ...form,
    logo: logoPreview ? { url: logoPreview, publicId: "" } : form.logo,
  };
  const taxable = SAMPLE_ORDER.subtotal;
  const vatAmount = Math.round((taxable * (Number(form.vatRate) || 0)) / 100);
  const previewOrder: Order = {
    ...SAMPLE_ORDER,
    vatRate: Number(form.vatRate) || 0,
    vatAmount,
    total: taxable + vatAmount,
  };

  return (
    <div className="p-4 sm:p-6">
      <PageTitle
        title="Cài đặt hệ thống"
        subtitle="Thuế, thông tin cửa hàng, tích điểm, cảnh báo kho và hóa đơn — áp dụng cho toàn hệ thống"
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Section icon={<Store size={15} />} title="Cửa hàng" desc="In trên đầu hóa đơn và hiện ở màn hình khách, trang đăng nhập">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Tên cửa hàng</label>
                <input required value={form.storeName} onChange={(e) => set("storeName", e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Slogan / mô tả ngắn</label>
                <input value={form.storeSlogan} onChange={(e) => set("storeSlogan", e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Địa chỉ</label>
                <input value={form.storeAddress} onChange={(e) => set("storeAddress", e.target.value)} className={input} placeholder="VD: 123 Lê Lợi, Q.1, TP.HCM" />
              </div>
              <div>
                <label className={label}>Số điện thoại</label>
                <input value={form.storePhone} onChange={(e) => set("storePhone", e.target.value)} className={input} placeholder="VD: 0901 234 567" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreview ?? form.logo?.url ?? "/logo.png"}
                alt=""
                className="h-14 w-14 rounded-xl border border-line bg-white object-contain p-1"
              />
              <div className="flex-1">
                <label className={label}>Logo cửa hàng</label>
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setLogoFile(f);
                      setLogoPreview(URL.createObjectURL(f));
                    }
                  }}
                />
                <p className="mt-1 text-xs text-muted">Ảnh PNG nền trong suốt, tối đa 2MB</p>
              </div>
            </div>
          </Section>

          <Section
            icon={<Percent size={15} />}
            title="Thuế GTGT (VAT)"
            desc="Tính trên số tiền sau giảm giá và đổi điểm; hóa đơn đã tạo giữ nguyên mức cũ, mức mới áp dụng từ lần sửa giỏ hàng tiếp theo"
          >
            <div className="w-40">
              <label className={label}>Mức VAT (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                required
                value={form.vatRate}
                onChange={(e) => set("vatRate", Number(e.target.value))}
                className={input}
              />
            </div>
          </Section>

          <Section icon={<Star size={15} />} title="Tích điểm thành viên" desc="Điểm cộng khi thanh toán thành công và giá trị khi đổi điểm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Doanh thu cho 1 điểm (đ)</label>
                <input type="number" min={1} required value={form.pointsEarnRate} onChange={(e) => set("pointsEarnRate", Number(e.target.value))} className={input} />
                <p className="mt-1 text-xs text-muted">VD: 10.000đ → hóa đơn 100.000đ được 10 điểm</p>
              </div>
              <div>
                <label className={label}>Giá trị 1 điểm khi đổi (đ)</label>
                <input type="number" min={0} required value={form.pointValue} onChange={(e) => set("pointValue", Number(e.target.value))} className={input} />
                <p className="mt-1 text-xs text-muted">VD: 100đ → đổi 50 điểm giảm 5.000đ</p>
              </div>
            </div>
          </Section>

          <Section icon={<Warehouse size={15} />} title="Cảnh báo kho" desc="Ngưỡng hiển thị cảnh báo ở trang Kho hàng và Tổng quan">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Sắp hết hàng khi tồn ≤</label>
                <input type="number" min={0} required value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} className={input} />
              </div>
              <div>
                <label className={label}>Cảnh báo hết hạn trước (ngày)</label>
                <input type="number" min={1} required value={form.expiryWarningDays} onChange={(e) => set("expiryWarningDays", Number(e.target.value))} className={input} />
              </div>
            </div>
          </Section>

          <Section icon={<ReceiptText size={15} />} title="Hóa đơn" desc="Chân hóa đơn và WiFi cho khách — xem trước ở khung bên phải">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Lời cảm ơn</label>
                <input value={form.receiptFooter} onChange={(e) => set("receiptFooter", e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Ghi chú đổi trả</label>
                <input value={form.receiptReturnNote} onChange={(e) => set("receiptReturnNote", e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Tên WiFi</label>
                <input value={form.wifiName} onChange={(e) => set("wifiName", e.target.value)} className={input} placeholder="VD: TLUX Free WiFi" />
              </div>
              <div>
                <label className={label}>Mật khẩu WiFi</label>
                <input value={form.wifiPassword} onChange={(e) => set("wifiPassword", e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Hiển thị WiFi trên hóa đơn</label>
                <AppSelect
                  value={form.wifiDisplay}
                  onValueChange={(v) => set("wifiDisplay", v as Settings["wifiDisplay"])}
                  options={[
                    { value: "off", label: "Không hiển thị" },
                    { value: "text", label: "Dạng chữ (tên + mật khẩu)" },
                    { value: "qr", label: "Mã QR (quét là kết nối)" },
                  ]}
                />
              </div>
            </div>
          </Section>

          <button type="submit" className={`${btn.primary} w-full sm:w-auto`} disabled={save.isPending}>
            {save.isPending ? "Đang lưu…" : "Lưu cài đặt"}
          </button>
        </form>

        {/* Preview hóa đơn theo cài đặt đang nhập (chưa cần lưu) */}
        <aside className="sticky top-6 hidden lg:block">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Eye size={15} className="text-leaf" /> Xem trước hóa đơn
          </div>
          <div className="max-h-[80vh] overflow-y-auto rounded-xl border border-line bg-white p-4 shadow-sm">
            <ReceiptContent order={previewOrder} settings={previewSettings} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
        <span className="text-leaf">{icon}</span> {title}
      </div>
      <p className="mb-4 text-xs text-muted">{desc}</p>
      {children}
    </section>
  );
}
