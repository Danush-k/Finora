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
  ChevronDown,
  ChevronUp,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  X,
  Layers,
  ChevronRight,
  BarChart3,
  RefreshCw,
  Lock,
  Check,
  Target,
  Flag,
  Coins,
  Banknote,
  Sliders,
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
import { cn } from "@/lib/utils";
import { getCategoryTheme } from "@/lib/category-theme";
import { ChartPeriod, ChartPeriodStats } from "@/components/dashboard/ExpenseChart";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
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

// Precise currency formatting with 2 decimal places as in the reference screenshot
const formatExactCurrency = (amt: number) => {
  return "₹" + Math.abs(amt).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

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
  const { user, lock, logout } = useAuth();
  const { success, error: toastError } = useToast();

  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [inspectedPoint, setInspectedPoint] = useState<MobileChartPoint | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Sync Action from Mobile Hero
  const handleHeroSync = async () => {
    try {
      setSyncing(true);
      await api.triggerSync();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finora-sync-completed"));
      }
      success("Transactions Synchronized", "HDFC bank alerts parsed and up to date.");
    } catch (e) {
      console.error(e);
      toastError("Sync Failed", "Could not synchronize with Gmail.");
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };

  // Clear inspected bar whenever user switches periods
  useEffect(() => {
    setInspectedPoint(null);
  }, [chartPeriod]);

  // Determine active year and month
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

  // 1. MONTHLY DATASET (Last 6 Months)
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

  // Active dataset
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

  // Period Metrics for Cards
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
        heroTitle: "Net Monthly Savings",
        heroSubtitle: `${selectedMonthName || summary?.activeMonthName || "Current Month"} (Weekly)`,
        expensesLabel: "Total Outflow",
        incomeLabel: "Total Inflow",
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
        heroTitle: "Net Monthly Savings",
        heroSubtitle: `Full Year ${currentYearData?.label || activeYear}`,
        expensesLabel: "Total Outflow",
        incomeLabel: "Total Inflow",
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

  // Synchronize period stats with parent page
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

  // Fixed max scale 6K matching reference screenshot or scaled dynamically
  const chartMax = useMemo(() => {
    const rawMax = Math.max(...activePoints.map((p) => Math.max(p.expenses, p.income, 1)), 6000);
    return Math.max(6000, Math.ceil(rawMax / 1000) * 1000);
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
    <div className="md:hidden pb-32 select-none bg-[#F6F4FA] min-h-screen">
      {/* ========================================================================= */}
      {/* 1. EXACT REFERENCE HERO SECTION: DEEP PURPLE + SHINING GOLD CURVY WAVES   */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#18022E] via-[#2A0550] to-[#3C0974] text-white pt-[calc(env(safe-area-inset-top)+14px)] pb-14 px-5 shadow-lg">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-12 left-0 w-60 h-60 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        {/* Ambient Warm Golden Flare behind the wave crest */}
        <div className="absolute bottom-6 right-6 w-44 h-28 bg-gradient-to-r from-amber-400/35 via-yellow-400/25 to-transparent blur-2xl rounded-full pointer-events-none z-10" />

        {/* TOP BRAND BAR */}
        <div className="flex items-center justify-between gap-3 relative z-20">
          {/* Logo: Stylized Ribbon F + Finora BY PAYTRACE */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none" className="shrink-0 drop-shadow-md">
              <defs>
                <linearGradient id="finoraLogoGradRef" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C084FC" />
                  <stop offset="50%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#7E22CE" />
                </linearGradient>
              </defs>
              <path
                d="M7 8.5C12.5 5.5 22 5.5 29 8C27 12 20 13.5 12.5 14.5L12 28C9.5 27 7.5 25 7 22.5L7 8.5Z"
                fill="url(#finoraLogoGradRef)"
              />
              <path
                d="M12.5 16.5C17 15 22.5 15.2 26 17.2C24.5 20.2 19 21 12.5 21.2V16.5Z"
                fill="#E9D5FF"
              />
            </svg>
            <div className="flex flex-col justify-center">
              <span className="text-xl font-black text-white tracking-tight leading-none">
                Finora
              </span>
              <span className="text-[8.5px] font-bold text-purple-200/90 tracking-[0.24em] uppercase leading-none mt-1">
                BY PAYTRACE
              </span>
            </div>
          </Link>

          {/* Right Action Icons: Refresh / Lock / Avatar */}
          <div className="flex items-center gap-2.5">
            {/* Sync Button */}
            <button
              type="button"
              onClick={handleHeroSync}
              disabled={syncing}
              title="Sync Gmail"
              className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={cn("w-4 h-4 text-white", syncing && "animate-spin")} />
            </button>

            {/* Lock Button */}
            <button
              type="button"
              onClick={lock}
              title="Lock Screen"
              className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all shadow-xs cursor-pointer"
            >
              <Lock className="w-4 h-4 text-white" />
            </button>

            {/* User Profile Avatar */}
            <button
              type="button"
              onClick={logout}
              title={`${user?.name || "Danush"} - Click to logout`}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#8E44EC] via-[#A855F7] to-[#D946EF] border border-white/30 flex items-center justify-center text-white font-black text-xs shadow-md cursor-pointer active:scale-95 transition-transform"
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "DA"}
            </button>
          </div>
        </div>

        {/* HERO TITLE & MONTH PICKER */}
        <div className="mt-5 relative z-20">
          {/* Active Month Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setShowMonthPicker(true)}
            className="inline-flex items-center gap-1.5 text-xs font-black tracking-wider text-purple-200/90 uppercase hover:text-white transition-colors cursor-pointer select-none"
          >
            <span>{selectedMonthName || summary?.activeMonthName || "NOVEMBER 2026"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-purple-300" />
          </button>

          {/* Heading */}
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
            Financial Overview
          </h1>

          {/* Subtitle */}
          <p className="text-xs font-semibold text-purple-200/80 tracking-wide mt-1 flex items-center gap-2">
            <span>Track</span>
            <span className="text-purple-400 font-black">•</span>
            <span>Manage</span>
            <span className="text-purple-400 font-black">•</span>
            <span>Grow</span>
          </p>
        </div>

        {/* ========================================================================= */}
        {/* MANDATORY SHINING GOLD CONTOUR LINES ON ORGANIC CURVY AREA                 */}
        {/* ========================================================================= */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none w-full overflow-hidden leading-none z-10">
          <svg
            viewBox="0 0 400 135"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-28 -mb-0.5"
          >
            <defs>
              {/* Luxury Gold Shimmer Gradient */}
              <linearGradient id="finoraGoldGradientRef" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFF7D6" />
                <stop offset="20%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#FFA000" />
                <stop offset="80%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FFF2B8" />
              </linearGradient>

              {/* Glowing Drop Shadow Filter for Gold Contour */}
              <filter id="finoraGoldGlowRef" x="-25%" y="-45%" width="150%" height="190%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3.2"
                  floodColor="#FFC107"
                  floodOpacity="0.95"
                />
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="6"
                  floodColor="#FF9800"
                  floodOpacity="0.65"
                />
              </filter>

              {/* Back Wave Gradient */}
              <linearGradient id="backWaveGradRef" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4A0E7E" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#22033F" stopOpacity="0.98" />
              </linearGradient>

              {/* Front Wave Gradient */}
              <linearGradient id="frontWaveGradRef" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6D1E9E" stopOpacity="0.90" />
                <stop offset="100%" stopColor="#2A054E" stopOpacity="1.0" />
              </linearGradient>
            </defs>

            {/* Back Wave Body */}
            <path
              d="M-10,58 C110,92 240,12 410,52 L410,135 L-10,135 Z"
              fill="url(#backWaveGradRef)"
            />
            {/* Back Wave Golden Glowing Contour Line */}
            <path
              d="M-10,58 C110,92 240,12 410,52"
              stroke="url(#finoraGoldGradientRef)"
              strokeWidth="3"
              fill="none"
              filter="url(#finoraGoldGlowRef)"
            />

            {/* Front Wave Body */}
            <path
              d="M-10,95 C115,55 250,110 410,68 L410,135 L-10,135 Z"
              fill="url(#frontWaveGradRef)"
            />
            {/* Front Wave Golden Glowing Contour Line */}
            <path
              d="M-10,95 C115,55 250,110 410,68"
              stroke="url(#finoraGoldGradientRef)"
              strokeWidth="2.4"
              fill="none"
              filter="url(#finoraGoldGlowRef)"
            />
          </svg>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING CONTENT BODY (OVERLAPPING HERO WAVES)                          */}
      {/* ========================================================================= */}
      <div className="px-4 -mt-8 relative z-20 space-y-3.5">
        {/* ========================================================= */}
        {/* CARD 1: NET MONTHLY SAVINGS HERO CARD                     */}
        {/* ========================================================= */}
        <div className="rounded-[28px] bg-white border border-slate-100 shadow-[0_12px_36px_rgba(26,4,54,0.07)] p-5 relative overflow-hidden">
          {/* Card Top Row */}
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#F2EDFF] text-[#6C3BFF] flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4 text-[#6C3BFF]" />
              </div>
              <span className="font-bold text-slate-800 text-xs">
                {periodMetrics.heroTitle}
              </span>
            </div>

            {/* Status Badge: Deficit vs Saved */}
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors",
                periodMetrics.savings < 0
                  ? "bg-[#FEEAEA] text-[#E53935]"
                  : "bg-[#E8F8F0] text-[#10B981]"
              )}
            >
              {periodMetrics.savings < 0 ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-[#E53935]" />
                  <span>Deficit</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>{periodMetrics.savingsRate}% of income</span>
                </>
              )}
            </span>
          </div>

          {/* Large Tabular Financial Amount */}
          <div className="mt-1">
            <span
              className={cn(
                "text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums",
                periodMetrics.savings < 0 ? "text-[#E53935]" : "text-[#10B981]"
              )}
            >
              {periodMetrics.savings < 0 ? "-" : "+"}
              {formatExactCurrency(periodMetrics.savings)}
            </span>
          </div>

          {/* Progress Bar & Rate of Income */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-2 bg-[#ECE9F5] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#6C3BFF] transition-all duration-500"
                style={{ width: `${Math.max(5, Math.min(100, periodMetrics.savingsRate))}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-400 shrink-0">
              {periodMetrics.savingsRate}% of income
            </span>
          </div>

          {/* Transactions Count Link */}
          <Link
            href="/transactions"
            className="flex items-center justify-between pt-3.5 mt-3 border-t border-slate-100 text-slate-600 hover:text-slate-900 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#6C3BFF] group-hover:scale-105 transition-transform" />
              <span className="text-xs font-bold text-slate-700">
                {totalRecords.toLocaleString()} transactions recorded
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* ========================================================= */}
        {/* CARD ROW 2: DUAL METRIC CARDS (EXPENSES & INCOME)         */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 gap-3">
          {/* Expenses Card */}
          <div className="rounded-2xl bg-white border border-rose-100/60 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[115px]">
            {/* Ambient soft wave glow in corner */}
            <svg
              viewBox="0 0 100 60"
              fill="none"
              className="absolute bottom-0 right-0 w-24 h-16 pointer-events-none opacity-85"
            >
              <path d="M0,60 C30,30 70,50 100,20 L100,60 Z" fill="#FEECEF" />
            </svg>

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-[#E53935] shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {chartPeriod === "WEEKLY"
                    ? "Weekly Exp."
                    : chartPeriod === "YEARLY"
                    ? "Annual Exp."
                    : "Expenses"}
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-[#E53935]">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Figures */}
            <div className="relative z-10 mt-2">
              <div className="text-xl font-black text-[#E53935] tabular-nums">
                {formatExactCurrency(periodMetrics.expenses)}
              </div>
              <span className="text-xs text-slate-400 font-medium block mt-0.5">
                {periodMetrics.expensesLabel}
              </span>
            </div>
          </div>

          {/* Income Card */}
          <div className="rounded-2xl bg-white border border-emerald-100/60 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[115px]">
            {/* Ambient soft wave glow in corner */}
            <svg
              viewBox="0 0 100 60"
              fill="none"
              className="absolute bottom-0 right-0 w-24 h-16 pointer-events-none opacity-85"
            >
              <path d="M0,60 C30,30 70,50 100,20 L100,60 Z" fill="#EAF8F1" />
            </svg>

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-[#00A86B] shrink-0">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {chartPeriod === "WEEKLY"
                    ? "Weekly Inc."
                    : chartPeriod === "YEARLY"
                    ? "Annual Inc."
                    : "Income"}
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-[#00A86B]">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Figures */}
            <div className="relative z-10 mt-2">
              <div className="text-xl font-black text-[#00A86B] tabular-nums">
                {formatExactCurrency(periodMetrics.income)}
              </div>
              <span className="text-xs text-slate-400 font-medium block mt-0.5">
                {periodMetrics.incomeLabel}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 3: CASHFLOW FLOW (BAR CHART WITH DOTTED GRIDLINES)   */}
        {/* ========================================================= */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-xs p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#F0EDF7] text-[#6C3BFF] flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Cashflow Flow
                </h4>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  Inflow vs Outflow
                </span>
              </div>
            </div>

            {/* Segmented Period Control: M | W | Y */}
            <div className="flex items-center p-0.5 rounded-xl bg-[#F0EDF7] text-xs font-bold">
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
                        ? "text-white font-black"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeChartPeriodPill"
                        className="absolute inset-0 rounded-lg bg-[#6C3BFF] shadow-2xs"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">
                      {period === "MONTHLY" ? "M" : period === "WEEKLY" ? "W" : "Y"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Tap Inspector Pill */}
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
                      {formatExactCurrency(inspectedPoint.savings)}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right text-[11px] font-bold">
                    <span className="text-emerald-600 block">
                      +{formatExactCurrency(inspectedPoint.income)}
                    </span>
                    <span className="text-rose-600 block">
                      -{formatExactCurrency(inspectedPoint.expenses)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectedPoint(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 cursor-pointer"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DOTTED GRIDLINE BAR CHART */}
          {weeklyLoading && chartPeriod === "WEEKLY" ? (
            <div className="h-44 flex items-end justify-between gap-2 pt-4 px-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 animate-pulse">
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    <div className="w-full max-w-[12px] bg-emerald-100 rounded-t-sm h-14" />
                    <div className="w-full max-w-[12px] bg-purple-100 rounded-t-sm h-24" />
                  </div>
                  <div className="w-5 h-2.5 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : activePoints.length > 0 ? (
            <div className="relative pt-2">
              <div className="relative h-44 w-full flex">
                {/* Y-Axis Labels: 6K, 5K, 4K, 3K, 2K, 1K, 0 */}
                <div className="flex flex-col justify-between text-[10px] text-slate-400 font-semibold pr-2 pb-5 h-36 shrink-0 text-right w-6">
                  <span>6K</span>
                  <span>5K</span>
                  <span>4K</span>
                  <span>3K</span>
                  <span>2K</span>
                  <span>1K</span>
                  <span>0</span>
                </div>

                {/* Chart Canvas with Horizontal Dotted Gridlines */}
                <div className="relative flex-1 h-36 flex items-end">
                  {/* 7 Horizontal Dotted Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[6, 5, 4, 3, 2, 1, 0].map((val) => (
                      <div
                        key={val}
                        className="w-full border-b border-dashed border-slate-200/90"
                      />
                    ))}
                  </div>

                  {/* Dual Bars for each month */}
                  <div className="relative z-10 w-full h-full flex items-end justify-between px-1">
                    {activePoints.map((pt, idx) => {
                      const expenseH = Math.max(6, Math.min(100, Math.round((pt.expenses / chartMax) * 100)));
                      const incomeH = Math.max(6, Math.min(100, Math.round((pt.income / chartMax) * 100)));
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
                            {/* Inflow Bar (Mint Green) */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${incomeH}%` }}
                              transition={{ type: "spring", stiffness: 320, damping: 26 }}
                              className={cn(
                                "w-full max-w-[13px] rounded-t-sm transition-colors duration-300",
                                isSelected
                                  ? "bg-[#10B981] shadow-[0_2px_8px_rgba(16,185,129,0.5)] ring-1 ring-emerald-300"
                                  : "bg-[#34D399] group-hover:bg-[#10B981]"
                              )}
                              title={`Inflow: ${formatExactCurrency(pt.income)}`}
                            />
                            {/* Outflow Bar (Purple) */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${expenseH}%` }}
                              transition={{ type: "spring", stiffness: 320, damping: 26 }}
                              className={cn(
                                "w-full max-w-[13px] rounded-t-sm transition-colors duration-300",
                                isSelected
                                  ? "bg-[#8B5CF6] shadow-[0_2px_8px_rgba(139,92,246,0.5)] ring-1 ring-purple-300"
                                  : "bg-[#A855F7] group-hover:bg-[#8B5CF6]"
                              )}
                              title={`Outflow: ${formatExactCurrency(pt.expenses)}`}
                            />
                          </div>

                          {/* Month Label */}
                          <span
                            className={cn(
                              "text-[11px] font-semibold block truncate transition-colors",
                              isSelected
                                ? "text-[#6C3BFF] font-black underline underline-offset-2"
                                : "text-slate-500 group-hover:text-slate-800"
                            )}
                          >
                            {pt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend below */}
              <div className="flex items-center gap-5 pt-3 mt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  Inflow
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                  Outflow
                </span>
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-slate-400">
              No cashflow data available.
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* ROW 4: THE 4 QUICK ACTION BUTTONS (EXACT REFERENCE STYLE) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-4 gap-2.5">
          {/* 1. Add Transaction */}
          <Link
            href="/transactions?action=new"
            className="rounded-2xl bg-white border border-slate-100/90 shadow-2xs p-3 flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#F0EDF7] text-[#6C3BFF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5 text-[#6C3BFF]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              Add<br />Transaction
            </span>
          </Link>

          {/* 2. Set Budget */}
          <button
            type="button"
            onClick={onOpenBudgetModal}
            className="rounded-2xl bg-white border border-slate-100/90 shadow-2xs p-3 flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#F0EDF7] text-[#6C3BFF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Target className="w-5 h-5 text-[#6C3BFF]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              Set<br />Budget
            </span>
          </button>

          {/* 3. Goals */}
          <button
            type="button"
            onClick={onOpenCsvModal}
            className="rounded-2xl bg-white border border-slate-100/90 shadow-2xs p-3 flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#F0EDF7] text-[#6C3BFF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Flag className="w-5 h-5 text-[#6C3BFF]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight mt-1">
              Goals
            </span>
          </button>

          {/* 4. Reports */}
          <Link
            href="/debt-lent"
            className="rounded-2xl bg-white border border-slate-100/90 shadow-2xs p-3 flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#F0EDF7] text-[#6C3BFF] flex items-center justify-center group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 text-[#6C3BFF]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight mt-1">
              Reports
            </span>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* CARD 5: CATEGORIES BREAKDOWN                              */}
        {/* ========================================================= */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-2xs p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-50 text-[#6C3BFF] border border-purple-100">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Expense by Category
              </h4>
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
                          {formatExactCurrency(amt)}
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
        {/* CARD 6: RECENT ACTIVITY                                   */}
        {/* ========================================================= */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-2xs p-4">
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
                        {formatExactCurrency(txn.amount)}
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
      </div>

      {/* ========================================================= */}
      {/* 3. MONTH SELECTOR BOTTOM SHEET DRAWER                     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showMonthPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMonthPicker(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] p-5 pb-9 shadow-2xl max-h-[75vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />

              <div className="flex items-center justify-between mb-3 shrink-0">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Select Month</h3>
                  <p className="text-xs text-slate-500">Filter entire overview by financial period</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMonthPicker(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
                {monthlyChart?.points?.map((pt) => {
                  const isCurrentSelected =
                    (selectedMonthKey && selectedMonthKey === pt.fullMonth) ||
                    (!selectedMonthKey && summary?.activeMonthKey === pt.fullMonth);

                  return (
                    <button
                      key={pt.fullMonth}
                      type="button"
                      onClick={() => {
                        onSelectMonth(pt);
                        setShowMonthPicker(false);
                      }}
                      className={cn(
                        "w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer",
                        isCurrentSelected
                          ? "bg-purple-50 border border-purple-200 text-[#6C3BFF] font-black"
                          : "bg-slate-50/70 hover:bg-slate-100 border border-slate-100 text-slate-700 font-bold"
                      )}
                    >
                      <div>
                        <span className="text-sm block">{pt.month} {pt.year || ""}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Expenses: {formatExactCurrency(pt.expenses)} · Inflow: {formatExactCurrency(pt.income)}
                        </span>
                      </div>
                      {isCurrentSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#6C3BFF] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedMonthKey && (
                <button
                  type="button"
                  onClick={() => {
                    onResetMonth();
                    setShowMonthPicker(false);
                  }}
                  className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 text-center cursor-pointer hover:bg-slate-200 transition-colors shrink-0"
                >
                  Reset to Current Month
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
