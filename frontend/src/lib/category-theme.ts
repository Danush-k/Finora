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
  Coins,
  RotateCcw,
  ArrowRightLeft,
  Tag,
  Layers,
  LucideIcon,
} from "lucide-react";

export interface CategoryTheme {
  name: string;
  icon: LucideIcon;
  hexColor: string;
  gradient: string;
  badgeClass: string;
  iconClass: string;
  dotClass: string;
  bgLight: string;
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  "Food & Dining": {
    name: "Food & Dining",
    icon: Utensils,
    hexColor: "#F59E0B", // Amber
    gradient: "from-amber-400 to-amber-600",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    iconClass: "text-amber-600",
    dotClass: "bg-amber-500",
    bgLight: "bg-amber-50",
  },
  Shopping: {
    name: "Shopping",
    icon: ShoppingBag,
    hexColor: "#8B5CF6", // Royal Violet (clearly distinct from pink and blue)
    gradient: "from-violet-500 to-purple-600",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    iconClass: "text-purple-600",
    dotClass: "bg-purple-500",
    bgLight: "bg-purple-50",
  },
  Groceries: {
    name: "Groceries",
    icon: ShoppingCart,
    hexColor: "#10B981", // Mint Emerald
    gradient: "from-emerald-400 to-teal-600",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    iconClass: "text-emerald-600",
    dotClass: "bg-emerald-500",
    bgLight: "bg-emerald-50",
  },
  "Travel & Fuel": {
    name: "Travel & Fuel",
    icon: Fuel,
    hexColor: "#0284C7", // Ocean Blue
    gradient: "from-sky-500 to-blue-600",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    iconClass: "text-sky-600",
    dotClass: "bg-sky-500",
    bgLight: "bg-sky-50",
  },
  "Utilities & Bills": {
    name: "Utilities & Bills",
    icon: Zap,
    hexColor: "#06B6D4", // Bright Cyan
    gradient: "from-cyan-400 to-teal-500",
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200",
    iconClass: "text-cyan-600",
    dotClass: "bg-cyan-500",
    bgLight: "bg-cyan-50",
  },
  Entertainment: {
    name: "Entertainment",
    icon: Film,
    hexColor: "#F43F5E", // Sunset Coral / Rose
    gradient: "from-rose-400 to-pink-600",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    iconClass: "text-rose-600",
    dotClass: "bg-rose-500",
    bgLight: "bg-rose-50",
  },
  "Health & Medical": {
    name: "Health & Medical",
    icon: HeartPulse,
    hexColor: "#D946EF", // Vivid Magenta
    gradient: "from-fuchsia-400 to-pink-600",
    badgeClass: "bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200",
    iconClass: "text-fuchsia-600",
    dotClass: "bg-fuchsia-500",
    bgLight: "bg-fuchsia-50",
  },
  "Education & Fees": {
    name: "Education & Fees",
    icon: GraduationCap,
    hexColor: "#6366F1", // Indigo
    gradient: "from-indigo-400 to-blue-600",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    iconClass: "text-indigo-600",
    dotClass: "bg-indigo-500",
    bgLight: "bg-indigo-50",
  },
  Investment: {
    name: "Investment",
    icon: LineChart,
    hexColor: "#0D9488", // Deep Teal
    gradient: "from-teal-400 to-emerald-600",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
    iconClass: "text-teal-600",
    dotClass: "bg-teal-500",
    bgLight: "bg-teal-50",
  },
  "Salary & Income": {
    name: "Salary & Income",
    icon: Coins,
    hexColor: "#16A34A", // Lush Green
    gradient: "from-green-500 to-emerald-600",
    badgeClass: "bg-green-50 text-green-800 border-green-200",
    iconClass: "text-green-600",
    dotClass: "bg-green-500",
    bgLight: "bg-green-50",
  },
  Income: {
    name: "Income",
    icon: Coins,
    hexColor: "#16A34A",
    gradient: "from-green-500 to-emerald-600",
    badgeClass: "bg-green-50 text-green-800 border-green-200",
    iconClass: "text-green-600",
    dotClass: "bg-green-500",
    bgLight: "bg-green-50",
  },
  Refund: {
    name: "Refund",
    icon: RotateCcw,
    hexColor: "#0F766E", // Pine
    gradient: "from-emerald-500 to-teal-700",
    badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300",
    iconClass: "text-emerald-700",
    dotClass: "bg-emerald-600",
    bgLight: "bg-emerald-50",
  },
  Transfer: {
    name: "Transfer",
    icon: ArrowRightLeft,
    hexColor: "#475569", // Slate
    gradient: "from-slate-400 to-slate-600",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
    iconClass: "text-slate-600",
    dotClass: "bg-slate-500",
    bgLight: "bg-slate-100",
  },
  Other: {
    name: "Other",
    icon: Tag,
    hexColor: "#64748B", // Cool Slate
    gradient: "from-slate-400 to-indigo-500",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    iconClass: "text-slate-600",
    dotClass: "bg-slate-400",
    bgLight: "bg-slate-100",
  },
};

export const DEFAULT_CATEGORY_THEME: CategoryTheme = {
  name: "Other",
  icon: Tag,
  hexColor: "#64748B",
  gradient: "from-slate-400 to-indigo-500",
  badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  iconClass: "text-slate-600",
  dotClass: "bg-slate-400",
  bgLight: "bg-slate-100",
};

export function getCategoryTheme(category?: string): CategoryTheme {
  if (!category) return DEFAULT_CATEGORY_THEME;
  const trimmed = category.trim();
  return CATEGORY_THEMES[trimmed] || DEFAULT_CATEGORY_THEME;
}
