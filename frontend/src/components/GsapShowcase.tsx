"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export default function GsapShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Refs for the three scenes
  const desktopSceneRef = useRef<HTMLDivElement>(null);
  const laptopSceneRef = useRef<HTMLDivElement>(null);
  const mobileSceneRef = useRef<HTMLDivElement>(null);
  
  // Refs for elements inside Desktop POS
  const desktopMonitorRef = useRef<HTMLDivElement>(null);
  const desktopCartItem1Ref = useRef<HTMLDivElement>(null);
  const desktopCartItem2Ref = useRef<HTMLDivElement>(null);
  const desktopCheckoutBtnRef = useRef<HTMLButtonElement>(null);
  const desktopReceiptRef = useRef<HTMLDivElement>(null);

  // Refs for elements inside Laptop Dashboard
  const laptopShellRef = useRef<HTMLDivElement>(null);
  const laptopBar1Ref = useRef<HTMLDivElement>(null);
  const laptopBar2Ref = useRef<HTMLDivElement>(null);
  const laptopBar3Ref = useRef<HTMLDivElement>(null);
  const laptopPieRef = useRef<SVGCircleElement>(null);
  const leafBranch1Ref = useRef<HTMLDivElement>(null);
  const leafBranch2Ref = useRef<HTMLDivElement>(null);

  // Refs for elements inside Mobile App
  const mobilePhoneRef = useRef<HTMLDivElement>(null);
  const mobileScanLineRef = useRef<HTMLDivElement>(null);
  const mobileSuccessPopupRef = useRef<HTMLDivElement>(null);

  // Current active scene state for button indicators
  const [activeScene, setActiveScene] = useState(0); // 0 = Desktop, 1 = Laptop, 2 = Mobile
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Hide scenes initially via GSAP to prevent flash
    gsap.set(laptopSceneRef.current, { opacity: 0, scale: 0.9, y: 20, display: "none" });
    gsap.set(mobileSceneRef.current, { opacity: 0, scale: 0.9, y: 30, display: "none" });
    
    // Set initial states for elements
    gsap.set([desktopCartItem1Ref.current, desktopCartItem2Ref.current], { opacity: 0, x: -20 });
    gsap.set(desktopCheckoutBtnRef.current, { opacity: 0, scale: 0.9 });
    gsap.set(desktopReceiptRef.current, { opacity: 0, y: 30 });

    gsap.set([laptopBar1Ref.current, laptopBar2Ref.current, laptopBar3Ref.current], { scaleY: 0, transformOrigin: "bottom" });
    gsap.set(laptopPieRef.current, { strokeDasharray: "251", strokeDashoffset: "251" });
    gsap.set(leafBranch1Ref.current, { x: 50, y: -50, rotate: 10, opacity: 0 });
    gsap.set(leafBranch2Ref.current, { x: -50, y: 50, rotate: -10, opacity: 0 });

    gsap.set(mobileScanLineRef.current, { y: 10 });
    gsap.set(mobileSuccessPopupRef.current, { scale: 0.9, opacity: 0 });

    // Create the master looping timeline
    const tl = gsap.timeline({
      repeat: -1,
      paused: false,
    });

    timelineRef.current = tl;

    // ==================== SCENE 1: DESKTOP POS ====================
    tl.addLabel("desktop");
    tl.call(() => setActiveScene(0));
    
    // Entrance of desktop cashier components
    tl.to(desktopMonitorRef.current, { duration: 0.6, scale: 1, opacity: 1, ease: "power3.out" });
    tl.to(desktopCartItem1Ref.current, { duration: 0.4, opacity: 1, x: 0, ease: "power2.out" }, "-=0.2");
    tl.to(desktopCartItem2Ref.current, { duration: 0.4, opacity: 1, x: 0, ease: "power2.out" }, "-=0.2");
    tl.to(desktopCheckoutBtnRef.current, { duration: 0.4, opacity: 1, scale: 1, ease: "power2.out" }, "-=0.1");
    
    // Simulate checkout action
    tl.to(desktopCheckoutBtnRef.current, { duration: 0.15, scale: 0.96, ease: "power1.inOut" }, "+=0.8");
    tl.to(desktopCheckoutBtnRef.current, { duration: 0.15, scale: 1, ease: "power1.out" });
    tl.to(desktopReceiptRef.current, { duration: 0.5, opacity: 1, y: 0, ease: "power3.out" }, "-=0.1");
    
    // Hold Scene 1
    tl.to({}, { duration: 2.2 }); // Hold

    // ==================== TRANSITION 1 -> 2: DESKTOP TO LAPTOP ====================
    tl.addLabel("desktop-to-laptop");
    tl.to(desktopReceiptRef.current, { duration: 0.3, opacity: 0, y: 30, ease: "power2.in" });
    tl.to(desktopMonitorRef.current, { duration: 0.6, scale: 0.8, x: -100, opacity: 0, ease: "power2.inOut" }, "-=0.2");
    
    // Reveal Laptop Scene
    tl.set(laptopSceneRef.current, { display: "flex" });
    tl.to(laptopSceneRef.current, { duration: 0.7, opacity: 1, scale: 1, y: 0, ease: "power3.out" }, "-=0.3");
    tl.set(desktopSceneRef.current, { display: "none" });

    // ==================== SCENE 2: LAPTOP DASHBOARD ====================
    tl.addLabel("laptop");
    tl.call(() => setActiveScene(1));
    
    // Fill progress bars and animate pie chart
    tl.to(laptopBar1Ref.current, { duration: 0.5, scaleY: 1, ease: "power2.out" });
    tl.to(laptopBar2Ref.current, { duration: 0.5, scaleY: 1, ease: "power2.out" }, "-=0.35");
    tl.to(laptopBar3Ref.current, { duration: 0.5, scaleY: 1, ease: "power2.out" }, "-=0.35");
    tl.to(laptopPieRef.current, { duration: 0.6, strokeDashoffset: "70", ease: "power2.out" }, "-=0.3");
    
    // Leaf branches float in
    tl.to(leafBranch1Ref.current, { duration: 0.6, opacity: 0.9, x: 0, y: 0, rotate: 0, ease: "power2.out" }, "-=0.4");
    tl.to(leafBranch2Ref.current, { duration: 0.6, opacity: 0.9, x: 0, y: 0, rotate: 0, ease: "power2.out" }, "-=0.5");
    
    // Hold Scene 2
    tl.to({}, { duration: 2.2 }); // Hold

    // ==================== TRANSITION 2 -> 3: LAPTOP TO MOBILE ====================
    tl.addLabel("laptop-to-mobile");
    tl.to([leafBranch1Ref.current, leafBranch2Ref.current], { duration: 0.4, opacity: 0, scale: 0.9, ease: "power2.in" });
    tl.to(laptopSceneRef.current, { duration: 0.6, scale: 0.8, y: -50, opacity: 0, ease: "power2.inOut" }, "-=0.3");
    
    // Reveal Mobile Scene
    tl.set(mobileSceneRef.current, { display: "flex" });
    tl.to(mobileSceneRef.current, { duration: 0.7, opacity: 1, scale: 1, y: 0, ease: "power3.out" }, "-=0.3");
    tl.set(laptopSceneRef.current, { display: "none" });

    // ==================== SCENE 3: MOBILE SCANNER ====================
    tl.addLabel("mobile");
    tl.call(() => setActiveScene(2));
    
    // Scan Line animations (sliding up and down)
    tl.to(mobileScanLineRef.current, { duration: 0.6, y: 130, ease: "power1.inOut" });
    tl.to(mobileScanLineRef.current, { duration: 0.6, y: 10, ease: "power1.inOut" });
    
    // Pop up scan success checkmark
    tl.to(mobileSuccessPopupRef.current, { duration: 0.4, scale: 1, opacity: 1, ease: "power3.out" }, "-=0.1");
    
    // Hold Scene 3
    tl.to({}, { duration: 2.2 }); // Hold

    // ==================== TRANSITION 3 -> 1: MOBILE TO DESKTOP ====================
    tl.addLabel("mobile-to-desktop");
    tl.to(mobileSceneRef.current, { duration: 0.5, scale: 0.8, y: 50, opacity: 0, ease: "power2.in" });
    
    // Reset Desktop Scene & Reveal
    tl.set(desktopSceneRef.current, { display: "flex" });
    tl.set([desktopCartItem1Ref.current, desktopCartItem2Ref.current], { opacity: 0, x: -20 });
    gsap.set(desktopCheckoutBtnRef.current, { opacity: 0, scale: 0.9 });
    gsap.set(desktopReceiptRef.current, { opacity: 0, y: 30 });
    tl.to(desktopSceneRef.current, { duration: 0.6, opacity: 1, scale: 1, ease: "power3.out" }, "-=0.2");
    tl.set(mobileSceneRef.current, { display: "none" });

    // Clean up on unmount
    return () => {
      if (timelineRef.current) timelineRef.current.kill();
    };
  }, []);

  // Jump to specific scene manually
  const jumpToScene = (sceneIndex: number) => {
    if (!timelineRef.current) return;
    
    // Temporarily pause the autoplay timeline
    timelineRef.current.pause();
    
    // Configure transitions for manual jump
    gsap.to([desktopSceneRef.current, laptopSceneRef.current, mobileSceneRef.current], { duration: 0.3, opacity: 0, scale: 0.95, display: "none" });
    gsap.set([leafBranch1Ref.current, leafBranch2Ref.current], { opacity: 0 });

    if (sceneIndex === 0) {
      setActiveScene(0);
      gsap.set(desktopSceneRef.current, { display: "flex" });
      gsap.to(desktopSceneRef.current, { duration: 0.4, opacity: 1, scale: 1 });
      
      gsap.set([desktopCartItem1Ref.current, desktopCartItem2Ref.current], { opacity: 0, x: -15 });
      gsap.set(desktopCheckoutBtnRef.current, { opacity: 0, scale: 0.95 });
      gsap.set(desktopReceiptRef.current, { opacity: 0, y: 15 });
      
      gsap.to(desktopCartItem1Ref.current, { duration: 0.3, opacity: 1, x: 0, delay: 0.1 });
      gsap.to(desktopCartItem2Ref.current, { duration: 0.3, opacity: 1, x: 0, delay: 0.15 });
      gsap.to(desktopCheckoutBtnRef.current, { duration: 0.3, opacity: 1, scale: 1, delay: 0.2 });
      
    } else if (sceneIndex === 1) {
      setActiveScene(1);
      gsap.set(laptopSceneRef.current, { display: "flex" });
      gsap.to(laptopSceneRef.current, { duration: 0.4, opacity: 1, scale: 1 });
      
      gsap.set([laptopBar1Ref.current, laptopBar2Ref.current, laptopBar3Ref.current], { scaleY: 0 });
      gsap.set(laptopPieRef.current, { strokeDashoffset: "251" });
      
      gsap.to(laptopBar1Ref.current, { duration: 0.4, scaleY: 1, delay: 0.1 });
      gsap.to(laptopBar2Ref.current, { duration: 0.4, scaleY: 1, delay: 0.15 });
      gsap.to(laptopBar3Ref.current, { duration: 0.4, scaleY: 1, delay: 0.2 });
      gsap.to(laptopPieRef.current, { duration: 0.4, strokeDashoffset: "70", delay: 0.15 });
      
      gsap.to(leafBranch1Ref.current, { duration: 0.4, opacity: 0.9, x: 0, y: 0, rotate: 0, delay: 0.2 });
      gsap.to(leafBranch2Ref.current, { duration: 0.4, opacity: 0.9, x: 0, y: 0, rotate: 0, delay: 0.25 });
      
    } else if (sceneIndex === 2) {
      setActiveScene(2);
      gsap.set(mobileSceneRef.current, { display: "flex" });
      gsap.to(mobileSceneRef.current, { duration: 0.4, opacity: 1, scale: 1 });
      
      gsap.set(mobileSuccessPopupRef.current, { scale: 0.95, opacity: 0 });
      gsap.to(mobileSuccessPopupRef.current, { duration: 0.3, scale: 1, opacity: 1, delay: 0.15 });
    }

    // Resume playing after 5 seconds of inactivity
    setTimeout(() => {
      if (timelineRef.current) {
        const labels = ["desktop", "laptop", "mobile"];
        timelineRef.current.play(labels[sceneIndex]);
      }
    }, 5000);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      
      {/* -------------------- SHOWCASE CONTAINER (CLEAN & SEMI-FLAT) -------------------- */}
      <div 
        ref={containerRef}
        className="w-full max-w-[800px] aspect-[16/10] bg-gradient-to-tr from-[#f8fafc] to-[#ffffff] border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-100/50 relative overflow-hidden flex items-center justify-center p-6 md:p-12 select-none"
      >
        {/* Soft floating decorative gradient orbs */}
        <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[-80px] w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-[20%] right-[10%] w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* ====================================================================== */}
        {/* SCENE 1: DESKTOP POS SCREEN (BÁN HÀNG TẠI QUẦY) */}
        {/* ====================================================================== */}
        <div ref={desktopSceneRef} className="absolute inset-0 flex items-center justify-center p-6 md:p-12">
          {/* Bezel-less / Clean Monitor Mockup */}
          <div ref={desktopMonitorRef} className="w-full max-w-[530px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col relative">
            
            {/* Monitor Screen Header (Sleek Mac/Modern style) */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">POS Cashier Gateway</span>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-700" />
                <span className="w-2 h-2 rounded-full bg-slate-700" />
                <span className="w-2 h-2 rounded-full bg-slate-700" />
              </div>
            </div>

            {/* Monitor Screen Area */}
            <div className="grid grid-cols-12 h-64 bg-[#fcfdfd]">
              
              {/* Product Grid Mock (Left 7 cols) */}
              <div className="col-span-7 p-3 border-r border-slate-100 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 flex flex-col justify-between text-left h-16 border border-slate-100/60 transition-colors">
                    <span className="text-[10px] font-bold text-slate-800">Sữa tươi Ba Vì</span>
                    <span className="text-[9px] font-semibold text-slate-400">28.000đ</span>
                  </div>
                  <div className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 flex flex-col justify-between text-left h-16 border border-slate-100/60 transition-colors">
                    <span className="text-[10px] font-bold text-slate-800">Bánh mì tươi</span>
                    <span className="text-[9px] font-semibold text-slate-400">15.000đ</span>
                  </div>
                  <div className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 flex flex-col justify-between text-left h-16 border border-slate-100/60 transition-colors">
                    <span className="text-[10px] font-bold text-slate-800">Nước cam ép</span>
                    <span className="text-[9px] font-semibold text-slate-400">35.000đ</span>
                  </div>
                  <div className="bg-slate-50 hover:bg-slate-100/80 rounded-xl p-2.5 flex flex-col justify-between text-left h-16 border border-slate-100/60 transition-colors">
                    <span className="text-[10px] font-bold text-slate-800">Trà đào lon</span>
                    <span className="text-[9px] font-semibold text-slate-400">18.000đ</span>
                  </div>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl py-1.5 text-[8.5px] font-semibold text-emerald-700 text-center">
                  USB Barcode Scanner Connected
                </div>
              </div>

              {/* Cart Drawer Mock (Right 5 cols) */}
              <div className="col-span-5 p-3 flex flex-col justify-between bg-white">
                <div className="space-y-2">
                  <div className="border-b border-slate-100 pb-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Giỏ hàng chờ</span>
                  </div>
                  
                  {/* Cart Item 1 */}
                  <div ref={desktopCartItem1Ref} className="flex justify-between items-center bg-slate-50/60 border border-slate-100 p-2 rounded-xl text-[9px] font-bold">
                    <span className="text-slate-700">1x Sữa tươi</span>
                    <span className="text-emerald-600">28.000đ</span>
                  </div>

                  {/* Cart Item 2 */}
                  <div ref={desktopCartItem2Ref} className="flex justify-between items-center bg-slate-50/60 border border-slate-100 p-2 rounded-xl text-[9px] font-bold">
                    <span className="text-slate-700">1x Bánh mì</span>
                    <span className="text-emerald-600">15.000đ</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold border-t border-slate-100 pt-2">
                    <span className="text-slate-500">Tổng cộng:</span>
                    <span className="text-slate-900 font-extrabold">43.000đ</span>
                  </div>
                  <button 
                    ref={desktopCheckoutBtnRef}
                    className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-2 rounded-xl text-[10px] font-bold transition-colors cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    Thanh Toán
                  </button>
                </div>
              </div>

            </div>

            {/* Virtual receipt printing out (Animates downwards) */}
            <div 
              ref={desktopReceiptRef}
              className="absolute top-44 left-1/3 w-36 bg-white border border-slate-100 rounded-2xl p-3 shadow-xl shadow-slate-900/10 z-20 flex flex-col gap-1.5"
            >
              <div className="text-center border-b border-dashed border-slate-200 pb-1.5">
                <p className="text-[9px] font-extrabold text-slate-800">TLUX STORE</p>
                <p className="text-[7px] text-slate-400">Hóa đơn điện tử</p>
              </div>
              <div className="space-y-1 text-[7px] font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Sữa tươi Ba Vì</span>
                  <span>28.000đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Bánh mì tươi</span>
                  <span>15.000đ</span>
                </div>
                <div className="flex justify-between font-bold text-[8px] text-slate-800 border-t border-slate-100 pt-1">
                  <span>TỔNG CỘNG:</span>
                  <span className="text-emerald-600">43.000đ</span>
                </div>
              </div>
              <div className="bg-emerald-500 text-white text-[7px] font-bold py-1 rounded-md text-center">
                ĐÃ THANH TOÁN
              </div>
            </div>
            
          </div>
        </div>

        {/* ====================================================================== */}
        {/* SCENE 2: LAPTOP DASHBOARD SCREEN (BÁO CÁO KHO FEFO) */}
        {/* ====================================================================== */}
        <div ref={laptopSceneRef} className="absolute inset-0 flex items-center justify-center p-6 md:p-12">
          
          {/* Leaf Decoration 1 (floating subtly) */}
          <div ref={leafBranch2Ref} className="absolute bottom-4 left-6 md:left-14 w-24 h-24 pointer-events-none z-10">
            <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-500" fill="currentColor" opacity="0.8">
              <path d="M10,80 Q40,65 80,60 Q50,75 10,80" />
              <path d="M15,75 Q35,45 70,48 Q40,60 15,75" />
            </svg>
          </div>

          {/* Laptop Mockup */}
          <div ref={laptopShellRef} className="w-full max-w-[510px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-2 relative">
            {/* Screen inner container */}
            <div className="w-full aspect-[16/10] bg-[#f8fafc] rounded-xl border border-slate-900 overflow-hidden p-3 text-slate-800 flex flex-col justify-between">
              
              {/* Laptop Dashboard Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-600">M</span>
                  <div>
                    <p className="text-[10px] font-bold">Hi, Flopa 👋</p>
                    <p className="text-[8px] font-semibold text-slate-400">Hệ thống kho nông sản FEFO</p>
                  </div>
                </div>
                <div>
                  <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-2 py-0.5 rounded-full">
                    Kho tổng
                  </span>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-12 gap-3 my-2 grow">
                {/* Stats / Pie Chart (Left 5 cols) */}
                <div className="col-span-5 bg-white border border-slate-100/80 rounded-xl p-2.5 shadow-sm flex flex-col items-center justify-center">
                  <svg className="w-14 h-14 overflow-visible" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                    <circle 
                      ref={laptopPieRef}
                      cx="50" 
                      cy="50" 
                      r="42" 
                      fill="none" 
                      stroke="#10B981" 
                      strokeWidth="12" 
                      strokeDasharray="263"
                      strokeDashoffset="75"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <span className="text-[9px] font-bold text-slate-700 mt-2">72% Hạn an toàn</span>
                </div>

                {/* Bar Charts (Right 7 cols) */}
                <div className="col-span-7 bg-white border border-slate-100/80 rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
                  <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">Doanh thu quý II</p>
                  
                  {/* Bouncing Bars */}
                  <div className="flex items-end justify-around h-12 w-full pt-1">
                    <div className="w-2.5 bg-slate-100 rounded-full h-full relative overflow-hidden">
                      <div ref={laptopBar1Ref} className="absolute bottom-0 left-0 right-0 bg-[#F59E0B] rounded-full" style={{ height: "65%" }} />
                    </div>
                    <div className="w-2.5 bg-slate-100 rounded-full h-full relative overflow-hidden">
                      <div ref={laptopBar2Ref} className="absolute bottom-0 left-0 right-0 bg-[#3B82F6] rounded-full" style={{ height: "85%" }} />
                    </div>
                    <div className="w-2.5 bg-slate-100 rounded-full h-full relative overflow-hidden">
                      <div ref={laptopBar3Ref} className="absolute bottom-0 left-0 right-0 bg-[#10B981] rounded-full" style={{ height: "45%" }} />
                    </div>
                  </div>
                  
                  <div className="flex justify-around text-[6.5px] font-bold text-slate-400">
                    <span>Th5</span>
                    <span>Th6</span>
                    <span>Th7</span>
                  </div>
                </div>
              </div>

              {/* Status footer */}
              <div className="bg-[#fffbeb] border border-amber-100 px-2.5 py-1 rounded-lg text-[8.5px] font-semibold text-center text-slate-600">
                Doanh thu kho hôm nay: <span className="text-emerald-600 font-extrabold">2.450.000đ</span>
              </div>

            </div>
          </div>
          
          {/* Leaf Decoration 2 (floating subtly) */}
          <div ref={leafBranch1Ref} className="absolute top-4 right-6 md:right-14 w-24 h-24 pointer-events-none z-10">
            <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-500" fill="currentColor" opacity="0.8">
              <path d="M90,20 Q60,40 10,80 Q40,60 90,20" />
              <path d="M75,30 Q55,45 35,60" stroke="#0f172a" strokeWidth="1.5" fill="none" opacity="0.3" />
            </svg>
          </div>

        </div>

        {/* ====================================================================== */}
        {/* SCENE 3: MOBILE APP SCANNER (ĐỒNG BỘ DI ĐỘNG) */}
        {/* ====================================================================== */}
        <div ref={mobileSceneRef} className="absolute inset-0 flex items-center justify-center p-6 md:p-12">
          
          {/* Clean Floating Smartphone Mockup (No hand, sleek frame) */}
          <div ref={mobilePhoneRef} className="w-[210px] h-[390px] bg-slate-900 rounded-[32px] shadow-2xl p-2 relative border border-slate-800">
            
            {/* Screen Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-30" />
            
            {/* Mobile Screen container */}
            <div className="w-full h-full bg-[#f8fafc] rounded-[24px] overflow-hidden p-3 text-slate-800 flex flex-col justify-between border border-slate-950">
              
              {/* Mobile Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 pt-4">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold text-slate-700">TLUX Barcode Link</span>
                </div>
                <span className="text-[7px] font-semibold text-slate-400">Wi-Fi</span>
              </div>

              {/* Camera Scanner View */}
              <div className="bg-slate-950 rounded-xl grow my-2 relative overflow-hidden flex flex-col items-center justify-center">
                {/* Thin grid lines */}
                <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:10px_10px]" />
                
                {/* Minimalist Barcode Icon */}
                <div className="flex gap-1.5 items-center opacity-70 h-8 w-20 bg-white p-1 rounded border border-slate-200">
                  <div className="w-1 h-full bg-slate-900" />
                  <div className="w-0.5 h-full bg-slate-900" />
                  <div className="w-1.5 h-full bg-slate-900" />
                  <div className="w-0.5 h-full bg-slate-900" />
                  <div className="w-1 h-full bg-slate-900" />
                </div>

                {/* Laser Red Line */}
                <div 
                  ref={mobileScanLineRef}
                  className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_6px_#ef4444]"
                />
              </div>

              {/* Scan Success Popup */}
              <div 
                ref={mobileSuccessPopupRef}
                className="absolute inset-x-4 top-1/3 bg-white border border-slate-100 rounded-2xl p-3 shadow-xl shadow-slate-900/10 z-30 flex flex-col items-center gap-1.5"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-xs font-bold">✓</div>
                <span className="text-[9px] font-bold text-slate-800">QUÉT MÃ THÀNH CÔNG</span>
                <span className="text-[7.5px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Sữa tươi Ba Vì
                </span>
              </div>

              {/* Mobile Footer Status */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-1.5 text-[8px] font-bold text-center text-emerald-700">
                Paired with POS-Terminal #1
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* -------------------- MINIMALIST CAPSULE DOT CONTROLLER -------------------- */}
      <div className="flex gap-2 items-center bg-white border border-slate-200/80 p-1.5 rounded-full shadow-lg shadow-slate-100/80">
        <button
          onClick={() => jumpToScene(0)}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeScene === 0 
              ? "bg-[#10B981] text-white shadow-md shadow-emerald-500/10" 
              : "bg-white text-slate-500 hover:text-slate-800"
          }`}
        >
          1. POS Cashier
        </button>
        
        <button
          onClick={() => jumpToScene(1)}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeScene === 1 
              ? "bg-[#FBBF24] text-slate-900 shadow-md shadow-amber-500/10" 
              : "bg-white text-slate-500 hover:text-slate-800"
          }`}
        >
          2. FEFO Dashboard
        </button>

        <button
          onClick={() => jumpToScene(2)}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
            activeScene === 2 
              ? "bg-[#3B82F6] text-white shadow-md shadow-blue-500/10" 
              : "bg-white text-slate-500 hover:text-slate-800"
          }`}
        >
          3. Mobile Link
        </button>
      </div>

    </div>
  );
}
