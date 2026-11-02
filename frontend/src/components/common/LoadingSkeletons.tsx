"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Enterprise Shimmer Element
 * Features soft lavender & slate gradient with 1.6s smooth easing
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
      className={cn("shimmer-skeleton rounded-lg", className)}
    />
  );
}

/**
 * Top Hairline Indeterminate Progress Bar
 */
export function TopProgressBar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] z-50 overflow-hidden bg-purple-50/50 pointer-events-none">
      <div className="w-1/2 h-full bg-gradient-to-r from-[#8F6BFF] via-[#7547F5] to-[#5228E0] rounded-full animate-indeterminate-bar shadow-[0_0_8px_rgba(117,71,245,0.5)]" />
    </div>
  );
}

/**
 * 1. Horizontal Financial Metrics Ribbon Skeleton
 * Matches exact dimensions, 4-column layout, and purple divider lines of HorizontalMetricsBar
 */
export function HorizontalMetricsBarSkeleton() {
  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-md border border-purple-100 shadow-xs select-none">
      <div className="grid grid-cols-2 lg:grid-cols-4 items-center">
        {[...Array(4)].map((_, idx) => (
          <div
            key={idx}
            className="relative flex flex-col justify-center px-4 py-3 sm:px-6 sm:py-3.5"
          >
            {/* Metric Title & Icon */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <Shimmer className="w-3.5 h-3.5 rounded-md" />
              <Shimmer className="h-3 w-20 rounded" />
            </div>

            {/* Numerical Value Line */}
            <div className="flex items-baseline pt-0.5">
              <Shimmer className="h-6 sm:h-7 w-28 sm:w-36 rounded-md" />
            </div>

            {/* Centered Purple Separation Line (Desktop) */}
            {idx < 3 && (
              <div
                aria-hidden="true"
                className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-7 w-[1.5px] bg-[#6C3BFF]/20 rounded-full pointer-events-none"
              />
            )}

            {/* Centered Purple Separation Line (Mobile Col 1) */}
            {(idx === 0 || idx === 2) && (
              <div
                aria-hidden="true"
                className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 h-7 w-[1.5px] bg-[#6C3BFF]/20 rounded-full pointer-events-none"
              />
            )}

            {/* Centered Purple Horizontal Divider (Mobile) */}
            {idx < 2 && (
              <div
                aria-hidden="true"
                className="lg:hidden absolute bottom-0 left-4 right-4 h-[1px] bg-[#6C3BFF]/15 pointer-events-none"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 2. Inflow vs Outflow Chart Skeleton
 * Accurately models the chart header, segmented period toggle, and 6 realistic bar pairs
 */
export function ChartSkeleton() {
  return (
    <div className="rounded-3xl liquid-glass border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shimmer className="w-6 h-6 rounded-lg" />
          <Shimmer className="h-5 w-36 sm:w-44 rounded-md" />
          <Shimmer className="h-5 w-16 rounded-full" />
        </div>

        {/* Static Segmented Control Placeholder (Monthly | Weekly | Yearly) */}
        <div className="shrink-0 w-[188px] h-8 rounded-xl bg-slate-100/90 border border-slate-200/80 p-0.5 flex items-center justify-between gap-1">
          <Shimmer className="h-full flex-1 rounded-lg" />
          <Shimmer className="h-full flex-1 rounded-lg" />
          <Shimmer className="h-full flex-1 rounded-lg" />
        </div>
      </div>

      {/* Realistic Bar Chart Columns */}
      <div className="w-full h-64 sm:h-72 flex items-end justify-between gap-2.5 sm:gap-4 pt-6 px-3 sm:px-6">
        {[
          { in: 55, out: 88 },
          { in: 30, out: 32 },
          { in: 40, out: 38 },
          { in: 44, out: 65 },
          { in: 72, out: 82 },
          { in: 25, out: 28 },
        ].map((bar, i) => (
          <div key={i} className="flex-1 flex items-end justify-center gap-1.5 sm:gap-2 h-full">
            {/* Inflow bar */}
            <Shimmer
              className="w-full max-w-[24px] sm:max-w-[32px] rounded-t-lg"
              style={{ height: `${bar.in}%` }}
            />
            {/* Outflow bar */}
            <Shimmer
              className="w-full max-w-[24px] sm:max-w-[32px] rounded-t-lg opacity-75"
              style={{ height: `${bar.out}%` }}
            />
          </div>
        ))}
      </div>

      {/* Bottom Timeline Controls Placeholder */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100/80">
        <Shimmer className="h-7 w-20 rounded-xl" />
        <Shimmer className="h-4 w-36 rounded-md" />
        <Shimmer className="h-7 w-20 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * 3. Expense by Category Skeleton
 * Models title, limits action, monthly budget progress bar, and category breakdown rows
 */
export function CategoryBreakdownSkeleton() {
  return (
    <div className="rounded-3xl liquid-glass p-5 sm:p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs space-y-4">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Shimmer className="w-7 h-7 rounded-xl" />
            <Shimmer className="h-4 w-36 rounded-md" />
          </div>
          <Shimmer className="h-7 w-16 rounded-lg" />
        </div>

        {/* Overall Monthly Budget Block */}
        <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border border-indigo-100/60 space-y-2">
          <div className="flex justify-between items-center">
            <Shimmer className="h-3.5 w-24 rounded" />
            <Shimmer className="h-3.5 w-28 rounded" />
          </div>
          <Shimmer className="h-1.5 w-full rounded-full" />
          <div className="flex justify-between items-center">
            <Shimmer className="h-3 w-20 rounded" />
            <Shimmer className="h-3 w-16 rounded" />
          </div>
        </div>

        {/* 4 Realistic Category Breakdown Rows */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5 p-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Shimmer className="w-5 h-5 rounded-md" />
                  <Shimmer className="h-3.5 w-24 rounded" />
                </div>
                <Shimmer className="h-3.5 w-16 rounded" />
              </div>
              <Shimmer className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <Shimmer className="h-3 w-28 rounded" />
        <Shimmer className="h-3 w-24 rounded" />
      </div>
    </div>
  );
}

/**
 * 4. Recent Transactions Skeleton
 * Accurately models the 2-level compact mobile row and single-line desktop row
 */
export function RecentTransactionsSkeleton() {
  return (
    <div className="w-full rounded-2xl liquid-glass p-5 border border-slate-200/80 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Shimmer className="h-4 w-40 rounded-md" />
        <Shimmer className="h-4 w-16 rounded-md" />
      </div>

      {/* 5 Transaction Row Placeholders */}
      <div className="divide-y divide-slate-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="py-3 px-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Shimmer className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Shimmer className="h-3.5 w-32 sm:w-48 rounded" />
                <Shimmer className="h-2.5 w-48 sm:w-64 rounded" />
              </div>
            </div>
            <div className="shrink-0 text-right space-y-1">
              <Shimmer className="h-4 w-16 sm:w-20 rounded ml-auto" />
              <Shimmer className="h-2.5 w-10 rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Complete Full Dashboard Skeleton
 * Preserves exact layout dimensions, card spacing, and component hierarchy
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6 pb-32 sm:pb-24 animate-fadeIn">
      {/* Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <Shimmer className="h-7 w-48 rounded-lg" />
          <Shimmer className="h-3.5 w-64 rounded" />
        </div>
        <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto">
          <Shimmer className="h-8.5 sm:h-9 px-3 rounded-xl w-full sm:w-28" />
          <Shimmer className="h-8.5 sm:h-9 px-3 rounded-xl w-full sm:w-28" />
          <Shimmer className="h-8.5 sm:h-9 px-3 rounded-xl w-full sm:w-28" />
        </div>
      </div>

      {/* 1. Horizontal Financial Ribbon */}
      <HorizontalMetricsBarSkeleton />

      {/* 2. Main Chart & Category Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2">
          <ChartSkeleton />
        </div>
        <div className="lg:col-span-1">
          <CategoryBreakdownSkeleton />
        </div>
      </div>

      {/* 3. Quick Access Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-3xl liquid-glass border border-slate-200/80 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <Shimmer className="w-10 h-10 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-36 rounded" />
                <Shimmer className="h-3 w-48 rounded" />
              </div>
            </div>
            <Shimmer className="h-8 w-28 rounded-xl shrink-0" />
          </div>
        ))}
      </div>

      {/* 4. Recent Transactions Skeleton */}
      <RecentTransactionsSkeleton />
    </div>
  );
}

/**
 * Transactions Page Table Skeleton
 */
export function TransactionsSkeleton() {
  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Shimmer className="h-7 w-44 rounded-lg" />
          <Shimmer className="h-3.5 w-60 rounded" />
        </div>
        <div className="flex items-center gap-2.5">
          <Shimmer className="h-9 w-28 rounded-xl" />
          <Shimmer className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Filters Bar Skeleton */}
      <div className="p-3 sm:p-4 rounded-2xl liquid-glass border border-slate-200/80 space-y-2.5 sm:space-y-3">
        <div className="flex gap-2">
          <Shimmer className="h-9 sm:h-10 flex-1 rounded-xl" />
          <Shimmer className="h-9 sm:h-10 w-24 rounded-xl" />
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <Shimmer className="h-7 w-64 rounded-xl" />
          <Shimmer className="h-7 w-32 rounded-lg" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl liquid-glass border border-slate-200/80 overflow-hidden min-h-[460px]">
        <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex justify-between">
          <Shimmer className="h-3.5 w-32 rounded" />
          <Shimmer className="h-3.5 w-20 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-3.5 flex items-center justify-between gap-4">
              <Shimmer className="h-4 w-20 rounded" />
              <div className="flex items-center gap-2.5 flex-1">
                <Shimmer className="w-7 h-7 rounded-lg shrink-0" />
                <Shimmer className="h-4 w-36 rounded" />
              </div>
              <Shimmer className="h-5 w-24 rounded-md" />
              <Shimmer className="h-4 w-16 rounded" />
              <Shimmer className="h-4 w-24 rounded" />
              <Shimmer className="h-4 w-20 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Monthly Cashflow Calendar Skeleton
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-6 pb-28 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Shimmer className="h-7 w-48 rounded-lg" />
          <Shimmer className="h-3.5 w-60 rounded" />
        </div>
        <Shimmer className="h-9 w-36 rounded-xl" />
      </div>

      <div className="p-4 sm:p-6 rounded-3xl liquid-glass-elevated border border-slate-200/90 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Shimmer className="h-6 w-36 rounded" />
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
              className="h-20 sm:h-24 p-2 rounded-2xl bg-slate-50/60 border border-slate-200/40 flex flex-col justify-between"
            >
              <Shimmer className="h-3.5 w-6 rounded" />
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
        <div className="space-y-1.5">
          <Shimmer className="h-7 w-48 rounded-lg" />
          <Shimmer className="h-3.5 w-56 rounded" />
        </div>
        <Shimmer className="h-9 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-5 rounded-3xl liquid-glass border border-slate-200/80 space-y-2">
            <Shimmer className="h-3.5 w-24 rounded" />
            <Shimmer className="h-6 w-36 rounded-md" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-2xl liquid-glass border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shimmer className="h-9 w-9 rounded-xl shrink-0" />
              <div className="space-y-1.5">
                <Shimmer className="h-4 w-36 rounded" />
                <Shimmer className="h-3 w-24 rounded" />
              </div>
            </div>
            <Shimmer className="h-6 w-20 rounded-md" />
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
      {/* Page Title */}
      <div className="space-y-1.5">
        <Shimmer className="h-8 w-44 rounded-xl" />
        <Shimmer className="h-4 w-64 rounded-md" />
      </div>

      {/* Tabs ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[...Array(6)].map((_, i) => (
          <Shimmer key={i} className="h-9 w-24 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Settings Card */}
      <div className="rounded-3xl liquid-glass border border-slate-200/80 p-5 sm:p-6 space-y-5">
        <div className="space-y-1.5">
          <Shimmer className="h-5 w-40 rounded-lg" />
          <Shimmer className="h-3.5 w-60 rounded-md" />
        </div>
        <div className="divide-y divide-slate-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="py-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Shimmer className="h-4 w-36 rounded" />
                <Shimmer className="h-3 w-56 rounded" />
              </div>
              <Shimmer className="h-6 w-12 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
