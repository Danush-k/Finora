"use client";

import React from "react";
import { motion } from "framer-motion";

interface MicroCardsProps {
  delay?: number;
}

export default function MicroCards({ delay = 1.6 }: MicroCardsProps) {
  return (
    <>
      {/* Left Micro Card: Analytics Bar Chart */}
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          duration: 0.75,
          delay: delay,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute left-[20%] bottom-8 z-20 select-none"
      >
        <div className="animate-float-chip-left hover:scale-110 transition-transform duration-300">
          <div className="w-14 h-14 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_12px_28px_rgba(108,59,255,0.14),0_2px_8px_rgba(15,23,42,0.04)] flex items-center justify-center p-3">
            {/* Custom 3-Bar Chart SVG Icon representing Income (green), Expense (red), and Growth (purple) */}
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="14"
                width="4"
                height="7"
                rx="1.5"
                fill="#16A34A"
              />
              <rect
                x="10"
                y="9"
                width="4"
                height="12"
                rx="1.5"
                fill="#EF4444"
              />
              <rect
                x="17"
                y="4"
                width="4"
                height="17"
                rx="1.5"
                fill="#6C3BFF"
              />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Right Micro Card: Expense Distribution Pie Chart */}
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          duration: 0.75,
          delay: delay + 0.15,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute right-[22%] bottom-10 z-20 select-none"
      >
        <div className="animate-float-chip-right hover:scale-110 transition-transform duration-300">
          <div className="w-14 h-14 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_12px_28px_rgba(108,59,255,0.14),0_2px_8px_rgba(15,23,42,0.04)] flex items-center justify-center p-3">
            {/* Custom Pie Chart SVG Icon matching reference */}
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 11.45 21.96 10.91 21.88 10.38H13V2.12C12.47 2.04 11.93 2 12 2Z"
                fill="#8F6BFF"
              />
              <path
                d="M15 2.5V8.5H21C20.45 5.56 18.06 3.17 15 2.5Z"
                fill="#6C3BFF"
              />
            </svg>
          </div>
        </div>
      </motion.div>
    </>
  );
}
