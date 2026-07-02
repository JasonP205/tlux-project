const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4343";

// Khi mở trang từ điện thoại qua IP LAN (VD: 192.168.x.x:3000), backend "localhost"
// không truy cập được — thay hostname của API bằng hostname đang mở trang.
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const url = new URL(RAW_API_URL);
    const isApiLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (isApiLocal && !isPageLocal) {
      url.hostname = window.location.hostname;
      return url.origin;
    }
  }
  return RAW_API_URL;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; formData?: FormData } = {}
): Promise<T> {
  const { method = "GET", body, formData } = options;
  const res = await fetch(`${getApiUrl()}/api${path}`, {
    method,
    credentials: "include",
    headers: formData ? undefined : body ? { "Content-Type": "application/json" } : undefined,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.message || "Có lỗi xảy ra", res.status);
  return data as T;
}
