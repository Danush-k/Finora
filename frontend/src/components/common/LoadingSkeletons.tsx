"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * Common Shimmer Block with Apple Liquid Glass styling
 */
export function Shimmer({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`relative overflow-hidden bg-slate-200/60 rounded-xl ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
}

/**
 * Top Ambient Progress Bar
 */
export function TopProgressBar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] z-50 overflow-hidden bg-transparent pointer-events-none">
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: ["-100%", "0%", "100%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="h-full w-full bg-gradient-to-r from-[#6C3BFF] via-[#A78BFA] to-emerald-400 shadow-[0_0_8px_#6C3BFF]"
      />
    </div>
  );
}

/**
 * Dashboard Page Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-8 w-48 sm:w-64" />
          <Shimmer className="h-4 w-72 sm:w-96" />
        </div>
        <div className="flex items-center gap-2.5">
          <Shimmer className="h-10 w-28 rounded-2xl" />
          <Shimmer className="h-10 w-32 rounded-2xl" />
        </div>
      </div>

      {/* 4 Metric Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-3xl liquid-glass border border-slate-200/80 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-8 w-8 rounded-xl" />
            </div>
            <Shimmer className="h-8 w-36" />
            <div className="flex items-center justify-between pt-2">
              <Shimmer className="h-3.5 w-20" />
              <Shimmer className="h-3.5 w-14" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Skeleton (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl liquid-glass border border-slate-200/80 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Shimmer className="h-5 w-44" />
              <Shimmer className="h-3.5 w-60" />
            </div>
            <Shimmer className="h-8 w-48 rounded-xl" />
          </div>

          {/* Bar Chart Skeletons */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 px-4">
            {[45, 75, 30, 90, 60, 85].map((h, i) => (
              <div key={i} className="flex-1 flex items-end justify-center gap-2 h-full">
                <Shimmer
                  className="w-full max-w-[28px] rounded-t-lg"
                  style={{ height: `${h}%` }}
                />
                <Shimmer
                  className="w-full max-w-[28px] rounded-t-lg opacity-60"
                  style={{ height: `${Math.max(20, h - 25)}%` }}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <Shimmer className="h-7 w-20 rounded-xl" />
            <Shimmer className="h-4 w-36" />
            <Shimmer className="h-7 w-20 rounded-xl" />
          </div>
        </div>

        {/* Category Breakdown Skeleton (1 col) */}
        <div className="p-6 rounded-3xl liquid-glass border border-slate-200/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <Shimmer className="h-5 w-36" />
            <Shimmer className="h-7 w-24 rounded-xl" />
          </div>
          <Shimmer className="h-16 w-full rounded-2xl" />
          <div className="space-y-3.5 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Shimmer className="h-3.5 w-24" />
                  <Shimmer className="h-3.5 w-16" />
                </div>
                <Shimmer className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table Skeleton */}
      <div className="p-6 rounded-3xl liquid-glass border border-slate-200/80 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-48" />
          <Shimmer className="h-4 w-28" />
        </div>
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-slate-100/70"
            >
              <div className="flex items-center gap-3">
                <Shimmer className="h-10 w-10 rounded-2xl" />
                <div className="space-y-1.5">
                  <Shimmer className="h-4 w-36" />
                  <Shimmer className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <Shimmer className="h-4 w-20 ml-auto" />
                <Shimmer className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Transactions Page Skeleton
 */
export function TransactionsSkeleton() {
  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-8 w-44" />
          <Shimmer className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2.5">
          <Shimmer className="h-10 w-28 rounded-2xl" />
          <Shimmer className="h-10 w-32 rounded-2xl" />
        </div>
      </div>

      {/* Filters Bar Skeleton */}
      <div className="p-4 rounded-2xl liquid-glass border border-slate-200/80 flex flex-col sm:flex-row gap-3">
        <Shimmer className="h-10 flex-1 rounded-xl" />
        <Shimmer className="h-10 w-36 rounded-xl" />
        <Shimmer className="h-10 w-36 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl liquid-glass border border-slate-200/80 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between">
          <Shimmer className="h-4 w-32" />
          <Shimmer className="h-4 w-20" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shimmer className="h-9 w-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Shimmer className="h-4 w-40" />
                  <Shimmer className="h-3 w-28" />
                </div>
              </div>
              <Shimmer className="h-6 w-24 rounded-full" />
              <Shimmer className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Monthly Calendar Skeleton
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      <div className="flex items-center justify-between">
        <Shimmer className="h-8 w-48" />
        <Shimmer className="h-10 w-44 rounded-2xl" />
      </div>

      <div className="p-6 rounded-3xl liquid-glass border border-slate-200/80 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Shimmer className="h-6 w-36" />
          <div className="flex gap-2">
            <Shimmer className="h-8 w-8 rounded-xl" />
            <Shimmer className="h-8 w-8 rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <Shimmer key={i} className="h-6 w-full rounded-lg" />
          ))}
          {[...Array(35)].map((_, i) => (
            <div
              key={i}
              className="h-20 sm:h-24 p-2 rounded-2xl bg-slate-100/60 border border-slate-200/40 flex flex-col justify-between"
            >
              <Shimmer className="h-4 w-6 rounded" />
              <Shimmer className="h-3 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Debt & Lent Page Skeleton
 */
export function DebtLentSkeleton() {
  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-8 w-48" />
          <Shimmer className="h-4 w-64" />
        </div>
        <Shimmer className="h-10 w-32 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-5 rounded-3xl liquid-glass border border-slate-200/80 space-y-3">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-7 w-36" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl liquid-glass border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shimmer className="h-10 w-10 rounded-2xl" />
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-36" />
                <Shimmer className="h-3 w-28" />
              </div>
            </div>
            <Shimmer className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings Page Skeleton
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      <div className="space-y-2">
        <Shimmer className="h-8 w-40" />
        <Shimmer className="h-4 w-72" />
      </div>

      <div className="p-6 rounded-3xl liquid-glass border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <Shimmer className="h-6 w-44" />
          <Shimmer className="h-8 w-28 rounded-full" />
        </div>
        <Shimmer className="h-16 w-full rounded-2xl" />
      </div>

      <div className="p-6 rounded-3xl liquid-glass border border-slate-200/80 space-y-4">
        <Shimmer className="h-6 w-56" />
        <Shimmer className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}
