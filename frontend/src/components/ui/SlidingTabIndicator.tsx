"use client";

import React from "react";
import { motion, Transition } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SlidingTabIndicatorProps {
  /** Shared layoutId across tabs in the same group */
  layoutId: string;
  /** Custom styles for the active sliding pill */
  className?: string;
  /** Optional custom transition */
  transition?: Transition;
}

/**
 * Apple-style spring-based sliding indicator for navigation and tab bars.
 * Glides smoothly as one continuous physical element between active items using Framer Motion's layoutId.
 * Features a translucent glossy purple glass finish with top-edge reflective highlight,
 * inner specular bevel, and soft purple ambient shadows.
 */
export function SlidingTabIndicator({
  layoutId,
  className,
  transition = {
    type: "spring",
    stiffness: 190, // Calibrated for smooth, visible gliding across tabs without snapping too fast
    damping: 24,
    mass: 0.9,
  },
}: SlidingTabIndicatorProps) {
  return (
    <motion.div
      layoutId={layoutId}
      transition={transition}
      className={cn("absolute inset-0 rounded-full pointer-events-none z-0", className)}
    >
      <div
        className="w-full h-full rounded-full btn-primary active-navigation overflow-hidden"
        style={{
          backgroundColor: "#6C3BFF",
          background: "linear-gradient(135deg, #8F6BFF 0%, #7547F5 45%, #5228E0 100%)",
          border: "1px solid rgba(255, 255, 255, 0.32)",
          boxShadow:
            "0 4px 14px rgba(108, 59, 255, 0.28), 0 8px 22px rgba(82, 40, 224, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.42), inset 0 -1px 0 rgba(255, 255, 255, 0.12)",
        }}
      />
    </motion.div>
  );
}

export default SlidingTabIndicator;
