"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  PieChart,
  PlusCircle,
  UploadCloud,
  Calendar,
  HandCoins,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  X,
} from "lucide-react";
import {
  DashboardSummary,
  MonthlyChartData,
  MonthlyChartPoint,
  CategoryBudgetStatus,
  OverallBudgetInfo,
  Transaction,
  CalendarDaySummary,
} from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { getCategoryTheme } from "@/lib/category-theme";
import { ChartPeriod, ChartPeriodStats } from "@/components/dashboard/ExpenseChart";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import MobileTransactionSheet from "./MobileTransactionSheet";

export interface MobileChartPoint {
  id: string;
  label: string;
  subLabel?: string;
  dateRangeLabel?: string;
  expenses: number;
  income: number;
  savings: number;
  originalPoint?: MonthlyChartPoint;
  year?: number;
  monthNumber?: number;
}

interface MobileDashboardProps {
  summary: DashboardSummary | null;
  monthlyChart: MonthlyChartData | null;
  categoryBudgets: CategoryBudgetStatus[];
  overallBudget: OverallBudgetInfo | null;
  selectedMonthKey: string | null;
  selectedMonthName: string | null;
  chartPeriod: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  onPeriodStatsChange?: (stats: ChartPeriodStats) => void;
  onSelectMonth: (point: MonthlyChartPoint) => void;
  onResetMonth: () => void;
  onOpenBudgetModal: () => void;
  onOpenCsvModal: () => void;
  onEditTransaction?: (txn: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
}

export default function MobileDashboard({
  summary,
  monthlyChart,
  categoryBudgets,
  overallBudget,
  selectedMonthKey,
  selectedMonthName,
  chartPeriod,
  onPeriodChange,
  onPeriodStatsChange,
  onSelectMonth,
  onResetMonth,
  onOpenBudgetModal,
  onOpenCsvModal,
  onEditTransaction,
  onDeleteTransaction,
}: MobileDashboardProps) {
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [inspectedPoint, setInspectedPoint] = useState<MobileChartPoint | null>(null);

  // Clear inspected bar whenever user switches periods
  useEffect(() => {
    setInspectedPoint(null);
  }, [chartPeriod]);

  // Determine active year and month for fetching / grouping
  const activeYear = useMemo(() => {
    if (selectedMonthKey) {
      const parts = selectedMonthKey.split("-");
      if (parts[0]) return parseInt(parts[0], 10);
    }
    if (summary?.activeMonthKey) {
      const parts = summary.activeMonthKey.split("-");
      if (parts[0]) return parseInt(parts[0], 10);
    }
    const lastPoint = monthlyChart?.points?.[monthlyChart.points.length - 1];
    return lastPoint?.year || new Date().getFullYear();
  }, [selectedMonthKey, summary?.activeMonthKey, monthlyChart?.points]);

  const activeMonth = useMemo(() => {
    if (selectedMonthKey) {
      const parts = selectedMonthKey.split("-");
      if (parts[1]) return parseInt(parts[1], 10);
    }
    if (summary?.activeMonthKey) {
      const parts = summary.activeMonthKey.split("-");
      if (parts[1]) return parseInt(parts[1], 10);
    }
    const lastPoint = monthlyChart?.points?.[monthlyChart.points.length - 1];
    return lastPoint?.monthNumber || new Date().getMonth() + 1;
  }, [selectedMonthKey, summary?.activeMonthKey, monthlyChart?.points]);

  // 1. MONTHLY DATASET (Last 6 Months from API)
  const monthlyPoints = useMemo<MobileChartPoint[]>(() => {
    if (!monthlyChart?.points || monthlyChart.points.length === 0) return [];
    return monthlyChart.points.slice(-6).map((pt) => ({
      id: pt.fullMonth,
      label: pt.month.slice(0, 3),
      subLabel: `${pt.month} ${pt.year || ""}`,
      dateRangeLabel: `Full Month of ${pt.month}`,
      expenses: pt.expenses,
      income: pt.income,
      savings: pt.savings,
      originalPoint: pt,
      year: pt.year,
      monthNumber: pt.monthNumber,
    }));
  }, [monthlyChart?.points]);

  // 2. YEARLY DATASET (Aggregated Annually)
  const yearlyPoints = useMemo<MobileChartPoint[]>(() => {
    if (!monthlyChart?.points || monthlyChart.points.length === 0) return [];

    const map = new Map<number, { inc: number; exp: number }>();
    for (const d of monthlyChart.points) {
      const y = d.year || 2026;
      const current = map.get(y) || { inc: 0, exp: 0 };
      current.inc += d.income || 0;
      current.exp += d.expenses || 0;
      map.set(y, current);
    }

    return Array.from(map.entries())
      .sort(([y1], [y2]) => y1 - y2)
      .map(([year, val]) => ({
        id: `YEAR-${year}`,
        label: `${year}`,
        subLabel: `Annual Summary ${year}`,
        dateRangeLabel: `Jan 1 – Dec 31, ${year}`,
        expenses: Math.round(val.exp * 100) / 100,
        income: Math.round(val.inc * 100) / 100,
        savings: Math.round((val.inc - val.exp) * 100) / 100,
        year,
      }));
  }, [monthlyChart?.points]);

  // 3. WEEKLY DATASET (Dynamic Fetching via Calendar API)
  const [weeklyData, setWeeklyData] = useState<MobileChartPoint[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  useEffect(() => {
    if (chartPeriod !== "WEEKLY") return;

    let isMounted = true;
    setWeeklyLoading(true);

    api
      .getMonthlyCalendar(activeYear, activeMonth)
      .then((days: CalendarDaySummary[]) => {
        if (!isMounted) return;

        const monthName = selectedMonthName || summary?.activeMonthName || "Month";
        const shortMonth = monthName.slice(0, 3);
        const weeks = [
          { label: "W1", subLabel: `Week 1 (${shortMonth} 1–7)`, dateRange: `${shortMonth} 1–7`, key: "W1", exp: 0, inc: 0 },
          { label: "W2", subLabel: `Week 2 (${shortMonth} 8–14)`, dateRange: `${shortMonth} 8–14`, key: "W2", exp: 0, inc: 0 },
          { label: "W3", subLabel: `Week 3 (${shortMonth} 15–21)`, dateRange: `${shortMonth} 15–21`, key: "W3", exp: 0, inc: 0 },
          { label: "W4", subLabel: `Week 4 (${shortMonth} 22–28)`, dateRange: `${shortMonth} 22–28`, key: "W4", exp: 0, inc: 0 },
          { label: "W5", subLabel: `Week 5 (${shortMonth} 29–end)`, dateRange: `${shortMonth} 29+`, key: "W5", exp: 0, inc: 0 },
        ];

        for (const d of days || []) {
          const day = d.dayOfMonth;
          let wIdx = 0;
          if (day <= 7) wIdx = 0;
          else if (day <= 14) wIdx = 1;
          else if (day <= 21) wIdx = 2;
          else if (day <= 28) wIdx = 3;
          else wIdx = 4;

          weeks[wIdx].exp += d.totalExpense || 0;
          weeks[wIdx].inc += d.totalIncome || 0;
        }

        const formatted: MobileChartPoint[] = weeks.map((w) => ({
          id: `${activeYear}-${activeMonth}-${w.key}`,
          label: w.label,
          subLabel: w.subLabel,
          dateRangeLabel: w.dateRange,
          expenses: Math.round(w.exp * 100) / 100,
          income: Math.round(w.inc * 100) / 100,
          savings: Math.round((w.inc - w.exp) * 100) / 100,
          year: activeYear,
          monthNumber: activeMonth,
        }));

        setWeeklyData(formatted);
      })
      .catch((err) => {
        console.error("Failed to fetch calendar for weekly view:", err);
      })
      .finally(() => {
        if (isMounted) setWeeklyLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [chartPeriod, activeYear, activeMonth, selectedMonthName, summary?.activeMonthName]);

  // Active dataset depending on chartPeriod
  const activePoints = useMemo<MobileChartPoint[]>(() => {
    if (chartPeriod === "WEEKLY") return weeklyData;
    if (chartPeriod === "YEARLY") return yearlyPoints;
    return monthlyPoints;
  }, [chartPeriod, weeklyData, yearlyPoints, monthlyPoints]);

  // Baseline Monthly figures from summary
  const totalExpenses = summary?.totalExpensesThisMonth || 0;
  const totalIncome = summary?.totalIncomeThisMonth || 0;
  const netSavings = summary?.netSavingsThisMonth || 0;
  const totalRecords = summary?.totalTransactionsCount || 0;

  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.min(100, Math.round((netSavings / totalIncome) * 100)))
      : 0;

  // Dynamically calculated Period Metrics for Top Hero Cards
  const periodMetrics = useMemo(() => {
    if (chartPeriod === "WEEKLY" && weeklyData.length > 0) {
      const exp = weeklyData.reduce((acc, p) => acc + p.expenses, 0);
      const inc = weeklyData.reduce((acc, p) => acc + p.income, 0);
      const sav = inc - exp;
      const rate = inc > 0 ? Math.max(0, Math.min(100, Math.round((sav / inc) * 100))) : 0;
      return {
        expenses: exp,
        income: inc,
        savings: sav,
        savingsRate: rate,
        heroTitle: "Net Weekly Savings",
        heroSubtitle: `${selectedMonthName || summary?.activeMonthName || "Current Month"} (Weekly)`,
        expensesLabel: "Weekly Outflow",
        incomeLabel: "Weekly Inflow",
      };
    }

    if (chartPeriod === "YEARLY" && yearlyPoints.length > 0) {
      const currentYearData =
        yearlyPoints.find((y) => y.year === activeYear) ||
        yearlyPoints[yearlyPoints.length - 1];
      const exp = currentYearData?.expenses || 0;
      const inc = currentYearData?.income || 0;
      const sav = inc - exp;
      const rate = inc > 0 ? Math.max(0, Math.min(100, Math.round((sav / inc) * 100))) : 0;
      return {
        expenses: exp,
        income: inc,
        savings: sav,
        savingsRate: rate,
        heroTitle: `Net Annual Savings (${currentYearData?.label || activeYear})`,
        heroSubtitle: `Full Year ${currentYearData?.label || activeYear}`,
        expensesLabel: "Annual Outflow",
        incomeLabel: "Annual Inflow",
      };
    }

    // Default: MONTHLY
    return {
      expenses: totalExpenses,
      income: totalIncome,
      savings: netSavings,
      savingsRate: savingsRate,
      heroTitle: "Net Monthly Savings",
      heroSubtitle: selectedMonthName || summary?.activeMonthName || "Current Month",
      expensesLabel: "Total Outflow",
      incomeLabel: "Total Inflow",
    };
  }, [
    chartPeriod,
    weeklyData,
    yearlyPoints,
    activeYear,
    totalExpenses,
    totalIncome,
    netSavings,
    savingsRate,
    selectedMonthName,
    summary?.activeMonthName,
  ]);

  // Synchronize period stats with parent page if callback provided
  useEffect(() => {
    if (onPeriodStatsChange) {
      onPeriodStatsChange({
        period: chartPeriod,
        title: periodMetrics.heroTitle,
        subtitle: periodMetrics.heroSubtitle,
        expenses: periodMetrics.expenses,
        income: periodMetrics.income,
        savings: periodMetrics.savings,
      });
    }
  }, [chartPeriod, periodMetrics, onPeriodStatsChange]);

  // Max value calculation for bar heights
  const maxVal = useMemo(() => {
    if (!activePoints || activePoints.length === 0) return 1000;
    return Math.max(...activePoints.map((p) => Math.max(p.expenses, p.income, 1)), 1000);
  }, [activePoints]);

  // Categories breakdown
  const categoryEntries = summary?.categoryBreakdown
    ? Object.entries(summary.categoryBreakdown).sort((a, b) => b[1] - a[1])
    : [];
  const totalCatExpenses = totalExpenses || 1;
  const visibleCategories = showAllCategories
    ? categoryEntries
    : categoryEntries.slice(0, 4);

  // Recent transactions (up to 5)
  const recentTxns = summary?.recentTransactions?.slice(0, 5) || [];

  return (
    <div className="space-y-4 pb-28 md:hidden">
      {/* ========================================================= */}
      {/* 1. MOBILE HEADER: Greeting, Active Period, Quick Action   */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C3BFF]">
            {selectedMonthName || summary?.activeMonthName || "Current Month"}
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
            Financial Overview
          </h2>
        </div>

        {/* Quick Actions (Add Entry & Import) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCsvModal}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="Import CSV"
          >
            <UploadCloud className="w-4 h-4 text-[#5228E0]" />
          </button>
          <Link
            href="/transactions?action=new"
            className="btn-primary flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white shadow-2xs"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Add</span>
          </Link>
        </div>
      </div>

      {/* Selected Month Filter Reset Pill */}
      {selectedMonthKey && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-purple-50/90 border border-purple-200 text-xs">
          <span className="text-[11px] font-semibold text-purple-900">
            Filtered by: <strong>{selectedMonthName}</strong>
          </span>
          <button
            type="button"
            onClick={onResetMonth}
            className="text-[11px] font-bold text-[#6C3BFF] hover:underline cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PRIMARY FINANCIAL HERO CARD: Net Savings & Rate        */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-gradient-to-br from-[#FAF8FF] via-white to-purple-50/70 border border-purple-200/90 p-4.5 shadow-xs relative overflow-hidden select-none">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#6C3BFF]" />
            <span>{periodMetrics.heroTitle}</span>
          </span>
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
              periodMetrics.savings >= 0
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            )}
          >
            {periodMetrics.savings >= 0 ? `${periodMetrics.savingsRate}% saved` : "Deficit"}
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-0.5">
          <h3
            className={cn(
              "text-2xl font-black tracking-tight tabular-nums transition-colors",
              periodMetrics.savings >= 0 ? "text-slate-900" : "text-rose-600"
            )}
          >
            {periodMetrics.savings >= 0 ? "+" : ""}
            {formatCurrency(periodMetrics.savings)}
          </h3>
          <span className="text-[11px] font-medium text-slate-400">
            {chartPeriod === "WEEKLY"
              ? "Weekly aggregate"
              : chartPeriod === "YEARLY"
              ? "Annual aggregate"
              : `${totalRecords} txns recorded`}
          </span>
        </div>

        {/* Progress Bar for Savings Ratio */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8F6BFF] via-[#7547F5] to-[#5228E0] transition-all duration-500"
            style={{ width: `${Math.max(5, periodMetrics.savingsRate)}%` }}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SUPPORTING METRICS 2-COL GRID: Expenses & Income       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Expenses Card */}
        <div className="p-3.5 rounded-2xl bg-white border border-rose-100/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {chartPeriod === "WEEKLY"
                ? "Weekly Exp."
                : chartPeriod === "YEARLY"
                ? "Annual Exp."
                : "Expenses"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base font-black text-rose-600 tabular-nums">
            {formatCurrency(periodMetrics.expenses)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {periodMetrics.expensesLabel}
          </span>
        </div>

        {/* Total Income Card */}
        <div className="p-3.5 rounded-2xl bg-white border border-emerald-100/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {chartPeriod === "WEEKLY"
                ? "Weekly Inc."
                : chartPeriod === "YEARLY"
                ? "Annual Inc."
                : "Income"}
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base font-black text-emerald-600 tabular-nums">
            {formatCurrency(periodMetrics.income)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">
            {periodMetrics.incomeLabel}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. DYNAMIC CASHFLOW BAR CHART WITH PERIOD SWITCHER        */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
              {chartPeriod === "WEEKLY"
                ? "Weekly Flow"
                : chartPeriod === "YEARLY"
                ? "Annual Flow"
                : "Monthly Flow"}
            </h4>
            <span className="text-[10px] text-slate-500">
              {chartPeriod === "WEEKLY"
                ? `Weeks in ${selectedMonthName || summary?.activeMonthName || "Month"}`
                : chartPeriod === "YEARLY"
                ? "Multi-Year Totals"
                : "Inflow vs Outflow"}
            </span>
          </div>

          {/* Segmented Period Control (Month | Week | Year) with Motion Slider */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 text-[11px] font-bold">
            {(["MONTHLY", "WEEKLY", "YEARLY"] as ChartPeriod[]).map((period) => {
              const isActive = chartPeriod === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => {
                    onPeriodChange(period);
                    setInspectedPoint(null);
                  }}
                  className={cn(
                    "relative px-2.5 py-1 rounded-lg transition-colors cursor-pointer select-none",
                    isActive
                      ? "text-[#5228E0] font-black"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileActivePeriodTab"
                      className="absolute inset-0 rounded-lg bg-white shadow-2xs border border-purple-100"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">
                    {period === "MONTHLY" ? "Month" : period === "WEEKLY" ? "Week" : "Year"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Point Inspector Card (Appears when user taps any bar) */}
        <AnimatePresence>
          {inspectedPoint && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="mb-3 p-2.5 rounded-2xl bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-purple-50/90 border border-purple-200/90 shadow-2xs flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#6C3BFF] shrink-0" />
                  <span className="text-xs font-black text-slate-900 truncate">
                    {inspectedPoint.subLabel || inspectedPoint.label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block">
                  Net:{" "}
                  <strong
                    className={
                      inspectedPoint.savings >= 0 ? "text-emerald-700" : "text-rose-600"
                    }
                  >
                    {inspectedPoint.savings >= 0 ? "+" : ""}
                    {formatCurrency(inspectedPoint.savings)}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right text-[11px] font-bold">
                  <span className="text-emerald-600 block">
                    +{formatCurrency(inspectedPoint.income)}
                  </span>
                  <span className="text-rose-600 block">
                    -{formatCurrency(inspectedPoint.expenses)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectedPoint(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
                  title="Close readout"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Bar Chart Content */}
        {weeklyLoading && chartPeriod === "WEEKLY" ? (
          /* Weekly Loading Skeleton */
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 animate-pulse">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div className="w-full max-w-[12px] bg-emerald-100/90 rounded-t-sm h-14" />
                  <div className="w-full max-w-[12px] bg-purple-100/90 rounded-t-sm h-24" />
                </div>
                <div className="w-5 h-2.5 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : activePoints.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={chartPeriod}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div className="h-44 flex items-end justify-between gap-2 pt-4 px-1">
                {activePoints.map((pt, idx) => {
                  const expenseH = Math.max(8, Math.round((pt.expenses / maxVal) * 100));
                  const incomeH = Math.max(8, Math.round((pt.income / maxVal) * 100));
                  const isSelected =
                    inspectedPoint?.id === pt.id ||
                    (!inspectedPoint &&
                      chartPeriod === "MONTHLY" &&
                      selectedMonthKey === pt.id) ||
                    (!inspectedPoint &&
                      chartPeriod === "YEARLY" &&
                      pt.year === activeYear);

                  return (
                    <div
                      key={pt.id || idx}
                      onClick={() => {
                        if (inspectedPoint?.id === pt.id) {
                          setInspectedPoint(null);
                        } else {
                          setInspectedPoint(pt);
                        }
                        if (chartPeriod === "MONTHLY" && pt.originalPoint) {
                          if (selectedMonthKey === pt.id) {
                            onResetMonth();
                          } else {
                            onSelectMonth(pt.originalPoint);
                          }
                        } else if (chartPeriod === "YEARLY" && pt.year) {
                          // Find latest month of that year
                          const yrPoints = monthlyChart?.points?.filter(
                            (p) => p.year === pt.year
                          );
                          if (yrPoints && yrPoints.length > 0) {
                            onSelectMonth(yrPoints[yrPoints.length - 1]);
                          }
                        }
                      }}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-95 group",
                        isSelected ? "scale-105" : ""
                      )}
                    >
                      <div className="w-full flex items-end justify-center gap-1 h-32">
                        {/* Income Bar (Mint Green) */}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${incomeH}%` }}
                          transition={{ type: "spring", stiffness: 320, damping: 26 }}
                          className={cn(
                            "w-full max-w-[12px] rounded-t-sm transition-colors duration-300",
                            isSelected
                              ? "bg-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.4)] ring-1 ring-emerald-300"
                              : "bg-emerald-400/80 group-hover:bg-emerald-500"
                          )}
                          title={`Income: ${formatCurrency(pt.income)}`}
                        />
                        {/* Expense Bar (Lavender Purple) */}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${expenseH}%` }}
                          transition={{ type: "spring", stiffness: 320, damping: 26 }}
                          className={cn(
                            "w-full max-w-[12px] rounded-t-sm transition-colors duration-300",
                            isSelected
                              ? "bg-[#6C3BFF] shadow-[0_2px_8px_rgba(108,59,255,0.4)] ring-1 ring-purple-300"
                              : "bg-indigo-300/85 group-hover:bg-indigo-400"
                          )}
                          title={`Expenses: ${formatCurrency(pt.expenses)}`}
                        />
                      </div>

                      {/* Label & Subtitle */}
                      <div className="text-center">
                        <span
                          className={cn(
                            "text-[10px] font-bold block truncate transition-colors",
                            isSelected
                              ? "text-[#6C3BFF] font-black underline underline-offset-2"
                              : "text-slate-500 group-hover:text-slate-800"
                          )}
                        >
                          {pt.label}
                        </span>
                        {pt.dateRangeLabel && chartPeriod === "WEEKLY" && (
                          <span className="text-[8px] text-slate-400 font-medium block -mt-0.5">
                            {pt.dateRangeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[10px] text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-emerald-400 inline-block" />
                    Inflow
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-xs bg-[#6C3BFF] inline-block" />
                    Outflow
                  </span>
                </div>
                <span className="text-[9px] text-slate-400">Tap bar to inspect</span>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400">
            No cashflow data available for this period.
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. EXPENSE CATEGORIES: Mobile Clean Card                  */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 text-[#6C3BFF] border border-purple-100">
              <PieChart className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Expense by Category
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenBudgetModal}
            className="text-[11px] font-bold text-[#6C3BFF] flex items-center gap-1 cursor-pointer hover:underline"
          >
            <Sliders className="w-3 h-3" />
            <span>Limits</span>
          </button>
        </div>

        {/* Overall Monthly Budget Bar */}
        {overallBudget && overallBudget.hasLimit && overallBudget.limitValue > 0 && (
          <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-purple-50/50 border border-indigo-100 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-700 text-[11px]">Monthly Budget</span>
              <span className="font-black text-slate-900 text-[11px]">
                {formatCurrency(overallBudget.totalExpenses || totalExpenses)}{" "}
                <span className="text-slate-400 font-normal">
                  / {formatCurrency(overallBudget.limitValue)}
                </span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  overallBudget.status === "EXCEEDED"
                    ? "bg-rose-500"
                    : overallBudget.status === "WARNING"
                    ? "bg-amber-500"
                    : "bg-[#6C3BFF]"
                )}
                style={{
                  width: `${Math.min(100, Math.round(overallBudget.percentageUsed || 0))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Category Rows */}
        {categoryEntries.length > 0 ? (
          <div className="space-y-2">
            {visibleCategories.map(([cat, amt]) => {
              const pct = Math.min(100, Math.round((amt / totalCatExpenses) * 100));
              const theme = getCategoryTheme(cat);
              const CategoryIcon = theme.icon;

              return (
                <div key={cat} className="space-y-1 py-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border border-slate-200/50",
                          theme.bgLight,
                          theme.iconClass
                        )}
                      >
                        <CategoryIcon className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-slate-800 text-xs truncate">
                        {cat}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 text-xs">
                        {formatCurrency(amt)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r", theme.gradient)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {categoryEntries.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="w-full py-1.5 rounded-xl bg-slate-50 text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1 cursor-pointer mt-1"
              >
                <span>
                  {showAllCategories
                    ? "Show Less"
                    : `+${categoryEntries.length - 4} More Categories`}
                </span>
                {showAllCategories ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            No expenses categorized for this month.
          </p>
        )}
      </div>

      {/* ========================================================= */}
      {/* 6. MOBILE RECENT ACTIVITY: Compact Interactive List       */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Recent Activity
            </h4>
          </div>

          <Link
            href="/transactions"
            className="text-[11px] font-bold text-[#6C3BFF] hover:underline"
          >
            See all →
          </Link>
        </div>

        {recentTxns.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentTxns.map((txn) => {
              const isExpense = txn.transactionType === "EXPENSE";
              const formattedDate = txn.transactionDate
                ? new Date(txn.transactionDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })
                : "";

              return (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTxn(txn)}
                  className="py-2.5 flex items-center justify-between gap-2.5 cursor-pointer active:bg-slate-50/80 rounded-xl px-1 -mx-1 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border",
                        isExpense
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}
                    >
                      {isExpense ? (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {txn.merchant}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {txn.category} · {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "text-xs font-black tabular-nums",
                        isExpense ? "text-rose-600" : "text-emerald-600"
                      )}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            No recent activity recorded.
          </p>
        )}
      </div>

      {/* ========================================================= */}
      {/* 7. QUICK FEATURE SHORTCUTS: Calendar & Debt/Lent          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/calendar"
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2 cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Calendar className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Cashflow Calendar</h5>
            <p className="text-[10px] text-slate-500">Day-by-day view</p>
          </div>
        </Link>

        <Link
          href="/debt-lent"
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2 cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <HandCoins className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Debt & Lent</h5>
            <p className="text-[10px] text-slate-500">Money lent & owed</p>
          </div>
        </Link>
      </div>

      {/* Mobile Transaction Bottom Sheet */}
      <MobileTransactionSheet
        transaction={selectedTxn}
        isOpen={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onEdit={(txn) => {
          onEditTransaction?.(txn);
        }}
        onDelete={(id) => {
          onDeleteTransaction?.(id);
        }}
      />
    </div>
  );
}
