"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { CategoryBudgetStatus, OverallBudgetInfo, BudgetSummaryResponse } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import CategoryBadge from "@/components/common/CategoryBadge";
import {
  X,
  Check,
  Target,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Percent,
  IndianRupee,
  Sparkles,
  ArrowRight,
  Wallet,
  ShieldCheck,
  Zap,
  PlusCircle,
  Filter,
} from "lucide-react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PRESET_OVERALL_BUDGETS = [25000, 50000, 75000, 100000];

interface CategoryBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  year?: number;
  month?: number;
  monthName?: string;
  totalExpenses?: number;
}

interface LocalLimit {
  category: string;
  limitType: "RUPEES" | "PERCENTAGE";
  limitValue: string;
  hasLimit: boolean;
  currentSpend: number;
  inherited?: boolean;
}

export default function CategoryBudgetModal({
  isOpen,
  onClose,
  onUpdated,
  year: propYear,
  month: propMonth,
  monthName: propMonthName,
  totalExpenses = 0,
}: CategoryBudgetModalProps) {
  const [mounted, setMounted] = useState(false);

  // Safe initial defaults (deterministic to prevent Next.js SSR/prerender mismatch)
  const [activeYear, setActiveYear] = useState<number>(propYear || 2026);
  const [activeMonth, setActiveMonth] = useState<number>(propMonth || 10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [overallBudgetInput, setOverallBudgetInput] = useState<string>("");
  const [overallBudget, setOverallBudget] = useState<OverallBudgetInfo | null>(null);
  const [limits, setLimits] = useState<LocalLimit[]>([]);
  const [isPastMonth, setIsPastMonth] = useState(false);
  const [applyToUpcoming, setApplyToUpcoming] = useState(true);

  // Filter state for category listing: all, active, uncapped
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "ACTIVE" | "UNCAPPED">("ALL");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Manage body scroll and class when modal is open to ensure clean stacking
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    }
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Sync props when modal opens (safe inside useEffect for client execution)
  useEffect(() => {
    if (isOpen) {
      if (propYear && propMonth) {
        setActiveYear(propYear);
        setActiveMonth(propMonth);
      } else {
        const d = new Date();
        setActiveYear(d.getFullYear());
        setActiveMonth(d.getMonth() + 1);
      }
    }
  }, [isOpen, propYear, propMonth]);

  const loadBudgetsForMonth = (y: number, m: number) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    api.getBudgetSummary(y, m)
      .then((summary: BudgetSummaryResponse) => {
        const past = summary.overallBudget?.pastMonth || (summary.categories.length > 0 && summary.categories[0].pastMonth);
        setIsPastMonth(!!past);

        if (summary.overallBudget && summary.overallBudget.hasLimit && summary.overallBudget.limitValue > 0) {
          setOverallBudgetInput(summary.overallBudget.limitValue.toString());
          setOverallBudget(summary.overallBudget);
        } else {
          setOverallBudgetInput("");
          setOverallBudget(summary.overallBudget || null);
        }

        const localList: LocalLimit[] = summary.categories.map((b) => ({
          category: b.category,
          limitType: (b.limitType as "RUPEES" | "PERCENTAGE") || "RUPEES",
          limitValue: b.hasLimit && b.limitValue ? b.limitValue.toString() : "",
          hasLimit: b.hasLimit,
          currentSpend: b.currentSpend || 0,
          inherited: !!b.inherited,
        }));
        setLimits(localList);
      })
      .catch((err) => {
        setError(err.message || "Failed to load budget limits");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    loadBudgetsForMonth(activeYear, activeMonth);
  }, [isOpen, activeYear, activeMonth]);

  // Total allocated across individual category rupee caps
  const totalAllocatedRupees = useMemo(() => {
    return limits.reduce((acc, item) => {
      if (item.limitType === "RUPEES" && item.limitValue.trim()) {
        const val = parseFloat(item.limitValue) || 0;
        return acc + val;
      }
      return acc;
    }, 0);
  }, [limits]);

  const numOverall = parseFloat(overallBudgetInput) || 0;
  const isMismatch = numOverall > 0 && totalAllocatedRupees > numOverall;
  const mismatchAmount = totalAllocatedRupees - numOverall;
  const unallocatedBuffer = numOverall > totalAllocatedRupees ? numOverall - totalAllocatedRupees : 0;
  const allocationPercent = numOverall > 0 ? Math.min(100, Math.round((totalAllocatedRupees / numOverall) * 100)) : 0;
  const bufferPercent = numOverall > 0 ? Math.max(0, 100 - allocationPercent) : 0;

  if (!isOpen || !mounted) return null;

  const displayMonthName =
    activeMonth >= 1 && activeMonth <= 12
      ? `${MONTH_NAMES[activeMonth - 1]} ${activeYear}`
      : `${activeYear}-${activeMonth}`;

  const handlePrevMonth = () => {
    if (activeMonth === 1) {
      setActiveYear((prev) => prev - 1);
      setActiveMonth(12);
    } else {
      setActiveMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth === 12) {
      setActiveYear((prev) => prev + 1);
      setActiveMonth(1);
    } else {
      setActiveMonth((prev) => prev + 1);
    }
  };

  const handleJumpToCurrentMonth = () => {
    const d = new Date();
    setActiveYear(propYear || d.getFullYear());
    setActiveMonth(propMonth || (d.getMonth() + 1));
  };

  const handleAutoAdjustOverall = () => {
    setOverallBudgetInput(totalAllocatedRupees.toString());
  };

  const handleLimitTypeChange = (category: string, type: "RUPEES" | "PERCENTAGE") => {
    if (isPastMonth) return;
    setLimits((prev) =>
      prev.map((item) => {
        if (item.category !== category) return item;
        return {
          ...item,
          limitType: type,
        };
      })
    );
  };

  const handleLimitValueChange = (category: string, val: string) => {
    if (isPastMonth) return;
    setLimits((prev) =>
      prev.map((item) => {
        if (item.category !== category) return item;
        const hasVal = val.trim().length > 0 && parseFloat(val) > 0;
        return {
          ...item,
          limitValue: val,
          hasLimit: hasVal,
          inherited: false,
        };
      })
    );
  };

  const handleRemoveLimit = (category: string) => {
    if (isPastMonth) return;
    setLimits((prev) =>
      prev.map((item) => {
        if (item.category !== category) return item;
        return {
          ...item,
          limitValue: "",
          hasLimit: false,
          inherited: false,
        };
      })
    );
  };

  const handleSave = async () => {
    if (isPastMonth) return;

    if (numOverall > 0 && totalAllocatedRupees > numOverall) {
      setError(
        `Overall monthly budget (₹${numOverall.toLocaleString()}) cannot be less than total category allocations (₹${totalAllocatedRupees.toLocaleString()}). Please increase the overall budget or reduce category allocations.`
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const bulkRequests = limits.map((l) => ({
        category: l.category,
        limitType: l.limitType,
        limitValue: l.hasLimit && l.limitValue ? parseFloat(l.limitValue) : 0,
      }));

      await api.saveCategoryBudgetsBulk({
        year: activeYear,
        month: activeMonth,
        applyToUpcoming: applyToUpcoming,
        overallLimit: numOverall,
        budgets: bulkRequests,
      });

      setSuccessMsg(
        applyToUpcoming
          ? `Budget limits saved for ${displayMonthName} & applied to upcoming months!`
          : `Budget limits saved strictly for ${displayMonthName}!`
      );

      if (onUpdated) {
        onUpdated();
      }

      setTimeout(() => {
        onClose();
      }, 750);
    } catch (err: any) {
      setError(err.message || "Failed to save budget limits");
    } finally {
      setSaving(false);
    }
  };

  // Filtered limits list based on active tab
  const filteredLimits = limits.filter((l) => {
    if (categoryFilter === "ACTIVE") return l.hasLimit;
    if (categoryFilter === "UNCAPPED") return !l.hasLimit;
    return true;
  });

  const activeCount = limits.filter((l) => l.hasLimit).length;
  const uncappedCount = limits.length - activeCount;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[84vh] rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Monthly Budget Limits
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure overall monthly spending ceiling and category allocations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unified Month Selector Control */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-2xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-xs text-slate-800 px-2 min-w-[110px] text-center select-none">
                {displayMonthName}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {isPastMonth && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Past Month Locked:</strong> Historical budget records are read-only and cannot be modified.
              </span>
            </div>
            <button
              type="button"
              onClick={handleJumpToCurrentMonth}
              className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Current Month</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
          {/* SECTION 1: Minimal Monthly Budget Card */}
          <div className="rounded-3xl p-5 bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#6C3BFF]/10 text-[#6C3BFF]">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Monthly Budget
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Your spending target for {displayMonthName}
                </p>
              </div>

              {/* Clean Currency Input without browser stepper arrows */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl border transition-all bg-slate-50/70",
                    isMismatch
                      ? "border-rose-300 ring-2 ring-rose-200 bg-rose-50/50"
                      : isPastMonth
                      ? "border-slate-200 cursor-not-allowed bg-slate-100"
                      : "border-slate-200 focus-within:border-[#6C3BFF] focus-within:ring-2 focus-within:ring-[#6C3BFF]/15 focus-within:bg-white"
                  )}
                >
                  <span className="text-base font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    disabled={isPastMonth}
                    min="0"
                    step="500"
                    placeholder="50000"
                    value={overallBudgetInput}
                    onChange={(e) => setOverallBudgetInput(e.target.value)}
                    className="w-28 sm:w-36 text-right font-extrabold text-lg text-slate-900 bg-transparent outline-none placeholder:text-slate-300 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {overallBudgetInput && !isPastMonth && (
                    <button
                      type="button"
                      onClick={() => setOverallBudgetInput("")}
                      title="Clear budget"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Preset Buttons (Easy terms) */}
            {!isPastMonth && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-xs text-slate-400 font-medium">Quick set:</span>
                {PRESET_OVERALL_BUDGETS.map((amt) => {
                  const isSelected = numOverall === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOverallBudgetInput(amt.toString())}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        isSelected
                          ? "bg-[#6C3BFF] text-white shadow-2xs"
                          : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                      )}
                    >
                      ₹{(amt / 1000).toLocaleString()}k
                    </button>
                  );
                })}
                {totalAllocatedRupees > 0 && numOverall !== totalAllocatedRupees && (
                  <button
                    type="button"
                    onClick={handleAutoAdjustOverall}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-[#6C3BFF]/10 hover:bg-[#6C3BFF]/15 text-[#5228E0] transition-colors cursor-pointer ml-auto"
                  >
                    Use categories total (₹{totalAllocatedRupees.toLocaleString()})
                  </button>
                )}
              </div>
            )}

            {/* Simple, Minimal Progress & Plain-English Metrics */}
            {numOverall > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">
                    Categories: <strong className="text-slate-900">{formatCurrency(totalAllocatedRupees)}</strong>
                  </span>
                  <span className={cn("font-bold", isMismatch ? "text-rose-600" : "text-emerald-700")}>
                    {isMismatch
                      ? `Over budget by ${formatCurrency(mismatchAmount)}`
                      : `Left over: ${formatCurrency(unallocatedBuffer)}`}
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isMismatch ? "bg-rose-500" : "bg-[#6C3BFF]"
                    )}
                    style={{ width: `${Math.min(100, allocationPercent)}%` }}
                  />
                  {!isMismatch && unallocatedBuffer > 0 && (
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${bufferPercent}%` }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                No monthly budget set. Enter an amount above or pick a quick option.
              </p>
            )}

            {/* Simple Mismatch Notification */}
            {isMismatch && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>
                    Category limits exceed monthly budget by <strong>{formatCurrency(mismatchAmount)}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoAdjustOverall}
                  className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                >
                  Set to {formatCurrency(totalAllocatedRupees)}
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: Category Limits with Filter Tabs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Category Limits
                </h4>
                <p className="text-[11px] text-slate-500">
                  {activeCount} of {limits.length} categories have limits set
                </p>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("ALL")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    categoryFilter === "ALL"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({limits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("ACTIVE")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    categoryFilter === "ACTIVE"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("UNCAPPED")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    categoryFilter === "UNCAPPED"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Uncapped ({uncappedCount})
                </button>
              </div>
            </div>

            {/* Category Cards List */}
            <div className="space-y-2.5">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading category limits...</span>
                </div>
              ) : filteredLimits.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  {categoryFilter === "ACTIVE"
                    ? "No category budget limits configured yet. Switch to 'All' or 'Uncapped' to add one."
                    : "All categories currently have spending limits configured!"}
                </div>
              ) : (
                filteredLimits.map((item) => {
                  const numVal = parseFloat(item.limitValue) || 0;
                  const computedLimit =
                    item.limitType === "PERCENTAGE"
                      ? numOverall > 0
                        ? Math.round((numOverall * numVal) / 100)
                        : totalExpenses > 0
                        ? Math.round((totalExpenses * numVal) / 100)
                        : 0
                      : numVal;

                  const pctUsed =
                    computedLimit > 0
                      ? Math.min(200, Math.round((item.currentSpend / computedLimit) * 100))
                      : 0;

                  const isOver = item.hasLimit && computedLimit > 0 && item.currentSpend > computedLimit;
                  const isWarning = item.hasLimit && !isOver && pctUsed >= 80;

                  return (
                    <div
                      key={item.category}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        item.hasLimit
                          ? "bg-white border-indigo-100 shadow-2xs hover:border-indigo-200"
                          : "bg-slate-50/60 border-slate-200/70 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Category Info & Monthly Spend */}
                        <div className="space-y-1 sm:w-1/3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CategoryBadge category={item.category} />
                            {item.inherited && item.hasLimit && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 border border-indigo-200"
                                title="Inherited from earlier month"
                              >
                                Inherited
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Spent:{" "}
                            <span className="font-bold text-slate-800">
                              {formatCurrency(item.currentSpend)}
                            </span>
                          </div>
                        </div>

                        {/* Controls (Clean pill toggle + input group) */}
                        <div className="flex items-center gap-2 sm:w-2/3 justify-start sm:justify-end">
                          {/* Clean Rupee / Percentage Toggle */}
                          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
                            <button
                              type="button"
                              disabled={isPastMonth}
                              onClick={() => handleLimitTypeChange(item.category, "RUPEES")}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                isPastMonth ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                              } ${
                                item.limitType === "RUPEES"
                                  ? "bg-white text-indigo-700 shadow-2xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              ₹ Max
                            </button>
                            <button
                              type="button"
                              disabled={isPastMonth}
                              onClick={() => handleLimitTypeChange(item.category, "PERCENTAGE")}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                isPastMonth ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                              } ${
                                item.limitType === "PERCENTAGE"
                                  ? "bg-white text-indigo-700 shadow-2xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              % Cap
                            </button>
                          </div>

                          {/* Crisp Numeric Input Box */}
                          <div className="relative w-32 sm:w-36 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                              {item.limitType === "PERCENTAGE" ? "%" : "₹"}
                            </span>
                            <input
                              type="number"
                              disabled={isPastMonth}
                              step={item.limitType === "PERCENTAGE" ? "1" : "50"}
                              min="0"
                              max={item.limitType === "PERCENTAGE" ? "100" : undefined}
                              placeholder={
                                item.limitType === "PERCENTAGE"
                                  ? isPastMonth
                                    ? "None"
                                    : "e.g. 15"
                                  : isPastMonth
                                  ? "None"
                                  : "Set limit"
                              }
                              value={item.limitValue}
                              onChange={(e) => handleLimitValueChange(item.category, e.target.value)}
                              className={`w-full pl-6 pr-3 py-1.5 text-right font-bold text-xs sm:text-sm rounded-xl border text-slate-900 transition-colors ${
                                isPastMonth
                                  ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                  : "bg-white border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                              }`}
                            />
                          </div>

                          {/* Remove button */}
                          {item.hasLimit && !isPastMonth && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLimit(item.category)}
                              title="Remove limit"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Feedback for active limits */}
                      {item.hasLimit && computedLimit > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100/90 space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">
                              {formatCurrency(item.currentSpend)} of {formatCurrency(computedLimit)}
                              {item.limitType === "PERCENTAGE" && ` (${item.limitValue}% limit)`}
                            </span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                                isOver
                                  ? "bg-rose-50 text-rose-700"
                                  : isWarning
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {isOver
                                ? `Exceeded by ${formatCurrency(item.currentSpend - computedLimit)}`
                                : `${pctUsed}% consumed • ${formatCurrency(computedLimit - item.currentSpend)} left`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOver
                                  ? "bg-rose-500"
                                  : isWarning
                                  ? "bg-amber-500"
                                  : "bg-indigo-600"
                              }`}
                              style={{ width: `${Math.min(100, pctUsed)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pinned Sticky Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-white/95 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          {/* Apply to upcoming months toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="applyToUpcomingCheckbox"
              disabled={isPastMonth}
              checked={applyToUpcoming}
              onChange={(e) => setApplyToUpcoming(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <label
              htmlFor="applyToUpcomingCheckbox"
              className={`text-xs select-none ${
                isPastMonth ? "text-slate-400 cursor-not-allowed" : "text-slate-700 cursor-pointer"
              }`}
            >
              <span className="font-bold">Apply to upcoming months as well</span>
              <span className="block text-[10px] text-slate-500">
                {applyToUpcoming
                  ? `Limits will cascade to future months until customized.`
                  : `Limits apply strictly to ${displayMonthName} only.`}
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-5 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || isPastMonth || isMismatch}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                isPastMonth
                  ? "Cannot modify budget limits for past months"
                  : isMismatch
                  ? "Overall budget cannot be less than total category allocations"
                  : "Save budget limits"
              }
            >
              <Check className="w-4 h-4 text-white" />
              <span className="text-white font-semibold">
                {saving
                  ? "Saving..."
                  : isPastMonth
                  ? "Past Month Locked"
                  : isMismatch
                  ? "Fix Budget Mismatch"
                  : "Save Budget Limits"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
