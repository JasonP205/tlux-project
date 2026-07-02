import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4343";

// Fetch từ Server Component: chuyển tiếp cookie đăng nhập sang backend.
// Trả về null khi lỗi/chưa đăng nhập — client sẽ tự fetch lại và xử lý redirect.
export async function serverApi<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const res = await fetch(`${API_URL}/api${path}`, {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
