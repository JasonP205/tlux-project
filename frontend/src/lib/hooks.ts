"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, ApiError } from "./api";
import type { Branding, User } from "./types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: User }>("/auth/me"),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      qc.clear();
      router.replace("/login");
    },
  });
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

// Logo + tên cửa hàng (public, không cần đăng nhập) — đổi được ở Cài đặt, không cần build lại
export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: () => api<{ branding: Branding }>("/settings/branding"),
    staleTime: 5 * 60_000,
  });
}
