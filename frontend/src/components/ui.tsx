"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50 cursor-pointer",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-paper hover:text-ink cursor-pointer",
};

export const input =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-leaf";

export const label = "mb-1 block text-xs font-semibold text-muted";

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full ${wide ? "max-w-3xl" : "max-w-md"} overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className={btn.ghost} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "gray";
  children: React.ReactNode;
}) {
  const tones = {
    green: "bg-leaf-soft text-leaf-dark",
    amber: "bg-amber-soft text-amber",
    red: "bg-danger-soft text-danger",
    gray: "bg-paper text-muted",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ message }: { message: string }) {
  return <div className="py-12 text-center text-sm text-muted">{message}</div>;
}

export function PageTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="text-xl font-bold">{title}</h1>
      {action}
    </div>
  );
}
