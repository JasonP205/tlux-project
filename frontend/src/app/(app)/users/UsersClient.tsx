"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { btn, input, label, Modal, Badge, PageTitle, AppSelect } from "@/components/ui";
import type { Role, User } from "@/lib/types";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị",
  MANAGER: "Quản lý",
  WAREHOUSE: "Thủ kho",
  CASHIER: "Thu ngân",
};

export default function UsersClient({ initial }: { initial?: { users: User[] } }) {
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api<{ users: User[] }>("/users"),
    initialData: initial,
  });

  return (
    <div className="p-4 sm:p-6">
      <PageTitle
        title="Nhân viên"
        action={
          <button className={btn.primary} onClick={() => setEditing("new")}>
            <Plus size={16} /> Thêm nhân viên
          </button>
        }
      />
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-paper text-left text-xs font-semibold text-muted">
            <tr>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Tên đăng nhập</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.data?.users.map((u) => (
              <tr key={u._id} className="hover:bg-paper/60">
                <td className="px-4 py-2.5 font-semibold">{u.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-2.5">{ROLE_LABELS[u.role]}</td>
                <td className="px-4 py-2.5">
                  {u.active ? <Badge tone="green">Hoạt động</Badge> : <Badge tone="red">Đã khóa</Badge>}
                </td>
                <td className="px-4 py-2.5 text-muted">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button className={btn.ghost} onClick={() => setEditing(u)} aria-label="Sửa">
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <UserForm user={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function UserForm({ user, onClose }: { user: User | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<Role>(user?.role ?? "CASHIER");
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      user ? api(`/users/${user._id}`, { method: "PUT", body }) : api("/users", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(user ? "Đã cập nhật nhân viên" : "Đã thêm nhân viên");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal title={user ? `Sửa — ${user.name}` : "Thêm nhân viên"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const body: Record<string, unknown> = {
            name: fd.get("name"),
            role,
          };
          const password = fd.get("password") as string;
          if (password) body.password = password;
          if (!user) body.username = fd.get("username");
          if (user) body.active = fd.get("active") === "on";
          save.mutate(body);
        }}
      >
        <div>
          <label className={label}>Họ tên</label>
          <input name="name" required defaultValue={user?.name} className={input} />
        </div>
        {!user && (
          <div>
            <label className={label}>Tên đăng nhập</label>
            <input name="username" required className={input} />
          </div>
        )}
        <div>
          <label className={label}>{user ? "Mật khẩu mới (bỏ trống nếu giữ nguyên)" : "Mật khẩu"}</label>
          <input name="password" type="password" required={!user} className={input} />
        </div>
        <div>
          <label className={label}>Vai trò</label>
          <AppSelect
            value={role}
            onValueChange={(v) => setRole(v as Role)}
            options={Object.entries(ROLE_LABELS).map(([value, text]) => ({ value, label: text }))}
          />
        </div>
        {user && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={user.active} /> Cho phép đăng nhập
          </label>
        )}
        <button type="submit" className={`${btn.primary} w-full`} disabled={save.isPending}>
          Lưu
        </button>
      </form>
    </Modal>
  );
}
