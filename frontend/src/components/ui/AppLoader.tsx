"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function AppLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F5F6FF] select-none">
      {/* Background Soft Purple Ambient Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-[#6C3BFF]/10 blur-3xl pointer-events-none" />

      {/* Center Animated Logo Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative flex flex-col items-center gap-5"
      >
        {/* Glow Ring Behind Logo */}
        <div className="relative">
          <motion.div
            animate={{
              boxShadow: [
                "0 0 20px rgba(108, 59, 255, 0.2)",
                "0 0 40px rgba(108, 59, 255, 0.35)",
                "0 0 20px rgba(108, 59, 255, 0.2)",
              ],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_12px_32px_rgba(108,59,255,0.18)] flex items-center justify-center p-3.5"
          >
            <Image
              src="/finora-icon-transparent.png"
              alt="Finora"
              width={64}
              height={64}
              priority
              className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(108,59,255,0.25)]"
            />
          </motion.div>
        </div>

        {/* Brand Text */}
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black tracking-tight text-slate-900">
            Finora
          </h2>
          <p className="text-[11px] font-medium text-slate-400 tracking-wide">
            Automated Expense Intelligence
          </p>
        </div>

        {/* Very Thin Animated Progress Bar */}
        <div className="w-36 sm:w-44 h-0.5 rounded-full bg-slate-200/80 overflow-hidden mt-1">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: "easeInOut",
            }}
            className="w-1/2 h-full rounded-full bg-gradient-to-r from-transparent via-[#6C3BFF] to-transparent"
          />
        </div>
      </motion.div>
    </div>
  );
}
