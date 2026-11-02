"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  BarChart3,
  PieChart,
  Calendar,
  Receipt,
  Sliders,
  Sparkles,
  X,
  ChevronDown,
  ArrowUp,
  RefreshCw,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface FinoraFoxCompanionProps {
  onOpenBudgetModal?: () => void;
}

export default function FinoraFoxCompanion({
  onOpenBudgetModal,
}: FinoraFoxCompanionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [bubbleText, setBubbleText] = useState("Need to seek a section? Tap me! 🦊");

  // Cycle helpful financial advice tips
  const tips = [
    "Need to seek a section? Tap me! 🦊",
    "Inspect your monthly budget limits 🎯",
    "Monitor real-time cashflow & insights 📊",
    "Keeping your finances balanced & clear 🐾",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen && !hasInteracted) {
        setBubbleText(tips[Math.floor(Math.random() * tips.length)]);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [isOpen, hasInteracted]);

  const scrollToSection = (id: string, fallbackPath?: string) => {
    setIsOpen(false);
    if (pathname === "/" || pathname === "") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Trigger a temporary spotlight ring on the target
        el.classList.add("ring-4", "ring-[#6C3BFF]/40", "transition-all", "duration-500");
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-[#6C3BFF]/40");
        }, 1800);
        return;
      }
    }
    if (fallbackPath) {
      router.push(fallbackPath);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsOpen(false);
  };

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING FOX TRIGGER MASCOT (Bottom-Right Floating Dock)  */}
      {/* ========================================================= */}
      <div className="fixed bottom-5 sm:bottom-8 right-3 sm:right-6 z-40 select-none">
        {/* Playful Floating Speech Bubble */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              className="absolute -top-11 right-0 hidden sm:flex items-center pointer-events-none"
            >
              <div className="px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_8px_20px_rgba(108,59,255,0.14)] flex items-center gap-1.5 text-xs font-semibold text-[#5228E0] whitespace-nowrap">
                <span>{bubbleText}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mascot Avatar Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setIsOpen(!isOpen);
            setHasInteracted(true);
          }}
          className="relative group w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-[#F5F3FF]/90 backdrop-blur-xl border border-white/90 p-1 shadow-[0_12px_28px_rgba(108,59,255,0.22),0_4px_10px_rgba(0,0,0,0.06)] cursor-pointer flex items-center justify-center transition-all duration-200 hover:shadow-[0_16px_36px_rgba(108,59,255,0.32)]"
          title="Finora Fox Navigator - Click to seek sections"
          aria-label="Finora Fox Assistant"
        >
          {/* Animated pulse halo */}
          <span className="absolute -inset-1 rounded-2xl bg-[#6C3BFF]/20 blur-md group-hover:bg-[#6C3BFF]/35 transition-colors -z-10" />

          {/* Fox Body with Waving Paw */}
          <div className="relative w-full h-full">
            <Image
              src="/finora-fox-body.png"
              alt="Finora Fox"
              fill
              sizes="64px"
              className="object-contain pointer-events-none"
            />
            {/* Waving Paw */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: "33%",
                left: "0%",
                width: "22%",
                height: "21%",
              }}
            >
              <motion.div
                animate={{ rotate: [0, 8, -2, 8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "55% 75%", width: "100%", height: "100%" }}
                className="relative w-full h-full"
              >
                <Image
                  src="/finora-fox-paw.png"
                  alt=""
                  fill
                  sizes="16px"
                  className="object-contain"
                />
              </motion.div>
            </div>
            {/* Cuff */}
            <div className="absolute inset-0 pointer-events-none">
              <Image
                src="/finora-fox-cuff.png"
                alt=""
                fill
                sizes="64px"
                className="object-contain"
              />
            </div>
          </div>

          {/* Mini active badge */}
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#6C3BFF] border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">
            <Compass className="w-2.5 h-2.5" />
          </span>
        </motion.button>
      </div>

      {/* ========================================================= */}
      {/* INTERACTIVE PAGE SEEKER POPUP DRAWER                      */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 pointer-events-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs pointer-events-auto"
            />

            {/* Navigator Drawer */}
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative pointer-events-auto w-full sm:w-[380px] max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 p-5 sm:p-6 shadow-[0_24px_64px_rgba(108,59,255,0.22),0_4px_16px_rgba(15,23,42,0.08)] mb-0 sm:mb-20 sm:mr-4 select-none"
            >
              {/* iOS Mobile Sheet Handle */}
              <div className="w-12 h-1.5 rounded-full bg-slate-200 mx-auto mb-4 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#6C3BFF]/10 border border-[#6C3BFF]/20 flex items-center justify-center text-[#6C3BFF]">
                    <Compass className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                      <span>Finora Page Seeker</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#6C3BFF]/10 text-[#5228E0] font-bold">
                        Smart Jump
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Quickly jump to any section or view</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Seeker Navigation Buttons */}
              <div className="space-y-1.5 mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">
                  Seek Section
                </p>

                {/* 1. Inflow vs Outflow Chart */}
                <button
                  type="button"
                  onClick={() => scrollToSection("inflow-outflow-chart", "/")}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 hover:bg-[#6C3BFF]/8 border border-slate-200/60 hover:border-[#6C3BFF]/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6C3BFF] border border-purple-100 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#6C3BFF]">
                        Inflow vs Outflow Chart
                      </p>
                      <p className="text-[10px] text-slate-500">Monthly, weekly & annual trends</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#6C3BFF] opacity-0 group-hover:opacity-100 transition-opacity">
                    Seek →
                  </span>
                </button>

                {/* 2. Expense by Category */}
                <button
                  type="button"
                  onClick={() => scrollToSection("expense-by-category", "/")}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 hover:bg-[#6C3BFF]/8 border border-slate-200/60 hover:border-[#6C3BFF]/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#6C3BFF]">
                        Expense by Category
                      </p>
                      <p className="text-[10px] text-slate-500">Shopping, dining & utility breakdown</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#6C3BFF] opacity-0 group-hover:opacity-100 transition-opacity">
                    Seek →
                  </span>
                </button>

                {/* 3. Monthly Cashflow Calendar */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/calendar");
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 hover:bg-[#6C3BFF]/8 border border-slate-200/60 hover:border-[#6C3BFF]/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#6C3BFF]">
                        Monthly Calendar
                      </p>
                      <p className="text-[10px] text-slate-500">Day-by-day cashflow breakdown</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#6C3BFF] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </span>
                </button>

                {/* 4. Recent Bank Activity */}
                <button
                  type="button"
                  onClick={() => scrollToSection("recent-transactions-section", "/transactions")}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 hover:bg-[#6C3BFF]/8 border border-slate-200/60 hover:border-[#6C3BFF]/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#6C3BFF]">
                        Recent Transactions
                      </p>
                      <p className="text-[10px] text-slate-500">Live HDFC automated bank records</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#6C3BFF] opacity-0 group-hover:opacity-100 transition-opacity">
                    Seek →
                  </span>
                </button>
              </div>

              {/* Quick Actions & Fox Tip */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#F5F3FF] to-white border border-[#DDD6FE] mb-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-[#6C3BFF]/10 text-[#6C3BFF] shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-[11px]">
                    <span className="font-bold text-[#5228E0] block mb-0.5">Finora Companion Tip</span>
                    <p className="text-slate-600 leading-snug">
                      Tap any month bar on the Inflow vs Outflow chart to filter the entire dashboard instantly!
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Quick Controls */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                {onOpenBudgetModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenBudgetModal();
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#6C3BFF]" />
                    <span>Budget Limits</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={scrollToTop}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Scroll to Top of Page"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Top</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
