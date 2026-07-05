"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { btn, input, label } from "@/components/ui";
import { HOME_BY_ROLE } from "@/components/AppShell";
import { useBranding } from "@/lib/hooks";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const qc = useQueryClient();
  const branding = useBranding().data?.branding;

  const login = useMutation({
    mutationFn: () =>
      api<{ user: User }>("/auth/login", { method: "POST", body: { username, password } }),
    onSuccess: (data) => {
      qc.setQueryData(["me"], data);
      router.replace(HOME_BY_ROLE[data.user.role]);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-pine p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate();
        }}
        className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding?.logoUrl ?? "/logo.png"} alt="" className="h-12 w-12 rounded-xl object-contain" />
          <h1 className="text-xl font-extrabold tracking-tight">{branding?.storeName ?? "TLUX"}</h1>
          <p className="text-sm text-muted">Đăng nhập để bắt đầu ca làm việc</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              className={input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div>
            <label className={label} htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className={`${btn.primary} w-full`} disabled={login.isPending}>
            {login.isPending ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </div>
      </form>
    </div>
  );
}
