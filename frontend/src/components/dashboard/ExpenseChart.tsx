"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { motion, AnimatePresence, LayoutGroup, Variants } from "framer-motion";
import { MonthlyChartPoint, CalendarDaySummary } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Zap,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
} from "lucide-react";

export type ChartPeriod = "MONTHLY" | "WEEKLY" | "YEARLY";
export type ScaleMode = "balanced" | "standard";

export interface ChartDisplayPoint {
  label: string;
  subLabel?: string;
  key: string;
  expenses: number;
  income: number;
  savings: number;
  // Raw unadjusted figures for 100% accurate tooltips and live readouts
  rawExpenses: number;
  rawIncome: number;
  isOutlier?: boolean;
  originalPoint?: MonthlyChartPoint;
  year?: number;
  monthNumber?: number;
}

export interface ChartPeriodStats {
  period: ChartPeriod;
  title: string;
  subtitle: string;
  expenses: number;
  income: number;
  savings: number;
  count?: number;
}

interface ExpenseChartProps {
  data: MonthlyChartPoint[];
  activeMonthKey?: string | null;
  activeMonthName?: string | null;
  period?: ChartPeriod;
  onPeriodChange?: (period: ChartPeriod) => void;
  onPeriodStatsChange?: (stats: ChartPeriodStats) => void;
  onSelectMonth?: (point: MonthlyChartPoint) => void;
  onResetMonth?: () => void;
}

const slideVariants: Variants = {
  enter: (dir: string) => ({
    x: dir === "earlier" ? -280 : dir === "later" ? 280 : 0,
    opacity: 0.25,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring", stiffness: 220, damping: 24, mass: 0.8 },
      opacity: { duration: 0.25 },
    },
  },
  exit: (dir: string) => ({
    x: dir === "earlier" ? 280 : dir === "later" ? -280 : 0,
    opacity: 0,
    transition: {
      x: { type: "spring", stiffness: 220, damping: 24, mass: 0.8 },
      opacity: { duration: 0.2 },
    },
  }),
};

