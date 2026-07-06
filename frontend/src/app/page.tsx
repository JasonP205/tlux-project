"use client";

import Link from "next/link";
import GsapShowcase from "@/components/GsapShowcase";
import { ArrowRight, Lock } from "lucide-react";
import { useBranding } from "@/lib/hooks";

export default function Home() {
  const branding = useBranding().data?.branding;
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 overflow-x-hidden selection:bg-emerald-400 selection:text-white font-sans flex flex-col justify-between py-16 px-4 sm:px-6 lg:px-8 relative">
      
      {/* Soft decorative background gradients */}
      <div className="absolute top-1/6 left-1/10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/6 right-1/10 w-[450px] h-[450px] bg-cyan-500/5 rounded-full blur-3xl -z-10" />

      {/* -------------------- HEADER INTRO -------------------- */}
      <div className="max-w-3xl mx-auto text-center space-y-5 z-10">
        <div className="flex justify-center items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding?.logoUrl ?? "/logo.png"}
            alt=""
            className="h-10 w-10 rounded-xl bg-white object-contain shadow-md shadow-emerald-500/15 ring-1 ring-slate-200"
          />
          <span className="text-2xl font-extrabold tracking-wider text-slate-900">
            {branding?.storeName ?? "TLUX"}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-none">
          Hệ thống Quản lý Bán hàng &amp; Lô kho
        </h1>
        
        <p className="text-base sm:text-lg font-medium text-slate-500 max-w-xl mx-auto leading-relaxed">
          Nền tảng vận hành nội bộ tích hợp quầy thu ngân đa nhiệm (POS), kiểm soát hạn sử dụng theo lô kho FEFO và ghép đôi camera di động quét mã vạch thời gian thực.
        </p>

        <div className="flex justify-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-leaf hover:bg-leaf-dark text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/10 hover:translate-y-[-1px] active:translate-y-[1px] transition-all cursor-pointer text-sm sm:text-base"
          >
            <Lock className="h-4.5 w-4.5" /> Truy cập Hệ thống Quản lý <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </div>
      </div>

      {/* -------------------- SHOWCASE CONTENT -------------------- */}
      <div className="grow w-full max-w-4xl mx-auto flex items-center justify-center py-8 z-10">
        <GsapShowcase />
      </div>

      {/* -------------------- FOOTER NOTICE -------------------- */}
      <div className="max-w-md mx-auto text-center space-y-1 text-xs text-slate-400 font-medium z-10 border-t border-slate-200/60 pt-6 w-full">
        <p>Hệ thống giới thiệu cổng nghiệp vụ nội bộ {branding?.storeName ?? "TLUX"}.</p>
        <p>&copy; {new Date().getFullYear()} {branding?.storeName ?? "TLUX"}. All rights reserved.</p>
      </div>

    </div>
  );
}
