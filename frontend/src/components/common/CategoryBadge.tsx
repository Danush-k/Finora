"use client";

import React from "react";
import {
  Utensils,
  ShoppingBag,
  ShoppingCart,
  Fuel,
  Zap,
  Film,
  HeartPulse,
  GraduationCap,
  LineChart,
  TrendingUp,
  Wallet,
  Coins,
  RotateCcw,
  ArrowRightLeft,
  Layers,
  LucideIcon,
} from "lucide-react";

interface CategoryMeta {
  icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  "Food & Dining": {
    icon: Utensils,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
    iconClass: "text-amber-600",
  },
  Shopping: {
    icon: ShoppingBag,
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200/80",
    iconClass: "text-rose-600",
  },
  Groceries: {
    icon: ShoppingCart,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    iconClass: "text-emerald-600",
  },
  "Travel & Fuel": {
    icon: Fuel,
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300/80",
    iconClass: "text-amber-600",
  },
  "Utilities & Bills": {
    icon: Zap,
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200/80",
    iconClass: "text-cyan-600",
  },
  Entertainment: {
    icon: Film,
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200/80",
    iconClass: "text-purple-600",
  },
  "Health & Medical": {
    icon: HeartPulse,
    badgeClass: "bg-rose-50 text-rose-900 border-rose-200/80",
    iconClass: "text-rose-600",
  },
  "Education & Fees": {
    icon: GraduationCap,
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80",
    iconClass: "text-sky-600",
  },
  Investment: {
    icon: LineChart,
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
    iconClass: "text-indigo-600",
  },
  "Investment Return": {
    icon: TrendingUp,
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
    iconClass: "text-indigo-600",
  },
  Income: {
    icon: TrendingUp,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    iconClass: "text-emerald-600",
  },
  "Salary & Income": {
    icon: Coins,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    iconClass: "text-emerald-600",
  },
  Refund: {
    icon: RotateCcw,
    badgeClass: "bg-teal-50 text-teal-800 border-teal-200/80",
    iconClass: "text-teal-600",
  },
  Transfer: {
    icon: ArrowRightLeft,
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200/80",
    iconClass: "text-blue-600",
  },
};

const DEFAULT_META: CategoryMeta = {
  icon: Layers,
  badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  iconClass: "text-slate-500",
};

interface CategoryBadgeProps {
  category?: string;
  className?: string;
}

export default function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  const name = category?.trim() || "Other";
  const meta = CATEGORY_MAP[name] || DEFAULT_META;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors shadow-2xs ${meta.badgeClass} ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.iconClass}`} />
      <span className="truncate">{name}</span>
    </span>
  );
}
