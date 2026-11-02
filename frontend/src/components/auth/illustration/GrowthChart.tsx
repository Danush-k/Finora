"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface GrowthChartProps {
  delay?: number;
}

export default function GrowthChart({ delay = 0.8 }: GrowthChartProps) {
  // Stagger points coordinates along the growth path
  const points = [
    { x: 115, y: 155, delay: delay + 0.3 },
    { x: 175, y: 162, delay: delay + 0.5 },
    { x: 240, y: 105, delay: delay + 0.7 },
    { x: 305, y: 122, delay: delay + 0.9 },
    { x: 365, y: 75, delay: delay + 1.1 },
    { x: 440, y: 28, delay: delay + 1.3 }, // Peak
  ];

  const curvePath =
    "M 40,205 C 75,185 90,165 115,155 C 140,145 155,162 175,162 C 205,162 218,115 240,105 C 265,95 285,122 305,122 C 330,122 345,90 365,75 C 395,52 418,36 440,28";

  const areaPath = `${curvePath} L 440,245 L 40,245 Z`;

  // State to trigger loop every 6.5 seconds
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCycleKey((prev) => prev + 1);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[210px] select-none pointer-events-none">
      <svg
        viewBox="0 0 490 260"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Grid Pattern / Lines */}
          <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C3BFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#6C3BFF" stopOpacity="0.02" />
          </linearGradient>

          {/* Area Fill Gradient under the curve (Soft Luminous Blend) */}
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C3BFF" stopOpacity="0.22" />
            <stop offset="50%" stopColor="#A78BFF" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </linearGradient>

          {/* Glowing Stroke Gradient */}
          <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#A78BFF" />
            <stop offset="40%" stopColor="#8F6BFF" />
            <stop offset="85%" stopColor="#6C3BFF" />
            <stop offset="100%" stopColor="#5228E0" />
          </linearGradient>

          {/* Vertical Light Shaft below peak */}
          <linearGradient id="shaftGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C3BFF" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#6C3BFF" stopOpacity="0.0" />
          </linearGradient>

          {/* Glowing Filter */}
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="pulseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#6C3BFF" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Subtle Horizontal & Vertical Background Grid Lines */}
        <g stroke="url(#gridGrad)" strokeWidth="1" strokeDasharray="3 3">
          <line x1="40" y1="80" x2="460" y2="80" />
          <line x1="40" y1="135" x2="460" y2="135" />
          <line x1="40" y1="190" x2="460" y2="190" />
          <line x1="40" y1="245" x2="460" y2="245" />

          <line x1="115" y1="50" x2="115" y2="245" />
          <line x1="175" y1="50" x2="175" y2="245" />
          <line x1="240" y1="50" x2="240" y2="245" />
          <line x1="305" y1="50" x2="305" y2="245" />
          <line x1="365" y1="50" x2="365" y2="245" />
          <line x1="440" y1="28" x2="440" y2="245" />
        </g>

        {/* Vertical Light Shaft connecting peak to baseline */}
        <rect
          x="430"
          y="28"
          width="20"
          height="217"
          fill="url(#shaftGradient)"
          rx="10"
        />

        {/* Translucent Area Fill under the curve */}
        <motion.path
          key={`area-${cycleKey}`}
          d={areaPath}
          fill="url(#areaGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 1.4,
            delay: delay + 0.3,
            ease: "easeOut",
          }}
        />

        {/* Animated Gradient Stroke Curve */}
        <motion.path
          key={`curve-${cycleKey}`}
          d={curvePath}
          stroke="url(#strokeGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#glowFilter)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 1.8,
            delay: delay,
            ease: [0.16, 1, 0.3, 1],
          }}
        />

        {/* Data Points Along the Path */}
        {points.slice(0, 5).map((pt, i) => (
          <motion.g
            key={`pt-${cycleKey}-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: pt.delay,
              type: "spring",
              stiffness: 300,
              damping: 18,
            }}
          >
            {/* Outer halo */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="7"
              fill="rgba(108, 59, 255, 0.15)"
            />
            {/* Main white circle */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill="#FFFFFF"
              stroke="#8F6BFF"
              strokeWidth="2.5"
            />
            {/* Center purple core */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="1.8"
              fill="#6C3BFF"
            />
          </motion.g>
        ))}

        {/* THE PEAK DATA POINT WITH CONCENTRIC EXPANDING RIPPLES & GLOW */}
        <motion.g
          key={`peak-${cycleKey}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: points[5].delay,
            type: "spring",
            stiffness: 280,
            damping: 16,
          }}
        >
          {/* Continuous Pulsing Wave 1 */}
          <motion.circle
            cx="440"
            cy="28"
            r="16"
            fill="none"
            stroke="#8F6BFF"
            strokeWidth="2"
            animate={{
              r: [12, 34],
              opacity: [0.85, 0],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />

          {/* Continuous Pulsing Wave 2 */}
          <motion.circle
            cx="440"
            cy="28"
            r="10"
            fill="rgba(108, 59, 255, 0.18)"
            stroke="#6C3BFF"
            strokeWidth="2.5"
            animate={{
              r: [8, 22],
              opacity: [0.95, 0.1],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: 0.8,
              ease: "easeOut",
            }}
          />

          {/* Static Concentric Inner Ring */}
          <circle
            cx="440"
            cy="28"
            r="12"
            fill="rgba(255, 255, 255, 0.85)"
            stroke="#6C3BFF"
            strokeWidth="2.5"
            filter="url(#pulseGlow)"
          />

          {/* Solid White Disc */}
          <circle
            cx="440"
            cy="28"
            r="7"
            fill="#FFFFFF"
            stroke="#5228E0"
            strokeWidth="2.5"
          />

          {/* Center Violet Dot */}
          <circle cx="440" cy="28" r="3.2" fill="#6C3BFF" />

          {/* GLOWING UPWARD GROWTH ARROW BEACON */}
          <motion.g
            animate={{
              y: [-1, -6, -1],
              opacity: [0.85, 1, 0.85],
            }}
            transition={{
              duration: 2.0,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Glowing Arrow Path above peak */}
            <path
              d="M 436,8 L 440,2 L 444,8 M 440,3 L 440,14"
              stroke="#22C55E"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 6px rgba(34, 197, 94, 0.8))"
            />
            {/* Glowing circular halo */}
            <circle
              cx="440"
              cy="8"
              r="8"
              fill="rgba(34, 197, 94, 0.15)"
              className="animate-pulse"
            />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}
