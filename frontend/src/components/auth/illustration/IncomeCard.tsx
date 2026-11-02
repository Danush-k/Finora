"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface IncomeCardProps {
  delay?: number;
}

export default function IncomeCard({ delay = 1.1 }: IncomeCardProps) {
  return (
    <motion.div
      initial={{ x: -40, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      transition={{
        duration: 0.85,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="absolute -left-6 top-[38%] z-20 select-none"
    >
      <div className="animate-float-income hover:scale-105 transition-transform duration-300">
        <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-emerald-100/90 shadow-[0_16px_36px_rgba(22,163,74,0.09),0_4px_12px_rgba(15,23,42,0.03)]">
          {/* Green Circle with Animated Glowing Up Arrow */}
          <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] shadow-sm overflow-hidden group">
            {/* Ambient green pulse aura */}
            <div className="absolute inset-0 bg-[#22C55E]/15 rounded-full animate-ping opacity-30" />

            <div className="relative z-10 animate-arrow-glow-up">
              <ArrowUpRight className="w-5 h-5 text-[#16A34A] stroke-[2.75]" />
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col pr-1">
            <span className="text-[12px] font-semibold text-[#64748B] tracking-wide">
              Income
            </span>
            <span className="text-[17px] font-extrabold text-[#0F172A] tracking-tight">
              ₹1,20,000
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
