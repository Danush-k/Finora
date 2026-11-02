"use client";

import React from "react";
import { getCategoryTheme } from "@/lib/category-theme";

interface CategoryBadgeProps {
  category?: string;
  className?: string;
}

export default function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  const theme = getCategoryTheme(category);
  const Icon = theme.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors shadow-2xs ${theme.badgeClass} ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${theme.iconClass}`} />
      <span className="truncate">{theme.name}</span>
    </span>
  );
}
