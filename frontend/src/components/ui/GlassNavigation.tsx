"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import GlassSurface from "./GlassSurface";
import SlidingTabIndicator from "./SlidingTabIndicator";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface GlassNavigationProps {
  items: NavItem[];
  activeHref: string;
  layoutId?: string;
  className?: string;
}

/**
 * Apple-inspired Floating Glass Navigation Dock optimized for iPhone 16,
 * Android screens, and Desktop displays.
 */
export function GlassNavigation({
  items,
  activeHref,
  layoutId = "finora-nav-active-pill",
  className,
}: GlassNavigationProps) {
  // Normalize path to ignore trailing slashes so /settings/ matches /settings
  const normalizePath = (p: string) => (p || "").replace(/\/+$/, "") || "/";
  const activeNormalized = normalizePath(activeHref);

  return (
    <GlassSurface
      variant="dock"
      as="nav"
      aria-label="Main application navigation"
      className={cn(
        "p-1 sm:p-1.5 flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 w-full sm:w-auto shadow-[0_16px_36px_rgba(108,59,255,0.18),0_4px_12px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {items.map((item) => {
        const isActive = activeNormalized === normalizePath(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-semibold",
              "flex items-center justify-center gap-1.5 sm:gap-2 select-none outline-none",
              "transition-colors duration-200 cursor-pointer flex-1 sm:flex-initial",
              "min-h-[42px] sm:min-h-0",
              "focus-visible:ring-2 focus-visible:ring-[#6C3BFF] focus-visible:ring-offset-2",
              !isActive && "text-[#475569] hover:text-[#0F172A] hover:bg-slate-900/[0.035]"
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {/* Continuous Apple-style sliding glossy purple glass indicator */}
            {isActive && (
              <SlidingTabIndicator
                layoutId={layoutId}
                transition={{
                  type: "spring",
                  stiffness: 190,
                  damping: 24,
                  mass: 0.9,
                }}
              />
            )}

            {/* Inner Content with Tactile Scale Feedback on Press */}
            <motion.div
              whileTap={{ scale: 0.93 }}
              transition={{ duration: 0.12 }}
              className="relative z-10 flex items-center gap-1.5 sm:gap-2"
            >
              <Icon
                className={cn(
                  "w-4 h-4 sm:w-4 sm:h-4 transition-all duration-200 shrink-0",
                  isActive
                    ? "text-white scale-105 drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]"
                    : "text-[#64748B] group-hover:text-[#0F172A]"
                )}
              />
              <span
                className={cn(
                  "tracking-tight transition-colors duration-200 text-[11px] sm:text-xs",
                  isActive
                    ? "text-white font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)] inline"
                    : "text-[#475569] font-semibold hidden md:inline"
                )}
              >
                {item.name}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </GlassSurface>
  );
}

export default GlassNavigation;
