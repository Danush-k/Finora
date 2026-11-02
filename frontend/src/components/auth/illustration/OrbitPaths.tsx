"use client";

import React from "react";
import { motion } from "framer-motion";

interface OrbitPathsProps {
  delay?: number;
}

export default function OrbitPaths({ delay = 1.8 }: OrbitPathsProps) {
  // Elliptical path definition for Orbit 1 (Upper main orbit)
  // Centered roughly at (280, 200), width ~560, height ~240
  const orbit1Path =
    "M 30,190 C 30,100 145,50 280,50 C 415,50 530,100 530,190 C 530,280 415,330 280,330 C 145,330 30,280 30,190 Z";

  // Elliptical path definition for Orbit 2 (Lower tilted orbit)
  const orbit2Path =
    "M 60,250 C 60,170 160,110 290,110 C 420,110 520,170 520,250 C 520,330 420,390 290,390 C 160,390 60,330 60,250 Z";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, delay }}
      className="absolute inset-0 pointer-events-none overflow-visible"
    >
      <svg
        viewBox="0 0 560 440"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glowing Stroke for Orbit 1 */}
          <linearGradient id="orbitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="35%" stopColor="#A78BFF" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#DDD6FE" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8F6BFF" stopOpacity="0.7" />
          </linearGradient>

          {/* Glowing Stroke for Orbit 2 */}
          <linearGradient id="orbitGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A78BFF" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#6C3BFF" stopOpacity="0.4" />
          </linearGradient>

          {/* Particle Glow Filter */}
          <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Orbit 1 Ellipse Path */}
        <path
          id="orbitPath1"
          d={orbit1Path}
          stroke="url(#orbitGrad1)"
          strokeWidth="1.6"
          strokeDasharray="500 0"
          style={{
            filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.75)) drop-shadow(0 0 16px rgba(167, 139, 255, 0.5))",
          }}
        />

        {/* Orbit 2 Ellipse Path */}
        <path
          id="orbitPath2"
          d={orbit2Path}
          stroke="url(#orbitGrad2)"
          strokeWidth="1.4"
          opacity="0.65"
          style={{
            filter: "drop-shadow(0 0 6px rgba(167, 139, 255, 0.6))",
          }}
        />

        {/* Glowing Moving Light Particle 1 on Orbit 1 */}
        <g filter="url(#particleGlow)">
          <circle cx="0" cy="0" r="5" fill="#FFFFFF">
            <animateMotion
              dur="10s"
              repeatCount="indefinite"
              path={orbit1Path}
            />
          </circle>
          <circle cx="0" cy="0" r="12" fill="rgba(167, 139, 255, 0.45)">
            <animateMotion
              dur="10s"
              repeatCount="indefinite"
              path={orbit1Path}
            />
          </circle>
        </g>

        {/* Glowing Moving Light Particle 2 on Orbit 1 (Offset) */}
        <g filter="url(#particleGlow)">
          <circle cx="0" cy="0" r="4" fill="#FFFFFF">
            <animateMotion
              dur="10s"
              begin="-5s"
              repeatCount="indefinite"
              path={orbit1Path}
            />
          </circle>
          <circle cx="0" cy="0" r="9" fill="rgba(221, 214, 254, 0.4)">
            <animateMotion
              dur="10s"
              begin="-5s"
              repeatCount="indefinite"
              path={orbit1Path}
            />
          </circle>
        </g>

        {/* Glowing Moving Light Particle 3 on Orbit 2 */}
        <g filter="url(#particleGlow)">
          <circle cx="0" cy="0" r="4.5" fill="#FFFFFF">
            <animateMotion
              dur="12s"
              begin="-3s"
              repeatCount="indefinite"
              path={orbit2Path}
            />
          </circle>
          <circle cx="0" cy="0" r="10" fill="rgba(143, 107, 255, 0.4)">
            <animateMotion
              dur="12s"
              begin="-3s"
              repeatCount="indefinite"
              path={orbit2Path}
            />
          </circle>
        </g>
      </svg>
    </motion.div>
  );
}
