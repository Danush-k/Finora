"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "dock" | "toolbar" | "panel" | "popover" | "pill";
  children: React.ReactNode;
  as?: React.ElementType;
}

/**
 * Reusable Apple-grade Glassmorphism surface container.
 * Features translucent white backing, background saturation blur,
 * inner top specular highlight, and soft ambient shadow.
 */
export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(
  (
    {
      variant = "panel",
      as: Component = "div",
      className,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      // Floating pill dock (rounded-full, heavy saturation blur, ambient elevation)
      dock: cn(
        "rounded-full bg-white/80 backdrop-blur-[24px] saturate-[180%]",
        "border border-white/80 shadow-[0_16px_36px_-6px_rgba(15,23,42,0.08),0_4px_12px_rgba(15,23,42,0.03)]",
        "relative before:absolute before:inset-0 before:rounded-full before:pointer-events-none",
        "before:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.95)]"
      ),
      // Sticky top toolbar / header
      toolbar: cn(
        "bg-white/78 backdrop-blur-[24px] saturate-[180%]",
        "border-b border-slate-200/70 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)]",
        "relative before:absolute before:inset-0 before:pointer-events-none",
        "before:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.85)]"
      ),
      // Floating modal / panel
      panel: cn(
        "rounded-2xl bg-white/82 backdrop-blur-[24px] saturate-[180%]",
        "border border-white/85 shadow-[0_20px_45px_-10px_rgba(15,23,42,0.09),0_6px_16px_rgba(15,23,42,0.04)]",
        "relative before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none",
        "before:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.95)]"
      ),
      // Compact dropdown or popover
      popover: cn(
        "rounded-xl bg-white/88 backdrop-blur-[20px] saturate-[180%]",
        "border border-slate-200/80 shadow-[0_12px_28px_-4px_rgba(15,23,42,0.08)]",
        "relative before:absolute before:inset-0 before:rounded-xl before:pointer-events-none",
        "before:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]"
      ),
      // Small rounded pill
      pill: cn(
        "rounded-full bg-white/75 backdrop-blur-[20px] saturate-[180%]",
        "border border-white/80 shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
        "relative before:absolute before:inset-0 before:rounded-full before:pointer-events-none",
        "before:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]"
      ),
    };

    return (
      <Component
        ref={ref}
        className={cn(variantStyles[variant], className)}
        style={{
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          ...style,
        }}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassSurface.displayName = "GlassSurface";

export default GlassSurface;
