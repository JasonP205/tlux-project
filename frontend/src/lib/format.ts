export function formatMoney(value: number): string {
  return value.toLocaleString("vi-VN") + "đ";
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { hour12: false });
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

// Thành tiền 1 dòng hóa đơn sau giảm giá theo sản phẩm (khớp công thức backend)
export function itemLineTotal(it: { price: number; qty: number; discountPercent?: number }) {
  return Math.round((it.price * it.qty * (100 - (it.discountPercent ?? 0))) / 100);
}
