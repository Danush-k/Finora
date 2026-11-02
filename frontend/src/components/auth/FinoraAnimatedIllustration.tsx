"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GrowthChart from "./illustration/GrowthChart";
import OrbitPaths from "./illustration/OrbitPaths";
import IncomeCard from "./illustration/IncomeCard";
import ExpensesCard from "./illustration/ExpensesCard";
import FinoraTile from "./illustration/FinoraTile";
import MicroCards from "./illustration/MicroCards";

interface FinoraAnimatedIllustrationProps {
  className?: string;
}

export default function FinoraAnimatedIllustration({
  className = "",
}: FinoraAnimatedIllustrationProps) {
  // Animated Counter for Total Balance: 0 -> 2,48,750
  const [balance, setBalance] = useState<number>(0);
  const targetBalance = 248750;

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      const duration = 1200;
      const startTime = performance.now();

      const animateCounter = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setBalance(Math.floor(easeOut * targetBalance));

        if (progress < 1) {
          requestAnimationFrame(animateCounter);
        } else {
          setBalance(targetBalance);
        }
      };

      requestAnimationFrame(animateCounter);
    }, 500);

    return () => clearTimeout(startTimeout);
  }, []);

  return (
    <div
      className={`relative w-full max-w-[580px] h-[480px] sm:h-[520px] flex items-center justify-center select-none ${className}`}
      style={{ perspective: "1200px" }}
    >
      {/* Ambient Center Glow */}
      <div className="absolute inset-0 bg-[#6C3BFF]/12 rounded-full blur-3xl pointer-events-none transform -translate-y-4 scale-95" />

      {/* 3D Luminous Elliptical Orbit Paths */}
      <OrbitPaths delay={1.4} />

      {/* ========================================================= */}
      {/* CENTRAL 3D GLASS DASHBOARD BOX WITH BROAD BEVELED EDGES   */}
      {/* ========================================================= */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.9,
          delay: 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="relative z-10 w-[94%] sm:w-[515px]"
      >
        <div className="animate-float-dashboard">
          {/* Tangible 3D Box Construction */}
          <div className="relative group">
            {/* 1. Physical 3D Extrusion Bevel (broad lower-right slab thickness) */}
            <div
              className="absolute inset-0 translate-y-3.5 translate-x-1.5 rounded-[36px] bg-gradient-to-br from-[#DDD6FE]/80 via-[#A78BFF]/50 to-[#6C3BFF]/40 border-b-[5px] border-r-[3.5px] border-[#DDD6FE]/90 shadow-[0_32px_75px_rgba(108,59,255,0.32),0_12px_28px_rgba(82,40,224,0.18)] -z-10"
              style={{
                transform: "translateZ(-16px)",
              }}
            />

            {/* 2. Front 3D Frosted Translucent Glass Surface with Broad Borders */}
            <div
              className="relative rounded-[36px] bg-white/75 backdrop-blur-2xl border-[2.75px] border-white/95 p-6 sm:p-8 overflow-hidden transition-all duration-300"
              style={{
                boxShadow:
                  "inset 0 2px 4px 0 rgba(255, 255, 255, 1), inset 0 -4px 8px 0 rgba(108, 59, 255, 0.12), inset 3px 0 5px 0 rgba(255, 255, 255, 0.9), inset -3px 0 5px 0 rgba(167, 139, 255, 0.16), 0 16px 36px -8px rgba(108, 59, 255, 0.14), 0 4px 12px rgba(15, 23, 42, 0.04)",
              }}
            >
              {/* Broad Specular Rim Sheen on Top of Glass */}
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/70 via-white/25 to-transparent pointer-events-none rounded-t-[36px]" />

              {/* Diagonal Light Glint Reflection */}
              <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/18 to-transparent rotate-45 pointer-events-none" />

              {/* Soft purple corner tint inside glass */}
              <div className="absolute -top-12 -right-12 w-44 h-44 bg-[#8F6BFF]/15 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header: Total Balance + Growth Pill */}
              <div className="relative z-10 flex items-start justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-[13px] sm:text-[14px] font-semibold text-[#64748B] tracking-wide mb-1">
                    Total Balance
                  </span>
                  <span className="text-[28px] sm:text-[34px] font-black text-[#0F172A] tracking-tight tabular-nums">
                    ₹{balance.toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Growth Indicator Pill Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] shadow-sm text-[#16A34A] text-xs sm:text-sm font-bold tracking-tight"
                >
                  <span className="text-base leading-none">↑</span>
                  <span>+7.2%</span>
                </motion.div>
              </div>

              {/* SVG Financial Growth Graph */}
              <div className="relative z-10 mt-1">
                <GrowthChart delay={0.8} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Income Card (Left side) */}
      <IncomeCard delay={1.1} />

      {/* Floating Expenses Card (Right side) */}
      <ExpensesCard delay={1.3} />

      {/* Central Finora 3D App Icon Tile (Front & Center) */}
      <FinoraTile delay={1.5} />

      {/* Supporting Financial Icons (Analytics Bar Chart & Distribution Pie Chart) */}
      <MicroCards delay={1.65} />
    </div>
  );
}
