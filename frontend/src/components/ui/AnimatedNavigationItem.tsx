"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AnimatedNavigationItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  children: React.ReactNode;
  activeClassName?: string;
  inactiveClassName?: string;
}

/**
 * Interactive navigation button with Apple-grade tactile press response,
 * subtle surface elevation on hover, and accessible focus outlines.
 */
export const AnimatedNavigationItem = React.forwardRef<HTMLButtonElement, AnimatedNavigationItemProps>(
  (
    {
      isActive = false,
      children,
      className,
      activeClassName = "text-white font-semibold",
      inactiveClassName = "text-[#475569] hover:text-[#0F172A] hover:bg-slate-900/[0.04]",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={disabled ? undefined : { scale: 0.95 }}
        whileHover={disabled ? undefined : { y: -0.5 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        disabled={disabled}
        className={cn(
          "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium",
          "select-none cursor-pointer outline-none transition-colors duration-150",
          "focus-visible:ring-2 focus-visible:ring-[#6C3BFF] focus-visible:ring-offset-2",
          isActive ? activeClassName : inactiveClassName,
          className
        )}
        {...(props as any)}
      >
        {children}
      </motion.button>
    );
  }
);

AnimatedNavigationItem.displayName = "AnimatedNavigationItem";

export default AnimatedNavigationItem;
