"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
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
  Target,
  Banknote,
  Sliders,
  HandCoins,
  Wallet,
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
import { categoryToSlug } from "@/lib/category-slugs";

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
  onOpenTransactionModal?: () => void;
  onEditTransaction?: (txn: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
}

// Precise currency formatting with 2 decimal places as in the reference screenshot
const formatExactCurrency = (amt: number) => {
  return (
    "₹" +
    Math.abs(amt).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

// Dynamic chart scale calculation: calculates nice round axis intervals from actual data
function calculateDynamicChartScale(maxValue: number): {
  max: number;
  ticks: { value: number; label: string }[];
} {
  const safeMax = Math.max(maxValue, 100);

  // Desired intervals: 6 intervals (7 ticks: niceMax down to 0)
  const roughStep = safeMax / 6;
  const power = Math.floor(Math.log10(roughStep));
  const magnitude = Math.pow(10, power);
  const fraction = roughStep / magnitude;

  let niceStepFactor: number;
  if (fraction <= 1.2) niceStepFactor = 1;
  else if (fraction <= 2.2) niceStepFactor = 2;
  else if (fraction <= 3.2) niceStepFactor = 2.5;
  else if (fraction <= 6) niceStepFactor = 5;
  else niceStepFactor = 10;

  const step = niceStepFactor * magnitude;
  const niceMax = Math.ceil(safeMax / step) * step;

  const formatTick = (val: number): string => {
    if (val === 0) return "0";
    if (val >= 10000000) return `${+(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) {
      const inLakhs = +(val / 100000).toFixed(1);
      return `${inLakhs}L`;
    }
    if (val >= 1000) {
      const inK = +(val / 1000).toFixed(1);
      return `${inK.toString().replace(".0", "")}K`;
    }
    return val.toString();
  };

  const ticks: { value: number; label: string }[] = [];
  const count = Math.max(1, Math.round(niceMax / step));
  for (let i = count; i >= 0; i--) {
    const val = Math.round(i * step);
    ticks.push({
      value: val,
      label: formatTick(val),
    });
  }

  return {
    max: niceMax,
    ticks,
  };
}

// Exact stacked-coins cylinder icon from reference
function StackedCoinsIcon({ className = "w-4 h-4 text-[#7C3AED]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="8" cy="7" rx="6" ry="2.2" />
      <path d="M2 7v3.5c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V7" />
      <path d="M2 10.5V14c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-3.5" />
      <path d="M2 14v3.5c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V14" />
      <ellipse cx="16" cy="11" rx="5" ry="2" />
      <path d="M14 13v3c.5.8 2 1.5 4 1.5s3.5-.7 4-1.5v-3" />
      <path d="M14 16v3c.5.8 2 1.5 4 1.5s3.5-.7 4-1.5v-3" />
    </svg>
  );
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
  onOpenTransactionModal,
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
  const [chartPalette, setChartPalette] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setChartPalette(localStorage.getItem("finora_chart_palette") || "default");
      const handlePaletteChange = (e: any) => {
        setChartPalette(e.detail || localStorage.getItem("finora_chart_palette") || "default");
      };
      window.addEventListener("finora-chart-palette-changed", handlePaletteChange);
      return () => window.removeEventListener("finora-chart-palette-changed", handlePaletteChange);
    }
  }, []);

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

  // 3. WEEKLY DATASET: Display ALL applicable weeks (W1 to W5 or W4)
  const [weeklyData, setWeeklyData] = useState<MobileChartPoint[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  useEffect(() => {
    if (chartPeriod !== "WEEKLY") return;

    let isMounted = true;
    setWeeklyLoading(true);

    const totalDaysInMonth = new Date(activeYear, activeMonth, 0).getDate();
    const monthName = selectedMonthName || summary?.activeMonthName || "November";
    const shortMonth = monthName.slice(0, 3);
    const numWeeks = totalDaysInMonth > 28 ? 5 : 4;

    const initialWeeks: {
      label: string;
      subLabel: string;
      dateRange: string;
      key: string;
      exp: number;
      inc: number;
    }[] = [];
    for (let w = 1; w <= numWeeks; w++) {
      const startDay = (w - 1) * 7 + 1;
      const endDay = w === numWeeks ? totalDaysInMonth : w * 7;
      initialWeeks.push({
        label: `W${w}`,
        subLabel: `Week ${w} (${shortMonth} ${startDay}–${endDay})`,
        dateRange: `${shortMonth} ${startDay}–${endDay}`,
        key: `W${w}`,
        exp: 0,
        inc: 0,
      });
    }

    // Set skeleton/initial points immediately to prevent layout shift
    setWeeklyData(
      initialWeeks.map((w) => ({
        id: `${activeYear}-${activeMonth}-${w.key}`,
        label: w.label,
        subLabel: w.subLabel,
        dateRangeLabel: w.dateRange,
        expenses: 0,
        income: 0,
        savings: 0,
        year: activeYear,
        monthNumber: activeMonth,
      }))
    );

    api
      .getMonthlyCalendar(activeYear, activeMonth)
      .then((days: CalendarDaySummary[]) => {
        if (!isMounted) return;

        const weeksCopy = initialWeeks.map((w) => ({ ...w, exp: 0, inc: 0 }));

        for (const d of days || []) {
          const day = d.dayOfMonth || (d.date ? parseInt(d.date.split("-")[2], 10) : 0);
          if (!day || day < 1 || day > totalDaysInMonth) continue;

          let wIdx = Math.floor((day - 1) / 7);
          if (wIdx >= numWeeks) wIdx = numWeeks - 1;

          weeksCopy[wIdx].exp += d.totalExpense || 0;
          weeksCopy[wIdx].inc += d.totalIncome || 0;
        }

        const formatted: MobileChartPoint[] = weeksCopy.map((w) => ({
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

  // Baseline figures from summary
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

  // Dynamic Chart Scale calculation: Never hardcoded to 6K!
  const chartScale = useMemo(() => {
    const rawMax = Math.max(
      ...activePoints.map((p) => Math.max(p.expenses || 0, p.income || 0)),
      0
    );
    return calculateDynamicChartScale(rawMax);
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
    <div className="md:hidden pb-32 select-none bg-[#F6F4FA] min-h-screen relative">
      {/* ========================================================================= */}
      {/* 1. EXACT PURPLE HERO BANNER WITH FLOWING MULTI-LAYER CURVES & GOLDEN WAVES */}
      {/* ========================================================================= */}
      {/* Top mobile overscroll guard: eliminates any white gap near time/battery */}
      <div className="fixed -top-96 left-0 right-0 h-96 bg-[#230348] z-0 pointer-events-none" />
      <div
        className="fixed top-0 left-0 right-0 z-30 pointer-events-none"
        style={{ height: "max(env(safe-area-inset-top, 0px), 48px)", backgroundColor: "#230348" }}
      />

      <div
        className="relative pt-[calc(env(safe-area-inset-top)+14px)] pb-16 px-5 overflow-visible bg-[#230348]"
        style={{ backgroundColor: "#230348" }}
      >
        {/* Seamless upward extension matching exact deep purple (#230348) of hero banner */}
        <div className="absolute -top-48 inset-x-0 h-48 bg-[#230348] pointer-events-none select-none" />

        {/* Exact Master Artwork: Flowing Curved Purple Background with Golden Illuminated Contours */}
        <div className="absolute inset-0 w-full h-[260px] pointer-events-none select-none">
          <Image
            src="/images/finora-hero-curved-banner.png"
            alt="Hero Curved Banner"
            fill
            priority
            sizes="100vw"
            className="object-fill object-top select-none pointer-events-none"
          />
        </div>

        {/* TOP BRAND BAR */}
        <div className="flex items-center justify-between gap-3 relative z-20">
          {/* Exact Original Finora Logo Asset (F Ribbon + Finora + BY PAYTRACE) */}
          <Link href="/" className="flex items-center shrink-0 group">
            <div className="relative flex items-center" style={{ width: "126px", height: "32px" }}>
              <Image
                src="/images/finora-logo-white.png"
                alt="Finora BY PAYTRACE"
                width={126}
                height={32}
                priority
                style={{ width: "126px", height: "32px", objectFit: "contain" }}
                className="select-none transition-transform duration-200 group-hover:scale-[1.02]"
              />
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
              className="w-9 h-9 rounded-full bg-[#8E44EC] border border-white/30 flex items-center justify-center text-white font-extrabold text-xs shadow-md cursor-pointer active:scale-95 transition-transform"
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
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-purple-200/90 uppercase hover:text-white transition-colors cursor-pointer select-none"
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
      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING CONTENT BODY (OVERLAPPING THE FLOWING PURPLE HERO WAVES)       */}
      {/* ========================================================================= */}
      <div className="px-4 -mt-10 relative z-30 space-y-3.5">
        {/* ========================================================= */}
        {/* CARD 1: NET MONTHLY SAVINGS HERO CARD                     */}
        {/* ========================================================= */}
        <div className="rounded-[28px] bg-white border border-purple-100/60 shadow-[0_12px_36px_rgba(26,4,54,0.08)] p-5 relative overflow-hidden">
          {/* Card Top Row */}
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  periodMetrics.savings < 0
                    ? "bg-[#FEECEF] text-[#E11D48] border border-rose-200/50"
                    : "bg-[#EAF8F1] text-[#10B981] border border-emerald-200/50"
                )}
              >
                <Wallet
                  className={cn(
                    "w-4 h-4",
                    periodMetrics.savings < 0 ? "text-[#E11D48]" : "text-[#10B981]"
                  )}
                />
              </div>
              <span className="font-bold text-slate-800 text-sm">
                {periodMetrics.heroTitle}
              </span>
            </div>

            {/* Status Badge: Deficit vs Surplus */}
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors",
                periodMetrics.savings < 0
                  ? "bg-[#FEECEF] border border-rose-200/50 text-[#E11D48]"
                  : "bg-[#EAF8F1] border border-emerald-200/50 text-[#10B981]"
              )}
            >
              {periodMetrics.savings < 0 ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5 text-[#E11D48]" />
                  <span>Deficit</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Surplus</span>
                </>
              )}
            </span>
          </div>

          {/* Large Tabular Financial Amount */}
          <div className="mt-1">
            <span
              className={cn(
                "text-3xl sm:text-4xl font-black tracking-tight tabular-nums",
                periodMetrics.savings < 0 ? "text-[#E11D48]" : "text-[#10B981]"
              )}
            >
              {periodMetrics.savings < 0 ? "-" : "+"}
              {formatExactCurrency(periodMetrics.savings)}
            </span>
          </div>

          {/* Progress Bar & Rate of Income */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-2 bg-[#EBE7F5] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#7C3AED] transition-all duration-500"
                style={{ width: `${Math.max(5, Math.min(100, periodMetrics.savingsRate))}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              {periodMetrics.savingsRate}% of income
            </span>
          </div>

          {/* Transactions Count Link */}
          <Link
            href="/transactions"
            className="flex items-center justify-between pt-3.5 mt-3 border-t border-slate-100 text-slate-600 hover:text-slate-900 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7C3AED] group-hover:scale-105 transition-transform" />
              <span className="text-xs font-semibold text-slate-600">
                {totalRecords.toLocaleString()} transactions recorded
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* ========================================================= */}
        {/* CARD ROW 2: DUAL METRIC CARDS (EXPENSES & INCOME)         */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Expenses Card */}
          <div className="rounded-[24px] bg-[#FFF8F9] border border-rose-100/80 p-4 shadow-[0_8px_24px_rgba(225,29,72,0.04)] relative overflow-hidden flex flex-col justify-between min-h-[124px]">
            {/* Ambient soft wave along bottom right */}
            <svg
              viewBox="0 0 100 60"
              fill="none"
              className="absolute bottom-0 right-0 w-28 h-16 pointer-events-none opacity-90"
            >
              <path d="M0,60 C35,35 65,52 100,18 L100,60 Z" fill="#FEECEF" />
            </svg>

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-[#E11D48] shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {chartPeriod === "WEEKLY"
                    ? "Weekly Exp."
                    : chartPeriod === "YEARLY"
                    ? "Annual Exp."
                    : "Expenses"}
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#FEECEF] flex items-center justify-center text-[#E11D48]">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Figures */}
            <div className="relative z-10 mt-2">
              <div className="text-[22px] font-black text-[#E11D48] tracking-tight tabular-nums">
                {formatExactCurrency(periodMetrics.expenses)}
              </div>
              <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                {periodMetrics.expensesLabel}
              </span>
            </div>
          </div>

          {/* Income Card */}
          <div className="rounded-[24px] bg-[#F7FCF9] border border-emerald-100/80 p-4 shadow-[0_8px_24px_rgba(16,185,129,0.04)] relative overflow-hidden flex flex-col justify-between min-h-[124px]">
            {/* Ambient soft wave along bottom right */}
            <svg
              viewBox="0 0 100 60"
              fill="none"
              className="absolute bottom-0 right-0 w-28 h-16 pointer-events-none opacity-90"
            >
              <path d="M0,60 C35,35 65,52 100,18 L100,60 Z" fill="#EAF8F1" />
            </svg>

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-[#059669] shrink-0">
                  <Banknote className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {chartPeriod === "WEEKLY"
                    ? "Weekly Inc."
                    : chartPeriod === "YEARLY"
                    ? "Annual Inc."
                    : "Income"}
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#EAF8F1] flex items-center justify-center text-[#059669]">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Figures */}
            <div className="relative z-10 mt-2">
              <div className="text-[22px] font-black text-[#059669] tracking-tight tabular-nums">
                {formatExactCurrency(periodMetrics.income)}
              </div>
              <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                {periodMetrics.incomeLabel}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 3: CASHFLOW FLOW (DYNAMIC Y-AXIS & ALL WEEKS)        */}
        {/* ========================================================= */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-xs p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#F0EDF7] text-[#7C3AED] flex items-center justify-center">
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
                        className="absolute inset-0 rounded-lg bg-[#7C3AED] shadow-2xs"
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
                    <Sparkles className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
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

          {/* DOTTED GRIDLINE BAR CHART WITH DYNAMIC Y-AXIS */}
          {weeklyLoading && chartPeriod === "WEEKLY" && weeklyData.length === 0 ? (
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
                {/* Dynamically Generated Y-Axis Labels matching ticks */}
                <div className="flex flex-col justify-between text-[10px] text-slate-400 font-semibold pr-2 pb-5 h-36 shrink-0 text-right w-7">
                  {chartScale.ticks.map((tick) => (
                    <span key={tick.value}>{tick.label}</span>
                  ))}
                </div>

                {/* Chart Canvas with Dynamic Horizontal Dotted Gridlines */}
                <div className="relative flex-1 h-36 flex items-end">
                  {/* Horizontal Dotted Lines matching dynamic ticks */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
                    {chartScale.ticks.map((tick) => (
                      <div
                        key={tick.value}
                        className="w-full border-b border-dashed border-slate-200/90"
                      />
                    ))}
                  </div>

                  {/* Grouped Inflow (Green) & Outflow (Purple) Bars */}
                  <div className="relative z-10 w-full h-full flex items-end justify-between px-1">
                    {activePoints.map((pt, idx) => {
                      const expenseH =
                        pt.expenses > 0
                          ? Math.max(4, Math.min(100, Math.round((pt.expenses / chartScale.max) * 100)))
                          : 0;
                      const incomeH =
                        pt.income > 0
                          ? Math.max(4, Math.min(100, Math.round((pt.income / chartScale.max) * 100)))
                          : 0;

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
                                  : "bg-[#10B981] group-hover:bg-[#059669]"
                              )}
                              title={`Inflow: ${formatExactCurrency(pt.income)}`}
                            />
                            {/* Outflow Bar (Purple or Red according to chartPalette) */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${expenseH}%` }}
                              transition={{ type: "spring", stiffness: 320, damping: 26 }}
                              className={cn(
                                "w-full max-w-[13px] rounded-t-sm transition-colors duration-300",
                                chartPalette === "red-green"
                                  ? isSelected
                                    ? "bg-[#E11D48] shadow-[0_2px_8px_rgba(225,29,72,0.5)] ring-1 ring-rose-300"
                                    : "bg-[#E11D48] group-hover:bg-[#BE123C]"
                                  : isSelected
                                  ? "bg-[#8B5CF6] shadow-[0_2px_8px_rgba(139,92,246,0.5)] ring-1 ring-purple-300"
                                  : "bg-[#8B5CF6] group-hover:bg-[#7C3AED]"
                              )}
                              title={`Outflow: ${formatExactCurrency(pt.expenses)}`}
                            />
                          </div>

                          {/* Month / Week Label */}
                          <span
                            className={cn(
                              "text-[11px] font-semibold block truncate transition-colors",
                              isSelected
                                ? "text-[#7C3AED] font-black underline underline-offset-2"
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
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      chartPalette === "red-green" ? "bg-[#E11D48]" : "bg-[#8B5CF6]"
                    )}
                  />
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
        {/* ROW 4: THE EXACT 4 QUICK ACTION BUTTONS                   */}
        {/* 1. Add Transaction | 2. Set Budget | 3. Upload CSV | 4. Debt & Lent */}
        {/* ========================================================= */}
        <div className="grid grid-cols-4 gap-2.5">
          {/* 1. Add Transaction */}
          <button
            type="button"
            onClick={() => {
              if (onOpenTransactionModal) {
                onOpenTransactionModal();
              } else if (typeof window !== "undefined") {
                window.location.href = "/transactions?action=new";
              }
            }}
            className="rounded-2xl bg-white border border-slate-100/90 shadow-2xs p-2.5 flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              Add<br />Transaction
            </span>
          </button>

          {/* 2. Set Budget */}
          <button
            type="button"
            onClick={onOpenBudgetModal}
            className="rounded-2xl bg-white border border-slate-100/90 shadow-2xs p-2.5 flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Target className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              Set<br />Budget
            </span>
          </button>

          {/* 3. Upload CSV */}
          <button
            type="button"
            onClick={onOpenCsvModal}
            className="rounded-2xl bg-white border border-slate-100/90 shadow-2xs p-2.5 flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              Upload<br />CSV
            </span>
          </button>

          {/* 4. Debt & Lent */}
          <Link
            href="/debt-lent"
            className="rounded-2xl bg-white border border-slate-100/90 shadow-2xs p-2.5 flex flex-col items-center justify-center text-center gap-2 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center group-hover:scale-105 transition-transform">
              <HandCoins className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              Debt &amp;<br />Lent
            </span>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* CARD 5: CATEGORIES BREAKDOWN                              */}
        {/* ========================================================= */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-2xs p-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/dashboard/expenses/categories"
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-purple-50 text-[#7C3AED] border border-purple-100 group-hover:scale-105 transition-transform">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight group-hover:text-[#7C3AED] transition-colors">
                  Expense by Category
                </h4>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            <button
              type="button"
              onClick={onOpenBudgetModal}
              className="text-[11px] font-bold text-[#7C3AED] flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Sliders className="w-3 h-3" />
              <span>Limits</span>
            </button>
          </div>

          {/* Category Rows (Top 4 Preview with Direct Navigation to Dedicated Module) */}
          {categoryEntries.length > 0 ? (
            <div className="space-y-2">
              {categoryEntries.slice(0, 4).map(([cat, amt]) => {
                const pct = Math.min(100, Math.round((amt / totalCatExpenses) * 100));
                const theme = getCategoryTheme(cat);
                const CategoryIcon = theme.icon;

                return (
                  <Link
                    key={cat}
                    href={`/dashboard/expenses/categories/${categoryToSlug(cat)}`}
                    className="block space-y-1 py-1 group cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center shrink-0 border border-slate-200/50 group-hover:scale-105 transition-transform",
                            theme.bgLight,
                            theme.iconClass
                          )}
                        >
                          <CategoryIcon className="w-3 h-3" />
                        </div>
                        <span className="font-bold text-slate-800 text-xs truncate group-hover:text-[#7C3AED] transition-colors">
                          {cat}
                        </span>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-1">
                        <span className="font-bold text-slate-900 text-xs">
                          {formatExactCurrency(amt)}
                        </span>
                        <span className="text-[10px] text-slate-400">({pct}%)</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-[#7C3AED] transition-colors" />
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r", theme.gradient)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}

              {/* Dedicated Page Navigation Button */}
              <Link
                href="/dashboard/expenses/categories"
                className="w-full py-2.5 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-100/80 text-[11px] font-bold text-[#7C3AED] flex items-center justify-center gap-1.5 transition-colors mt-2.5 active:scale-98"
              >
                <span>View Full Expense Analytics ({categoryEntries.length} Categories)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
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
              className="text-[11px] font-bold text-[#7C3AED] hover:underline"
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
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 cursor-pointer"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[32px] p-5 pb-8 z-50 shadow-2xl border-t border-slate-100"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-slate-900">
                  Select Billing Cycle
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMonthPicker(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {monthlyChart?.points?.map((pt) => {
                  const isSelected = selectedMonthKey === pt.fullMonth;
                  return (
                    <button
                      key={pt.fullMonth}
                      type="button"
                      onClick={() => {
                        onSelectMonth(pt);
                        setShowMonthPicker(false);
                      }}
                      className={cn(
                        "py-3 px-2 rounded-2xl text-center border transition-all cursor-pointer",
                        isSelected
                          ? "bg-purple-50/90 border-[#7C3AED] text-[#7C3AED] font-extrabold shadow-xs ring-1 ring-[#7C3AED]"
                          : "border-slate-100 bg-slate-50/50 text-slate-700 hover:bg-slate-100 font-semibold"
                      )}
                    >
                      <span className="block text-sm">{pt.month}</span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        {pt.year || 2026}
                      </span>
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
                  className="w-full mt-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Reset to Current Month
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 4. TRANSACTION DETAILS BOTTOM SHEET                       */}
      {/* ========================================================= */}
      {selectedTxn && (
        <MobileTransactionSheet
          transaction={selectedTxn}
          isOpen={!!selectedTxn}
          onClose={() => setSelectedTxn(null)}
          onEdit={() => {
            if (onEditTransaction) onEditTransaction(selectedTxn);
            setSelectedTxn(null);
          }}
          onDelete={() => {
            if (onDeleteTransaction) onDeleteTransaction(selectedTxn.id);
            setSelectedTxn(null);
          }}
        />
      )}
    </div>
  );
}
