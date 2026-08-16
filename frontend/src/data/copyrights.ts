/**
 * Thông tin TLUX tự công bố về chính mình, theo đúng shape mà portfolio
 * (jasoncode) đọc vào. Route `/copyrights` serve nó dưới dạng JSON.
 *
 * Đường dẫn ảnh phải tuyệt đối hoá qua `abs()` vì phía đọc là một origin khác:
 * `/logo.png` không có ý nghĩa gì khi đã rời khỏi domain này.
 */

/** Origin chuẩn của site — nhận cả dạng có lẫn không có scheme. */
function toOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const SITE_URL = toOrigin(
  process.env.NEXT_PUBLIC_CANONICAL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "tlux.hwagfu.dev",
);

/** Biến một path trong `public/` thành URL tuyệt đối. */
export function abs(path: string) {
  return new URL(path, `${SITE_URL}/`).toString();
}

/** Hai ngôn ngữ portfolio hiển thị. */
export const LOCALES = ["vi", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Record<Locale, string>;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export interface Project {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  fullDescription: LocalizedText;
  image: {
    src: string;
    alt?: string;
  }[];
  tags: string[];
  liveUrl?: string;
  isDone: boolean;
}

/** Một `Project` đã chọn xong ngôn ngữ — mọi `LocalizedText` bị thu về string. */
export type LocalizedProject = Omit<
  Project,
  "title" | "description" | "fullDescription"
> & {
  title: string;
  description: string;
  fullDescription: string;
};

/** Resolve các trường đa ngữ của project theo locale. */
export function localizeProject(
  project: Project,
  locale: Locale,
): LocalizedProject {
  return {
    id: project.id,
    title: project.title[locale],
    description: project.description[locale],
    fullDescription: project.fullDescription[locale],
    image: project.image,
    tags: project.tags,
    liveUrl: project.liveUrl,
    isDone: project.isDone,
  };
}

export const PROJECTS: Project[] = [
  {
    id: "tlux",
    title: {
      vi: "TLUX",
      en: "TLUX",
    },
    description: {
      vi: "Hệ thống quản lý bán hàng và tồn kho theo lô — POS đa hoá đơn, xuất hàng FEFO theo hạn sử dụng, quét mã vạch bằng camera điện thoại.",
      en: "A retail POS and batch-inventory system — multi-invoice checkout, FEFO stock allocation by expiry date, and barcode scanning from a phone camera.",
    },
    fullDescription: {
      vi: "Nền tảng vận hành nội bộ cho cửa hàng bán lẻ, dựng trên Next.js App Router và Express + MongoDB. Tồn kho không lưu trên sản phẩm mà là tổng số còn lại của các lô nhập, nên mỗi lần thanh toán hệ thống trừ hàng theo FEFO — lô hết hạn sớm nhất đi trước — trong một transaction và ghi lại chính xác đã lấy từ lô nào. Thu ngân mở nhiều hoá đơn song song, mỗi hoá đơn là một đơn nháp lưu ở server nên tải lại trang vẫn còn nguyên. Mã vạch quét được bằng đầu đọc USB hoặc bằng camera điện thoại ghép cặp qua QR và socket.io; tiền tố mã cho biết đang quét sản phẩm, tem giảm giá theo dòng, mã khuyến mãi hay thẻ thành viên. Có màn hình phụ hướng về khách hiển thị giỏ hàng và QR chuyển khoản PayOS theo thời gian thực, tìm kiếm mờ tiếng Việt không dấu bằng Elasticsearch, phân quyền bốn vai trò, tích điểm khách hàng, và hoá đơn in khổ 80mm.",
      en: "An internal operations platform for retail stores, built on the Next.js App Router with Express and MongoDB. Stock is never stored on the product — it is the sum of what remains across intake batches — so every checkout draws down stock FEFO, earliest expiry first, inside a transaction that records exactly which batches were consumed. Cashiers keep several invoices open at once; each one is a draft order held server-side, so parked carts survive a page reload. Barcodes come from a USB reader or from a phone camera paired over QR and socket.io, and the code's prefix tells the register whether it is a product, a per-line discount label, a promo code or a member card. It also ships a customer-facing second screen that mirrors the cart and the PayOS transfer QR in realtime, accent-insensitive Vietnamese fuzzy search via Elasticsearch, four-role access control, a loyalty-points ledger, and 80mm thermal receipts.",
    },
    image: [
      { src: abs("/logo.png"), alt: "Logo TLUX" },
    ],
    tags: [
      "Next.js",
      "TypeScript",
      "Express",
      "MongoDB",
      "Socket.IO",
      "Elasticsearch",
      "TanStack Query",
      "Tailwind CSS",
      "POS",
    ],
    liveUrl: SITE_URL,
    isDone: true,
  },
];
