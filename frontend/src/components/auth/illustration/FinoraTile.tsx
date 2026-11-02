"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface FinoraTileProps {
  delay?: number;
}

export default function FinoraTile({ delay = 1.4 }: FinoraTileProps) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{
        duration: 0.9,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="absolute left-[36%] bottom-1 z-30 select-none"
    >
      <div className="relative group animate-float-app-icon">
        {/* Deep Ambient Floor Glow Underneath */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-28 h-10 bg-[#6C3BFF]/45 rounded-full blur-xl pointer-events-none transform scale-y-50" />

        {/* 3D Elevated Tile Container */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] p-1 bg-gradient-to-b from-white/60 via-[#DDD6FE]/40 to-[#6C3BFF]/30 backdrop-blur-md shadow-[0_26px_50px_rgba(108,59,255,0.42),0_6px_16px_rgba(82,40,224,0.35)] transition-transform duration-300 hover:scale-105">
          {/* Beveled Rim highlight */}
          <div className="relative w-full h-full rounded-[26px] overflow-hidden bg-gradient-to-br from-[#8F6BFF] via-[#6C3BFF] to-[#5228E0] p-3 flex items-center justify-center shadow-inner">
            {/* Top specular reflection sheen */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-[26px] pointer-events-none" />

            {/* Official Transparent Finora Icon */}
            <div className="relative w-full h-full">
              <Image
                src="/finora-icon-transparent.png"
                alt="Finora 3D Icon"
                fill
                priority
                className="object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)] filter"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
