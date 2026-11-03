"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  PieChart as PieChartIcon,
  ChevronRight,
  Sliders,
  Wallet,
  ArrowRight,
  X,
  Layers,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency, cn } from "@/lib/utils";
import { getCategoryTheme } from "@/lib/category-theme";
import { categoryToSlug } from "@/lib/category-slugs";
import { CategoryBudgetStatus, OverallBudgetInfo, Transaction } from "@/types";

interface DesktopExpenseByCategoryProps {
  categoryBreakdown: Record<string, number> | undefined;
  totalExpenses: number;
  activeMonthName?: string;
  activeYear?: number;
  activeMonth?: number;
  categoryBudgets?: CategoryBudgetStatus[];
  overallBudget?: OverallBudgetInfo | null;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onOpenBudgetModal: () => void;
  transactions?: Transaction[];
}

export default function DesktopExpenseByCategory({
  categoryBreakdown,
  totalExpenses,
  activeMonthName,
  activeYear = 2026,
  activeMonth = 11,
  categoryBudgets = [],
  overallBudget,
  selectedCategory,
  onSelectCategory,
  onOpenBudgetModal,
  transactions = [],
}: DesktopExpenseByCategoryProps) {
  // Compute counts per category from transactions
  const countsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.transactionType === "EXPENSE" && t.category) {
        const cat = t.category.trim();
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    }
    return map;
  }, [transactions]);

  // Transform breakdown to sorted rows
  const categoryEntries = useMemo(() => {
    if (!categoryBreakdown) return [];
    return Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);
  }, [categoryBreakdown]);

  const safeTotal = totalExpenses || 1;

  // Donut chart dataset
  const chartData = useMemo(() => {
    return categoryEntries.map(([cat, amt]) => {
      const theme = getCategoryTheme(cat);
      const pct = Math.round((amt / safeTotal) * 100);
      return {
        name: cat,
        value: amt,
        percentage: pct,
        color: theme.hexColor,
        slug: categoryToSlug(cat),
      };
    });
  }, [categoryEntries, safeTotal]);

  const activeCategoryData = useMemo(() => {
    if (!selectedCategory) return null;
    return chartData.find((c) => c.name === selectedCategory) || null;
  }, [selectedCategory, chartData]);

  return (
    <div
      id="expense-by-category"
      className="rounded-3xl liquid-glass p-5 sm:p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs select-none"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3.5">
          <Link
            href={`/dashboard/expenses/categories?year=${activeYear}&month=${activeMonth}`}
            className="flex items-center gap-2 group cursor-pointer"
            title="Open dedicated Expense Analytics page"
          >
            <div className="p-1.5 rounded-xl bg-purple-50 text-[#6C3BFF] border border-purple-100 shadow-2xs group-hover:scale-105 transition-transform">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight group-hover:text-[#6C3BFF] transition-colors">
                  Expense by Category
                </h4>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#6C3BFF] transition-all" />
              </div>
              {activeMonthName && (
                <span className="text-[10px] text-[#6C3BFF] font-bold">
                  {activeMonthName}
                </span>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {selectedCategory && (
              <button
                type="button"
                onClick={() => onSelectCategory(null)}
                className="px-2 py-0.5 rounded-lg bg-purple-50 text-[#6C3BFF] text-[11px] font-bold border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear selected category filter"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenBudgetModal}
              className="btn-secondary h-7 px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer shadow-2xs hover:border-[#6C3BFF]/30 flex items-center gap-1"
              title="Configure monthly budget limits"
            >
              <Sliders className="w-3 h-3 text-[#5228E0]" />
              <span>Limits</span>
            </button>
          </div>
        </div>

        {/* Overall Monthly Budget Indicator */}
        {overallBudget && overallBudget.hasLimit && overallBudget.limitValue > 0 && (
          <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                <Wallet className="w-3 h-3 text-indigo-600" />
                <span>Monthly Budget</span>
              </span>
              <span className="font-extrabold text-slate-900 text-xs">
                {formatCurrency(overallBudget.totalExpenses || totalExpenses)}{" "}
                <span className="text-slate-400 font-normal text-[10px]">
                  / {formatCurrency(overallBudget.limitValue)}
                </span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallBudget.status === "EXCEEDED"
                    ? "bg-rose-500"
                    : overallBudget.status === "WARNING"
                    ? "bg-amber-500"
                    : "bg-[#6C3BFF]"
                }`}
                style={{
                  width: `${Math.min(100, Math.round(overallBudget.percentageUsed || 0))}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span>
                Allocated: <strong className="text-slate-700">{formatCurrency(overallBudget.totalAllocated)}</strong>
              </span>
              <span
                className={
                  overallBudget.remainingBuffer < 0
                    ? "text-rose-600 font-bold"
                    : "text-emerald-700 font-semibold"
                }
              >
                {overallBudget.remainingBuffer < 0
                  ? `Over by ${formatCurrency(Math.abs(overallBudget.remainingBuffer))}`
                  : `Buffer: ${formatCurrency(overallBudget.remainingBuffer)}`}
              </span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* A. INTERACTIVE DONUT CHART                                */}
        {/* ========================================================= */}
        {chartData.length > 0 && (
          <div className="mb-4 pt-1 pb-2 border-b border-slate-100">
            <div className="relative h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl bg-slate-900/95 backdrop-blur-md text-white p-2.5 text-xs shadow-xl border border-white/10 select-none">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span className="font-extrabold text-white">{d.name}</span>
                            </div>
                            <p className="text-emerald-400 font-black text-xs tabular-nums">
                              {formatCurrency(d.value)}
                            </p>
                            <p className="text-purple-300 font-semibold text-[10px]">
                              {d.percentage}% of expenses
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    cursor="pointer"
                    onClick={(entry: any) => {
                      if (entry?.name) {
                        onSelectCategory(selectedCategory === entry.name ? null : entry.name);
                      }
                    }}
                  >
                    {chartData.map((entry, idx) => {
                      const isSelected = selectedCategory === entry.name;
                      const hasSelection = Boolean(selectedCategory);
                      return (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.color}
                          stroke={isSelected ? "#230348" : "#ffffff"}
                          strokeWidth={isSelected ? 3 : 2}
                          opacity={hasSelection && !isSelected ? 0.35 : 1}
                          className="transition-all duration-200"
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {selectedCategory ? "Filtered" : "Total Outflow"}
                </span>
                <span className="text-sm font-black text-slate-900 tracking-tight tabular-nums truncate max-w-[120px]">
                  {activeCategoryData
                    ? formatCurrency(activeCategoryData.value)
                    : formatCurrency(totalExpenses)}
                </span>
                <span className="text-[9px] text-[#6C3BFF] font-bold mt-0.5 truncate max-w-[110px]">
                  {selectedCategory || `${categoryEntries.length} Categories`}
                </span>
              </div>
            </div>

            {/* Quick Filter Active Notice */}
            {selectedCategory && (
              <div className="flex items-center justify-between mt-1 px-2.5 py-1 rounded-xl bg-purple-50/80 border border-purple-200/60 text-xs">
                <span className="text-[11px] font-bold text-[#6C3BFF] truncate">
                  Filtered: <strong>{selectedCategory}</strong> ({activeCategoryData?.percentage}%)
                </span>
                <button
                  type="button"
                  onClick={() => onSelectCategory(null)}
                  className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* B. CATEGORY BREAKDOWN LIST                                */}
        {/* ========================================================= */}
        {categoryEntries.length > 0 ? (
          <div className="space-y-2.5">
            {categoryEntries.map(([cat, amt]) => {
              const theme = getCategoryTheme(cat);
              const CategoryIcon = theme.icon;
              const pctOfTotal = Math.min(100, Math.round((amt / safeTotal) * 100));
              const isSelected = selectedCategory === cat;

              // Budget limit for this category
              const catBudget = categoryBudgets.find(
                (b) => b.category.toLowerCase() === cat.toLowerCase()
              );
              const hasLimit = !!(catBudget && catBudget.hasLimit && (catBudget.computedLimitAmount || catBudget.limitValue || 0) > 0);
              const computedLimit = catBudget?.computedLimitAmount || catBudget?.limitValue || 0;
              const pctOfLimit = hasLimit ? Math.round((amt / computedLimit) * 100) : 0;
              const isOver = hasLimit && amt > computedLimit;
              const isWarning = hasLimit && pctOfLimit >= 80 && !isOver;
              const txnCount = countsMap.get(cat) || countsMap.get(cat.toUpperCase()) || 1;

              return (
                <div
                  key={cat}
                  onClick={() => onSelectCategory(isSelected ? null : cat)}
                  className={cn(
                    "p-2.5 rounded-2xl transition-all cursor-pointer group space-y-1.5 border",
                    isSelected
                      ? "bg-purple-50/90 border-purple-300 shadow-2xs ring-1 ring-purple-300"
                      : "hover:bg-slate-50/80 border-transparent"
                  )}
                >
                  {/* Top Row: Icon, Name, Amount */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border border-slate-200/50 shadow-2xs group-hover:scale-105 transition-transform",
                          theme.bgLight,
                          theme.iconClass
                        )}
                      >
                        <CategoryIcon className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0">
                        <span
                          className={cn(
                            "font-bold tracking-tight text-xs truncate block transition-colors",
                            isSelected ? "text-[#6C3BFF] font-black" : "text-slate-800 group-hover:text-[#6C3BFF]"
                          )}
                        >
                          {cat}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {txnCount} {txnCount === 1 ? "txn" : "txns"}
                        </span>
                      </div>

                      {hasLimit && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                            isOver
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : isWarning
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isOver ? `+${formatCurrency(amt - computedLimit)}` : `${pctOfLimit}%`}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <div>
                        <span className="text-slate-800 font-extrabold text-xs">
                          {formatCurrency(amt)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({pctOfTotal}%)
                        </span>
                      </div>
                      <ChevronRight
                        className={cn(
                          "w-3.5 h-3.5 transition-all",
                          isSelected
                            ? "text-[#6C3BFF] translate-x-0.5"
                            : "text-slate-300 group-hover:text-[#6C3BFF]"
                        )}
                      />
                    </div>
                  </div>

                  {/* Tailored Category Gradient Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500 bg-gradient-to-r", theme.gradient)}
                      style={{
                        width: `${hasLimit ? Math.min(100, pctOfLimit) : pctOfTotal}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Direct Page Navigation to Dedicated Module */}
            <Link
              href={`/dashboard/expenses/categories?year=${activeYear}&month=${activeMonth}`}
              className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200/60 text-[11px] font-bold text-[#6C3BFF] flex items-center justify-center gap-1.5 cursor-pointer transition-all mt-2.5 shadow-2xs group"
            >
              <span>Open Dedicated Expense Analytics</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No expense categories recorded for this period.
          </div>
        )}
      </div>

      {/* Footer Card */}
      <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          {categoryBudgets.filter((b) => b.hasLimit).length > 0
            ? `${categoryBudgets.filter((b) => b.hasLimit).length} budget limits active`
            : "Automated classification active"}
        </span>
        <span className="text-[10px] text-slate-400">
          {categoryEntries.length} categories
        </span>
      </div>
    </div>
  );
}
