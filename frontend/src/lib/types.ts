export type Role = "ADMIN" | "MANAGER" | "WAREHOUSE" | "CASHIER";

export interface User {
  _id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
}

export interface Product {
  _id: string;
  name: string;
  barcode: string;
  price: number;
  costPrice: number;
  unit: string;
  category: Category | null;
  image: { url: string | null; publicId: string | null };
  description: string;
  active: boolean;
  stock?: number;
  nearestExpiry?: string | null;
}

export interface InventoryBatch {
  _id: string;
  product: Pick<Product, "_id" | "name" | "barcode" | "unit" | "image">;
  quantityIn: number;
  remaining: number;
  importDate: string;
  expiryDate: string | null;
  note: string;
  createdBy?: { _id: string; name: string };
  createdAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  note: string;
  memberCode: string;
  createdAt: string;
}

export interface OrderItem {
  product: string;
  name: string;
  barcode: string;
  price: number;
  qty: number;
  discountPercent: number;
  promoBarcode?: string | null;
}

export type OrderStatus = "DRAFT" | "PENDING_PAYMENT" | "PAID" | "CANCELLED";

export interface Order {
  _id: string;
  code: string;
  label: string;
  cashier: { _id: string; name: string } | string;
  customer: Customer | null;
  pendingCustomer: { name: string; phone: string } | null;
  items: OrderItem[];
  subtotal: number;
  discountCode: string | null;
  discountAmount: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  pointsEarned: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paymentMethod: "CASH" | "PAYOS" | null;
  status: OrderStatus;
  payosCheckoutUrl: string | null;
  payosQrCode: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface DiscountCode {
  _id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
  minOrderTotal: number;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
}

export interface Settings {
  storeName: string;
  storeSlogan: string;
  storeAddress: string;
  storePhone: string;
  logo: { url: string; publicId: string } | null;
  wifiName: string;
  wifiPassword: string;
  wifiDisplay: "off" | "text" | "qr";
  vatRate: number;
  pointsEarnRate: number;
  pointValue: number;
  lowStockThreshold: number;
  expiryWarningDays: number;
  receiptFooter: string;
  receiptReturnNote: string;
}

export interface Branding {
  storeName: string;
  storeSlogan: string;
  logoUrl: string | null;
}