export default function ExpenseChart({
  data,
  activeMonthKey,
  activeMonthName,
  period: propPeriod,
  onPeriodChange,
  onPeriodStatsChange,
  onSelectMonth,
  onResetMonth,
}: ExpenseChartProps) {
  // Period toggle: Monthly | Weekly | Yearly (supports controlled via prop or internal)
  const [internalPeriod, setInternalPeriod] = useState<ChartPeriod>(propPeriod || "MONTHLY");
  const period = propPeriod ?? internalPeriod;

  useEffect(() => {
    if (propPeriod && propPeriod !== internalPeriod) {
      setInternalPeriod(propPeriod);
    }
  }, [propPeriod]);

  // Scale mode toggle: "balanced" (solves June 332k outlier flattening other months) vs "standard" (raw linear)
  const [scaleMode, setScaleMode] = useState<ScaleMode>("balanced");

  // Sliding window for Monthly view
  const windowSize = 6;
  const [startIndex, setStartIndex] = useState<number>(() => {
    if (!data || data.length <= windowSize) return 0;
    return Math.max(0, data.length - windowSize);
  });

  // Track animation direction for Earlier/Later timeline sliding vs period switching
  const [slideDirection, setSlideDirection] = useState<"earlier" | "later" | "period">("period");

  // Track currently hovered point for live header readout
  const [hoveredPoint, setHoveredPoint] = useState<ChartDisplayPoint | null>(null);

  // Weekly data cache for the active month (targetYear, targetMonth)
  const [weeklyData, setWeeklyData] = useState<ChartDisplayPoint[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // Determine active/target year and month for Weekly view
  const activePoint = useMemo(() => {
    if (!data || data.length === 0) return null;
    if (activeMonthKey) {
      return data.find((d) => d.fullMonth === activeMonthKey) || null;
    }
    // Default to latest point
    return data[data.length - 1];
  }, [data, activeMonthKey]);

  // Keep sliding window synced with activeMonthKey
  useEffect(() => {
    if (activeMonthKey && data && data.length > 0) {
      const idx = data.findIndex((d) => d.fullMonth === activeMonthKey);
      if (idx !== -1) {
        if (idx < startIndex) {
          setSlideDirection("earlier");
          setStartIndex(Math.max(0, idx));
        } else if (idx >= startIndex + windowSize) {
          setSlideDirection("later");
          setStartIndex(Math.max(0, Math.min(data.length - windowSize, idx - windowSize + 1)));
        }
      }
    }
  }, [activeMonthKey, data]);

  // Fetch and compute Weekly breakdown when switching to WEEKLY or when active month changes
  useEffect(() => {
    if (period !== "WEEKLY") return;

    const targetYear = activePoint?.year || 2026;
    const targetMonth = activePoint?.monthNumber || 10;
    const monthLabel = activePoint?.month || "Month";

    let isMounted = true;
    setWeeklyLoading(true);

    api
      .getMonthlyCalendar(targetYear, targetMonth)
      .then((days: CalendarDaySummary[]) => {
        if (!isMounted) return;

        const weeks = [
          { label: "Week 1", subLabel: `${monthLabel} 1–7`, key: "W1", exp: 0, inc: 0 },
          { label: "Week 2", subLabel: `${monthLabel} 8–14`, key: "W2", exp: 0, inc: 0 },
          { label: "Week 3", subLabel: `${monthLabel} 15–21`, key: "W3", exp: 0, inc: 0 },
          { label: "Week 4", subLabel: `${monthLabel} 22–28`, key: "W4", exp: 0, inc: 0 },
          { label: "Week 5", subLabel: `${monthLabel} 29–end`, key: "W5", exp: 0, inc: 0 },
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

        const formatted: ChartDisplayPoint[] = weeks.map((w) => ({
          label: w.label,
          subLabel: w.subLabel,
          key: `${targetYear}-${targetMonth}-${w.key}`,
          expenses: Math.round(w.exp * 100) / 100,
          income: Math.round(w.inc * 100) / 100,
          savings: Math.round((w.inc - w.exp) * 100) / 100,
          rawExpenses: Math.round(w.exp * 100) / 100,
          rawIncome: Math.round(w.inc * 100) / 100,
          year: targetYear,
          monthNumber: targetMonth,
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
  }, [period, activePoint?.year, activePoint?.monthNumber]);

  // Compute outlier threshold and capped values for Monthly view
  const { monthlyPoints, maxRegularExpense } = useMemo(() => {
    if (!data || data.length === 0) return { monthlyPoints: [], maxRegularExpense: 100000 };

    // Find the 90th percentile of expenses to detect outliers like June's 332k
    const sortedExpenses = [...data.map((d) => d.expenses)].sort((a, b) => a - b);
    const nonOutlierLimit = sortedExpenses[Math.min(sortedExpenses.length - 2, Math.floor(sortedExpenses.length * 0.85))];
    const threshold = Math.max(100000, nonOutlierLimit * 2.2);

    // Compute standard maximum for balanced scale
    const regularMax = Math.max(
      ...data.filter((d) => d.expenses < threshold).map((d) => Math.max(d.expenses, d.income)),
      80000
    );
    const balancedCeiling = Math.ceil(regularMax / 20000) * 20000;

    const points: ChartDisplayPoint[] = data.map((d) => {
      const isOutlier = d.expenses >= threshold;
      const displayExpense = scaleMode === "balanced" && isOutlier ? balancedCeiling : d.expenses;

      return {
        label: d.month,
        subLabel: `${d.month} ${d.year || ""}`,
        key: d.fullMonth,
        expenses: displayExpense,
        income: d.income,
        savings: d.savings,
        rawExpenses: d.expenses,
        rawIncome: d.income,
        isOutlier,
        originalPoint: d,
        year: d.year,
        monthNumber: d.monthNumber,
      };
    });

    return { monthlyPoints: points, maxRegularExpense: balancedCeiling };
  }, [data, scaleMode]);

  // Compute Yearly points aggregated across all months
  const yearlyPoints: ChartDisplayPoint[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    const map = new Map<number, { inc: number; exp: number }>();
    for (const d of data) {
      const y = d.year || 2026;
      const current = map.get(y) || { inc: 0, exp: 0 };
      current.inc += d.income || 0;
      current.exp += d.expenses || 0;
      map.set(y, current);
    }

    return Array.from(map.entries())
      .sort(([y1], [y2]) => y1 - y2)
      .map(([year, val]) => ({
        label: `${year}`,
        subLabel: `Full Year ${year}`,
        key: `YEAR-${year}`,
        expenses: Math.round(val.exp * 100) / 100,
        income: Math.round(val.inc * 100) / 100,
        savings: Math.round((val.inc - val.exp) * 100) / 100,
        rawExpenses: Math.round(val.exp * 100) / 100,
        rawIncome: Math.round(val.inc * 100) / 100,
        year,
      }));
  }, [data]);

  // Active dataset for the selected period
  const activeDataset: ChartDisplayPoint[] = useMemo(() => {
    if (period === "WEEKLY") return weeklyData;
    if (period === "YEARLY") return yearlyPoints;
    return monthlyPoints.slice(startIndex, startIndex + windowSize);
  }, [period, weeklyData, yearlyPoints, monthlyPoints, startIndex, windowSize]);

  // Sliding controls for Monthly: step 1 month by 1 month cleanly
  const canGoEarlier = period === "MONTHLY" && startIndex > 0;
  const canGoLater = period === "MONTHLY" && startIndex + windowSize < monthlyPoints.length;

  const handleSlideLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoEarlier) {
      setSlideDirection("earlier");
      // Shifts exactly 1 month to the left without remounting the canvas
      setStartIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleSlideRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoLater) {
      setSlideDirection("later");
      // Shifts exactly 1 month to the right without remounting the canvas
      setStartIndex((prev) => Math.min(monthlyPoints.length - windowSize, prev + 1));
    }
  };

  // Click handler to filter dashboard
  const handleItemClick = (point: ChartDisplayPoint) => {
    if (period === "MONTHLY" && point.originalPoint && onSelectMonth) {
      // Toggle if already selected
      if (activeMonthKey === point.key && onResetMonth) {
        onResetMonth();
      } else {
        onSelectMonth(point.originalPoint);
      }
    } else if (period === "WEEKLY") {
      setHoveredPoint(point);
    } else if (period === "YEARLY") {
      if (point.year && onSelectMonth) {
        const yearMonths = data.filter((d) => d.year === point.year);
        if (yearMonths.length > 0) {
          onSelectMonth(yearMonths[yearMonths.length - 1]);
        }
      }
    }
  };

  // Live Readout Display Values
  const liveStats = useMemo(() => {
    if (hoveredPoint) {
      return {
        label: hoveredPoint.subLabel || hoveredPoint.label,
        income: hoveredPoint.rawIncome,
        expenses: hoveredPoint.rawExpenses,
        savings: hoveredPoint.rawIncome - hoveredPoint.rawExpenses,
        isHovered: true,
      };
    }
    if (period === "MONTHLY" && activePoint) {
      return {
        label: `${activePoint.month} ${activePoint.year || "2026"} (Active)`,
        income: activePoint.income,
        expenses: activePoint.expenses,
        savings: activePoint.savings,
        isHovered: false,
      };
    }
    const totalInc = activeDataset.reduce((acc, curr) => acc + curr.rawIncome, 0);
    const totalExp = activeDataset.reduce((acc, curr) => acc + curr.rawExpenses, 0);
    return {
      label:
        period === "MONTHLY"
          ? `${activeDataset[0]?.label || ""} – ${activeDataset[activeDataset.length - 1]?.label || ""} Summary`
          : period === "WEEKLY"
          ? `${activePoint?.month || ""} Weekly Overview`
          : "Annual Totals",
      income: totalInc,
      expenses: totalExp,
      savings: totalInc - totalExp,
      isHovered: false,
    };
  }, [hoveredPoint, activePoint, activeDataset, period]);

  // Emit updated stats
  useEffect(() => {
    if (onPeriodStatsChange) {
      onPeriodStatsChange({
        period,
        title: liveStats.label,
        subtitle: liveStats.label,
        expenses: liveStats.expenses,
        income: liveStats.income,
        savings: liveStats.savings,
        count: undefined,
      });
    }
  }, [liveStats, period, onPeriodStatsChange, activePoint]);

  // Custom X-Axis Tick
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const pt = activeDataset.find((d) => d.label === payload.value);
    const isSelected = period === "MONTHLY" && pt && activeMonthKey === pt.key;

    return (
      <g
        transform={`translate(${x},${y})`}
        onClick={(e) => {
          e.stopPropagation();
          if (pt) handleItemClick(pt);
        }}
        className="cursor-pointer select-none group"
      >
        <text
          x={0}
          y={16}
          textAnchor="middle"
          className={cn(
            "text-[11px] transition-colors duration-150 select-none",
            isSelected
              ? "fill-[#6C3BFF] font-extrabold text-[12px]"
              : "fill-slate-500 font-semibold group-hover:fill-slate-900"
          )}
        >
          {payload.value}
        </text>
        {isSelected && (
          <rect
            x={-14}
            y={24}
            width={28}
            height={3}
            rx={1.5}
            fill="#6C3BFF"
            className="filter drop-shadow(0 1px 3px rgba(108, 59, 255, 0.5))"
          />
        )}
      </g>
    );
  };

  // Full height interactive column cursor
  const InteractiveColumnCursor = (props: any) => {
    const { x, y, width, height } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      return null;
    }
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(108, 59, 255, 0.06)"
        rx={10}
        ry={10}
        className="cursor-pointer transition-colors duration-150"
        style={{ pointerEvents: "auto", cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          if (hoveredPoint) handleItemClick(hoveredPoint);
        }}
      />
    );
  };

  return (
    <motion.div
      id="inflow-outflow-chart"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-3xl liquid-glass p-5 sm:p-6 border border-slate-200/80 shadow-xs select-none outline-none focus:outline-none"
    >
      {/* ========================================================= */}
      {/* 1. TOP HEADER: STATICALLY POSITIONED BUTTON CONTROLS      */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        {/* Left Side: Title & Dynamic Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#6C3BFF]" />
              <span>Inflow vs Outflow</span>
            </h3>

            {/* Active Month Status Badge */}
            {period === "MONTHLY" && activePoint && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#6C3BFF]/10 text-[#5228E0] border border-[#6C3BFF]/20 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6C3BFF] animate-pulse" />
                {activePoint.month} {activePoint.year || "2026"}
              </span>
            )}

            {period === "WEEKLY" && activePoint && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                <span>Weeks for: <strong>{activePoint.month} {activePoint.year || "2026"}</strong></span>
              </span>
            )}

            {/* Balanced vs Linear Scale Toggle */}
            {period === "MONTHLY" && (
              <button
                type="button"
                onClick={() => setScaleMode((m) => (m === "balanced" ? "standard" : "balanced"))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-2xs",
                  scaleMode === "balanced"
                    ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/80"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
                title={
                  scaleMode === "balanced"
                    ? "Balanced Scale is ON: June outlier is capped visually so remaining months are readable"
                    : "Linear Scale: Raw heights shown (June 332k spike compresses other months)"
                }
              >
                <Zap className={cn("w-3 h-3", scaleMode === "balanced" ? "text-amber-600" : "text-slate-400")} />
                <span>
                  {scaleMode === "balanced" ? "Balanced Scale" : "Linear Scale"}
                </span>
              </button>
            )}

            {/* Inline Reset Button (placed here so it doesn't displace the static period toggle on the right!) */}
            {activeMonthKey && onResetMonth && (
              <button
                type="button"
                onClick={onResetMonth}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer shadow-2xs transition-all active:scale-95"
                title="Reset month filter to default view"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            {period === "MONTHLY"
              ? "Click any month bar to filter the dashboard. June's spike is balanced automatically."
              : period === "WEEKLY"
              ? `Weekly breakdown of ${activePoint?.month || "month"}'s cashflow.`
              : "Annual cashflow totals and year-over-year balance."}
          </p>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SIDE: 100% STATIC ANCHORED PERIOD TOGGLE (Never jumps or shifts!)   */}
        {/* ========================================================================= */}
        <div className="shrink-0 self-start sm:self-center w-[188px]">
          <LayoutGroup id="finora-chart-periods-static">
            <div className="grid grid-cols-3 p-0.5 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-2xs relative w-full h-8 items-center">
              {(["MONTHLY", "WEEKLY", "YEARLY"] as const).map((p) => {
                const isSelected = period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSlideDirection("period");
                      setInternalPeriod(p);
                      onPeriodChange?.(p);
                    }}
                    className={cn(
                      "relative h-7 rounded-lg text-[11px] font-bold transition-colors cursor-pointer select-none outline-none flex items-center justify-center",
                      isSelected ? "text-white" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="finora-chart-period-pill-static"
                        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                        className="absolute inset-0 rounded-lg z-0 pointer-events-none"
                      >
                        <div
                          className="w-full h-full rounded-lg overflow-hidden"
                          style={{
                            background: "linear-gradient(135deg, #8F6BFF 0%, #7547F5 45%, #5228E0 100%)",
                            boxShadow: "0 2px 8px rgba(108,59,255,0.22), inset 0 1px 0 rgba(255,255,255,0.35)",
                            border: "1px solid rgba(255,255,255,0.28)",
                          }}
                        />
                      </motion.div>
                    )}
                    <span className={cn("relative z-10 capitalize font-bold", isSelected ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]" : "text-slate-600 hover:text-slate-900")}>
                      {p === "MONTHLY" ? "Monthly" : p === "WEEKLY" ? "Weekly" : "Yearly"}
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. CHART CANVAS: Physical Horizontal Slide Animation      */}
      {/* ========================================================= */}
      <div className="w-full h-72 outline-none focus:outline-none relative overflow-hidden">
        {weeklyLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-[#6C3BFF] border-t-transparent rounded-full animate-spin" />
            <span>Calculating weekly cashflow breakdown...</span>
          </div>
        ) : activeDataset.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
            No trend data available for this timeframe.
          </div>
        ) : (
          <AnimatePresence mode="popLayout" custom={slideDirection}>
            <motion.div
              key={
                period === "MONTHLY"
                  ? `month-slide-${startIndex}`
                  : period === "WEEKLY"
                  ? `week-slide-${activePoint?.fullMonth || "curr"}`
                  : `year-slide`
              }
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full h-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeDataset}
                  margin={{ top: 18, right: 10, left: -15, bottom: 12 }}
              onMouseMove={(state: any) => {
                if (state?.activeTooltipIndex !== undefined && activeDataset[state.activeTooltipIndex]) {
                  setHoveredPoint(activeDataset[state.activeTooltipIndex]);
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={(state: any) => {
                const pt =
                  (state?.activeTooltipIndex !== undefined && activeDataset[state.activeTooltipIndex]) ||
                  state?.activePayload?.[0]?.payload ||
                  hoveredPoint;
                if (pt) handleItemClick(pt);
              }}
            >
              {/* Modern Apple Liquid Glass Gradients for Inflow & Outflow */}
              <defs>
                {/* Luminous Inflow Gradient: Mint-Emerald to Forest Emerald */}
                <linearGradient id="finoraInflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#059669" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.85" />
                </linearGradient>

                {/* Refined Modern Outflow Gradient: Radiant Violet-Indigo with Coral Sheen */}
                <linearGradient id="finoraOutflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="#6366F1" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.85" />
                </linearGradient>

                {/* Active Outflow Selection Glow */}
                <linearGradient id="finoraOutflowActiveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A78BFA" stopOpacity="1" />
                  <stop offset="100%" stopColor="#6C3BFF" stopOpacity="1" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.7)" vertical={false} />

              <XAxis
                dataKey="label"
                interval={0}
                tick={<CustomXAxisTick />}
                tickLine={false}
                axisLine={{ stroke: "rgba(226, 232, 240, 0.9)" }}
              />

              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />

              {/* Professional Apple Card Floating Glass Tooltip */}
              <Tooltip
                isAnimationActive={false}
                useTranslate3d={true}
                offset={14}
                cursor={<InteractiveColumnCursor />}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const pt = payload[0].payload as ChartDisplayPoint;
                    const isCurrentActive = period === "MONTHLY" && pt.key === activeMonthKey;

                    return (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(pt);
                        }}
                        className="rounded-2xl bg-white/95 backdrop-blur-xl p-3.5 border border-slate-200/90 text-xs shadow-[0_16px_36px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.06)] min-w-[220px] select-none cursor-pointer hover:border-[#6C3BFF]/40 transition-all duration-150 pointer-events-auto"
                      >
                        {/* Tooltip Header */}
                        <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm tracking-tight leading-none">
                              {pt.subLabel || pt.label}
                            </p>
                            {pt.isOutlier && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                                <Zap className="w-2.5 h-2.5" />
                                Spike Outlier (+890%)
                              </span>
                            )}
                          </div>
                          {isCurrentActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6C3BFF] bg-[#6C3BFF]/10 border border-[#6C3BFF]/20 px-2.5 py-0.5 rounded-full shadow-2xs">
                              <span>Filter</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        {/* Amounts Breakdown */}
                        <div className="space-y-1.5">
                          {/* Inflow */}
                          <div className="flex items-center justify-between gap-4 py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" />
                              Inflow:
                            </span>
                            <span className="font-extrabold text-slate-900 tabular-nums text-xs">
                              {formatCurrency(pt.rawIncome)}
                            </span>
                          </div>

                          {/* Outflow */}
                          <div className="flex items-center justify-between gap-4 py-0.5">
                            <span className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-100 shrink-0" />
                              Outflow:
                            </span>
                            <span className="font-extrabold text-slate-900 tabular-nums text-xs">
                              {formatCurrency(pt.rawExpenses)}
                            </span>
                          </div>

                          {/* Net Savings */}
                          <div className="flex items-center justify-between gap-4 pt-1.5 mt-1 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-400 font-medium">Net Standing:</span>
                            <span
                              className={cn(
                                "font-extrabold tabular-nums text-xs",
                                pt.rawIncome - pt.rawExpenses >= 0 ? "text-emerald-600" : "text-rose-600"
                              )}
                            >
                              {pt.rawIncome - pt.rawExpenses >= 0 ? "+" : ""}
                              {formatCurrency(pt.rawIncome - pt.rawExpenses)}
                            </span>
                          </div>
                        </div>

                        {/* Click prompt footer */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-400 flex items-center justify-between">
                          <span>
                            {isCurrentActive
                              ? "Currently filtered on dashboard"
                              : period === "MONTHLY"
                              ? "Click to filter dashboard"
                              : "Click to inspect"}
                          </span>
                          {!isCurrentActive && period === "MONTHLY" && (
                            <span className="text-[#6C3BFF] font-bold bg-[#6C3BFF]/10 px-1.5 py-0.5 rounded text-[9px]">
                              Filter ↵
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Inflow Bar (Modern Emerald Gradient) */}
              <Bar
                name="Inflow"
                dataKey="income"
                fill="url(#finoraInflowGrad)"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
                cursor="pointer"
                onClick={(data: any) => handleItemClick(data)}
              >
                {activeDataset.map((entry) => {
                  const isSelected = period === "MONTHLY" && entry.key === activeMonthKey;
                  return (
                    <Cell
                      key={`income-${entry.key}`}
                      fill="url(#finoraInflowGrad)"
                      opacity={!activeMonthKey || isSelected ? 1 : 0.38}
                      stroke={isSelected ? "#047857" : "none"}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>

              {/* Outflow Bar (Modern Violet-Indigo Gradient) */}
              <Bar
                name="Outflow"
                dataKey="expenses"
                fill="url(#finoraOutflowGrad)"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
                cursor="pointer"
                onClick={(data: any) => handleItemClick(data)}
              >
                {activeDataset.map((entry) => {
                  const isSelected = period === "MONTHLY" && entry.key === activeMonthKey;
                  return (
                    <Cell
                      key={`exp-${entry.key}`}
                      fill={isSelected ? "url(#finoraOutflowActiveGrad)" : "url(#finoraOutflowGrad)"}
                      opacity={!activeMonthKey || isSelected ? 1 : 0.38}
                      stroke={isSelected ? "#5228E0" : "none"}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. FOOTER: MONTH-BY-MONTH (1 MONTH SHIFT) SLIDER          */}
      {/* ========================================================= */}
      {period === "MONTHLY" && monthlyPoints.length > 0 && (
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100/80">
          <button
            onClick={handleSlideLeft}
            disabled={!canGoEarlier}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer outline-none",
              canGoEarlier
                ? "bg-white hover:bg-indigo-50/80 active:scale-95 text-slate-700 hover:text-indigo-600 border-slate-200/90 shadow-2xs"
                : "opacity-35 text-slate-400 border-transparent cursor-not-allowed"
            )}
            title={canGoEarlier ? "Shift 1 month earlier (to left)" : "Reached earliest month"}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="text-[11px]">Earlier (-1 Mo)</span>
          </button>

          {/* Center Timeline Label */}
          <div className="text-[11px] font-semibold text-slate-400 select-none flex items-center gap-1.5">
            <span className="text-slate-700 font-bold">
              {monthlyPoints[startIndex]?.label} {monthlyPoints[startIndex]?.year}
            </span>
            <span className="text-slate-300">→</span>
            <span className="text-slate-700 font-bold">
              {monthlyPoints[Math.min(startIndex + windowSize - 1, monthlyPoints.length - 1)]?.label}{" "}
              {monthlyPoints[Math.min(startIndex + windowSize - 1, monthlyPoints.length - 1)]?.year}
            </span>
          </div>

          <button
            onClick={handleSlideRight}
            disabled={!canGoLater}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer outline-none",
              canGoLater
                ? "bg-white hover:bg-indigo-50/80 active:scale-95 text-slate-700 hover:text-indigo-600 border-slate-200/90 shadow-2xs"
                : "opacity-35 text-slate-400 border-transparent cursor-not-allowed"
            )}
            title={canGoLater ? "Shift 1 month later (to right)" : "Reached latest month"}
          >
            <span className="text-[11px]">Later (+1 Mo)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Weekly View Footer Note */}
      {period === "WEEKLY" && (
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100/80 text-xs text-slate-500">
          <span>
            Displaying all 5 weeks of <strong>{activePoint?.month} {activePoint?.year || "2026"}</strong>.
          </span>
          <span className="text-[11px] text-slate-400">
            Hover over any week to inspect exact cashflow.
          </span>
        </div>
      )}

      {/* Yearly View Footer Note */}
      {period === "YEARLY" && (
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100/80 text-xs text-slate-500">
          <span>Annual comparison across all recorded calendar years.</span>
          <span className="text-[11px] text-[#6C3BFF] font-semibold">Click any year to inspect.</span>
        </div>
      )}
    </motion.div>
  );
}
