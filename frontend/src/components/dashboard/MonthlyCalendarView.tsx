"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { CalendarDaySummary, DebtLentRecord, Transaction } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  X,
  Link2,
  Sliders,
  ChevronDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import CategoryBadge from "@/components/common/CategoryBadge";
import CategoryBudgetModal from "@/components/dashboard/CategoryBudgetModal";
import { motion, AnimatePresence } from "framer-motion";

export default function MonthlyCalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 10, 1));
  const [calendarDays, setCalendarDays] = useState<CalendarDaySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDayNumbers, setSelectedDayNumbers] = useState<number[]>([]);
  const [isMultiDayDrawerOpen, setIsMultiDayDrawerOpen] = useState(false);
  const [debtLentRecords, setDebtLentRecords] = useState<DebtLentRecord[]>([]);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [todayYear, setTodayYear] = useState<number>(2026);
  const [todayMonth, setTodayMonth] = useState<number>(11);

  // Pointer & Drag selection tracking
  const pointerOriginRef = useRef<{ x: number; y: number; dayNum: number } | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const now = new Date();
    setTodayYear(now.getFullYear());
    setTodayMonth(now.getMonth() + 1);
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));

    api.getDebtLentRecords()
      .then((records) => setDebtLentRecords(records))
      .catch((e) => console.error("Failed to load debt & lent records for calendar", e));
  }, []);

  const fetchDebtLentRecords = async () => {
    try {
      const records = await api.getDebtLentRecords();
      setDebtLentRecords(records);
    } catch (e) {
      console.error("Failed to refresh debt & lent records for calendar", e);
    }
  };

  const handleNavigateToMappedRecord = (recordId: string, type: "LENT" | "DEBT") => {
    router.push(`/debt-lent?tab=${type}&recordId=${recordId}`);
  };

  // Quick lookup map for mapped transactions (Lent, Debt, Repayments)
  const mappedTxnMap = useMemo(() => {
    const map = new Map<
      string,
      {
        recordId: string;
        type: "LENT" | "DEBT";
        counterpartyName: string;
        isInstallment?: boolean;
        installmentTitle?: string;
        amountDifferenceReason?: string;
        description?: string;
      }
    >();

    debtLentRecords.forEach((rec) => {
      if (rec.linkedTransactionId) {
        map.set(rec.linkedTransactionId, {
          recordId: rec.id,
          type: rec.type,
          counterpartyName: rec.counterpartyName,
          amountDifferenceReason: rec.amountDifferenceReason,
          description: rec.description,
        });
      }

      if (rec.linkedTransactionIds && Array.isArray(rec.linkedTransactionIds)) {
        rec.linkedTransactionIds.forEach((id) => {
          if (id) {
            map.set(id, {
              recordId: rec.id,
              type: rec.type,
              counterpartyName: rec.counterpartyName,
              amountDifferenceReason: rec.amountDifferenceReason,
              description: rec.description,
            });
          }
        });
      }

      if (rec.installments && Array.isArray(rec.installments)) {
        rec.installments.forEach((inst) => {
          if (inst.linkedTransactionId) {
            map.set(inst.linkedTransactionId, {
              recordId: rec.id,
              type: rec.type,
              counterpartyName: rec.counterpartyName,
              isInstallment: true,
              installmentTitle: inst.title,
              amountDifferenceReason: inst.notes,
              description: inst.notes || rec.description,
            });
          }
        });
      }
    });

    return map;
  }, [debtLentRecords]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMonthlyCalendar(year, month);
      setCalendarDays(data);
    } catch (e) {
      console.error("Failed to load monthly calendar data", e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchCalendar();
    setSelectedDayNumbers([]);
    setIsMultiDayDrawerOpen(false);

    const handleSync = () => {
      fetchCalendar();
      fetchDebtLentRecords();
    };
    window.addEventListener("finora-sync-completed", handleSync);
    return () => window.removeEventListener("finora-sync-completed", handleSync);
  }, [year, month, fetchCalendar]);

  // Window pointerup listener to guarantee clean drag cancellation
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isPointerDownRef.current = false;
      isDraggingRef.current = false;
      setIsDragging(false);
      pointerOriginRef.current = null;
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Calculate first day of month offset for grid alignment (Mon = 0, Sun = 6)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDayOfMonth + 6) % 7; // Monday as first column

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Monthly totals
  const totalMonthExpense = calendarDays.reduce((acc, d) => acc + d.totalExpense, 0);
  const totalMonthIncome = calendarDays.reduce((acc, d) => acc + d.totalIncome, 0);
  const activeDays = calendarDays.filter((d) => d.transactionCount > 0).length;

  // Selected Days Calculations
  const selectedDaysList = useMemo(() => {
    return calendarDays.filter((d) => selectedDayNumbers.includes(d.dayOfMonth));
  }, [calendarDays, selectedDayNumbers]);

  const selectedTotalExpense = useMemo(() => {
    return selectedDaysList.reduce((acc, d) => acc + (d.totalExpense || 0), 0);
  }, [selectedDaysList]);

  const selectedTotalIncome = useMemo(() => {
    return selectedDaysList.reduce((acc, d) => acc + (d.totalIncome || 0), 0);
  }, [selectedDaysList]);

  const selectedNet = selectedTotalIncome - selectedTotalExpense;

  const selectedTransactions = useMemo(() => {
    const txns: Transaction[] = [];
    selectedDaysList.forEach((d) => {
      if (d.transactions && Array.isArray(d.transactions)) {
        txns.push(...d.transactions);
      }
    });
    return txns;
  }, [selectedDaysList]);

  const selectedTxnCount = selectedTransactions.length;

  // Title formatting: clean, minimal Apple style
  const selectionTitle = useMemo(() => {
    if (selectedDayNumbers.length === 0) return "";
    if (selectedDayNumbers.length === 1) {
      const d = selectedDaysList[0];
      return d ? `${d.date}` : `${monthName} ${selectedDayNumbers[0]}`;
    }

    // Check if column match (e.g. all Sundays)
    const cols = selectedDaysList.map((d) => ((startOffset + (d.dayOfMonth - 1)) % 7));
    const uniqueCols = Array.from(new Set(cols));
    if (uniqueCols.length === 1) {
      const colName = dayNames[uniqueCols[0]];
      const fullNames: Record<string, string> = {
        Mon: "Mondays",
        Tue: "Tuesdays",
        Wed: "Wednesdays",
        Thu: "Thursdays",
        Fri: "Fridays",
        Sat: "Saturdays",
        Sun: "Sundays",
      };
      return `All ${fullNames[colName] || colName}`;
    }

    const sorted = [...selectedDayNumbers].sort((a, b) => a - b);
    const isContiguous = sorted.every((num, idx) => idx === 0 || num === sorted[idx - 1] + 1);
    if (isContiguous) {
      return `${monthName} ${sorted[0]} – ${sorted[sorted.length - 1]}`;
    }

    if (sorted.length <= 4) {
      return `${monthName} ${sorted.join(", ")}`;
    }

    return `${monthName} ${sorted[0]} – ${sorted[sorted.length - 1]}`;
  }, [selectedDayNumbers, selectedDaysList, startOffset, dayNames, monthName]);

  // Column header click: toggle all dates in that column
  const handleWeekdayClick = (colIdx: number) => {
    const matchingDays = calendarDays
      .filter((d) => ((startOffset + (d.dayOfMonth - 1)) % 7) === colIdx)
      .map((d) => d.dayOfMonth);

    if (matchingDays.length === 0) return;

    const allSelected = matchingDays.every((d) => selectedDayNumbers.includes(d));
    if (allSelected) {
      setSelectedDayNumbers((prev) => prev.filter((d) => !matchingDays.includes(d)));
    } else {
      setSelectedDayNumbers((prev) => Array.from(new Set([...prev, ...matchingDays])));
    }
  };

  // Pointer interactions with movement threshold (>6px) to cleanly separate Click from Drag
  const handleDayPointerDown = (dayNum: number, e: React.PointerEvent) => {
    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    pointerOriginRef.current = { x: e.clientX, y: e.clientY, dayNum };
  };

  const handleDayPointerEnter = (dayNum: number) => {
    if (!isPointerDownRef.current || !pointerOriginRef.current) return;

    // Transition to dragging when moving between cells
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      setIsDragging(true);
      // Ensure start day is in selection
      const startDay = pointerOriginRef.current.dayNum;
      setSelectedDayNumbers((prev) => {
        const next = new Set(prev);
        next.add(startDay);
        next.add(dayNum);
        return Array.from(next);
      });
      return;
    }

    // While dragging across cells, add each touched cell to the selection (supports horizontal, vertical, diagonal)
    setSelectedDayNumbers((prev) => {
      if (prev.includes(dayNum)) return prev;
      return [...prev, dayNum];
    });
  };

  const handleDayPointerUp = (dayNum: number) => {
    if (!isPointerDownRef.current) return;

    // If no drag occurred, this was a clean single click!
    if (!isDraggingRef.current) {
      setSelectedDayNumbers((prev) => {
        // Toggle the clicked date
        if (prev.includes(dayNum)) {
          return prev.filter((d) => d !== dayNum);
        } else {
          return [...prev, dayNum];
        }
      });
    }

    isPointerDownRef.current = false;
    isDraggingRef.current = false;
    setIsDragging(false);
    pointerOriginRef.current = null;
  };

  const handleClearSelection = () => {
    setSelectedDayNumbers([]);
    setIsMultiDayDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Month Highlights Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl liquid-glass border border-rose-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Spent
            </span>
            <h4 className="text-base sm:text-xl font-black text-rose-600 mt-0.5 sm:mt-1">
              {formatCurrency(totalMonthExpense)}
            </h4>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
            <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl liquid-glass border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Inflow
            </span>
            <h4 className="text-base sm:text-xl font-black text-emerald-600 mt-0.5 sm:mt-1">
              {formatCurrency(totalMonthIncome)}
            </h4>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl liquid-glass border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Days
            </span>
            <h4 className="text-base sm:text-xl font-black text-indigo-700 mt-0.5 sm:mt-1">
              {activeDays} <span className="text-xs font-semibold text-slate-400">/ {calendarDays.length}</span>
            </h4>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="rounded-3xl liquid-glass-elevated border border-slate-200/90 p-4 sm:p-6 shadow-sm overflow-hidden">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{monthName} {year}</span>
              {loading && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              )}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Click individual dates or drag horizontally/vertically. Click column headers to toggle weekdays.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Prev / Next controls */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={handlePrevMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer shadow-2xs"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer shadow-2xs"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {(year !== todayYear || month !== todayMonth) && (
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] sm:text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                title="Return to Current Month"
              >
                Today
              </button>
            )}

            {/* Budget Limits Button */}
            <button
              type="button"
              onClick={() => setBudgetModalOpen(true)}
              className="btn-secondary flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer"
              title={`Configure monthly overall budget and category limits for ${monthName} ${year}`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#5228E0]" />
              <span className="hidden xs:inline">Budget Limits</span>
              <span className="xs:hidden">Limits</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* APPLE-INSPIRED SELECTION SUMMARY PANEL (No artificial 9d/5d badge!)      */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedDayNumbers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 rounded-2xl bg-gradient-to-r from-purple-50/90 via-white to-indigo-50/70 border border-purple-200/90 p-3.5 sm:p-4 shadow-sm select-none"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                {/* Left: Clean Date Range & Count Indicator */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                      Selected Dates
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200">
                      {selectedDayNumbers.length} {selectedDayNumbers.length === 1 ? "date selected" : "dates selected"}
                    </span>
                  </div>
                  <h5 className="text-sm sm:text-base font-black text-slate-900 tracking-tight mt-0.5 truncate">
                    {selectionTitle}
                  </h5>
                </div>

                {/* Right: Metrics & Inline Expand Action */}
                <div className="flex items-center gap-3 sm:gap-5 flex-wrap w-full md:w-auto justify-between md:justify-end">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Spent</span>
                    <span className="text-xs sm:text-sm font-black text-rose-600 tabular-nums">
                      {formatCurrency(selectedTotalExpense)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Inflow</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 tabular-nums">
                      {formatCurrency(selectedTotalIncome)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Net Flow</span>
                    <span className={cn("text-xs sm:text-sm font-black tabular-nums", selectedNet >= 0 ? "text-emerald-700" : "text-rose-600")}>
                      {selectedNet >= 0 ? "+" : ""}{formatCurrency(selectedNet)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Records</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 tabular-nums">
                      {selectedTxnCount} {selectedTxnCount === 1 ? "txn" : "txns"}
                    </span>
                  </div>

                  {/* Lightweight Apple Inline Action */}
                  <div className="flex items-center gap-1.5 ml-auto md:ml-2">
                    {selectedTxnCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsMultiDayDrawerOpen(!isMultiDayDrawerOpen)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>{isMultiDayDrawerOpen ? "Hide" : "View"} transactions ({selectedTxnCount})</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isMultiDayDrawerOpen && "rotate-180")} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="p-1.5 rounded-xl hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Clear Selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center select-none">
          {dayNames.map((d, colIdx) => {
            const matchingDays = calendarDays
              .filter((day) => ((startOffset + (day.dayOfMonth - 1)) % 7) === colIdx)
              .map((day) => day.dayOfMonth);

            const isColSelected =
              matchingDays.length > 0 && matchingDays.every((dayNum) => selectedDayNumbers.includes(dayNum));

            return (
              <button
                key={d}
                type="button"
                onClick={() => handleWeekdayClick(colIdx)}
                title={`Click to toggle all ${d === "Sun" ? "Sundays" : d === "Sat" ? "Saturdays" : d + "s"}`}
                className={cn(
                  "py-1.5 rounded-lg transition-all cursor-pointer select-none text-[10px] sm:text-[11px] font-black uppercase tracking-wider",
                  isColSelected
                    ? "bg-purple-600 text-white shadow-xs"
                    : d === "Sun"
                    ? "text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    : "text-slate-400 hover:bg-purple-50 hover:text-purple-600"
                )}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Days Grid with Smooth Transitions */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 select-none touch-none">
          {/* Leading empty spaces */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[58px] sm:min-h-[76px] rounded-xl bg-slate-50/40" />
          ))}

          {/* Calendar Day Cells */}
          {calendarDays.map((day) => {
            const hasExpense = day.totalExpense > 0;
            const hasIncome = day.totalIncome > 0;
            const isSelected = selectedDayNumbers.includes(day.dayOfMonth);

            const mappedDayItems = day.transactions
              ? day.transactions
                  .map((t) => mappedTxnMap.get(t.id))
                  .filter((m): m is NonNullable<typeof m> => Boolean(m))
              : [];

            const hasLent = mappedDayItems.some((m) => m.type === "LENT");
            const hasDebt = mappedDayItems.some((m) => m.type === "DEBT");

            return (
              <motion.div
                key={day.dayOfMonth}
                onPointerDown={(e) => handleDayPointerDown(day.dayOfMonth, e)}
                onPointerEnter={() => handleDayPointerEnter(day.dayOfMonth)}
                onPointerUp={() => handleDayPointerUp(day.dayOfMonth)}
                animate={{
                  scale: isSelected ? 1.02 : 1,
                  backgroundColor: isSelected ? "rgba(243, 238, 255, 0.95)" : undefined,
                }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={cn(
                  "min-h-[58px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none relative",
                  isSelected
                    ? "border-purple-600 shadow-md ring-2 ring-purple-400/80 z-10"
                    : day.transactionCount > 0
                    ? hasLent
                      ? "bg-white border-emerald-300 hover:border-emerald-500 hover:shadow-xs"
                      : hasDebt
                      ? "bg-white border-amber-300 hover:border-amber-500 hover:shadow-xs"
                      : "bg-white border-slate-200 hover:border-purple-300 hover:shadow-xs"
                    : "bg-white/60 border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span
                      className={`text-[11px] sm:text-xs font-black transition-colors ${
                        isSelected ? "text-purple-700" : "text-slate-800"
                      }`}
                    >
                      {day.dayOfMonth}
                    </span>
                    {(hasLent || hasDebt) && (
                      <span
                        className={`text-[8px] sm:text-[9px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded leading-tight border ${
                          hasLent
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                        title={
                          hasLent && hasDebt
                            ? "Contains mapped Lent & Debt entries"
                            : hasLent
                            ? "Contains mapped Lent transaction"
                            : "Contains mapped Debt transaction"
                        }
                      >
                        {hasLent && hasDebt ? "L·D" : hasLent ? "Lent" : "Debt"}
                      </span>
                    )}
                  </div>
                  {day.transactionCount > 0 && (
                    <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      {day.transactionCount}
                    </span>
                  )}
                </div>

                {/* Day Cashflow Indicators */}
                <div className="flex flex-col gap-0.5 mt-0.5 sm:mt-1 overflow-hidden pointer-events-none">
                  {hasIncome && (
                    <span className="text-[9px] sm:text-[11px] font-bold text-emerald-600 truncate">
                      +{formatCurrency(day.totalIncome)}
                    </span>
                  )}
                  {hasExpense && (
                    <span className="text-[9px] sm:text-[11px] font-bold text-rose-600 truncate">
                      -{formatCurrency(day.totalExpense)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* EXPANDABLE TRANSACTION DETAILS PANEL (Apple connected card layout)        */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isMultiDayDrawerOpen && selectedDayNumbers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: 6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 rounded-2xl bg-white/95 backdrop-blur-md border border-purple-200/90 shadow-lg p-4 sm:p-5 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      Transactions for {selectionTitle}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                      {selectedTxnCount} {selectedTxnCount === 1 ? "record" : "records"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500 font-medium">
                    <span>Spent: <strong className="text-rose-600">{formatCurrency(selectedTotalExpense)}</strong></span>
                    <span>·</span>
                    <span>Inflow: <strong className="text-emerald-600">{formatCurrency(selectedTotalIncome)}</strong></span>
                    <span>·</span>
                    <span>Net: <strong className={selectedNet >= 0 ? "text-emerald-700" : "text-rose-600"}>{selectedNet >= 0 ? "+" : ""}{formatCurrency(selectedNet)}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMultiDayDrawerOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer self-end sm:self-center"
                  title="Close transactions panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedTransactions.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedTransactions.map((txn: Transaction) => {
                    const mappedInfo = mappedTxnMap.get(txn.id);

                    return (
                      <div
                        key={txn.id}
                        onClick={() => {
                          if (mappedInfo) {
                            handleNavigateToMappedRecord(mappedInfo.recordId, mappedInfo.type);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all text-xs ${
                          mappedInfo
                            ? mappedInfo.type === "LENT"
                              ? "bg-emerald-50/60 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 shadow-2xs cursor-pointer group"
                              : "bg-amber-50/60 border-amber-200 hover:border-amber-300 hover:bg-amber-50 shadow-2xs cursor-pointer group"
                            : "bg-slate-50/80 border-slate-200/80 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              txn.transactionType === "EXPENSE"
                                ? "bg-rose-100/80 text-rose-600 border border-rose-200/60"
                                : "bg-emerald-100/80 text-emerald-600 border border-emerald-200/60"
                            }`}
                          >
                            {txn.transactionType === "EXPENSE" ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700">
                                {txn.transactionDate
                                  ? new Date(txn.transactionDate).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                    })
                                  : ""}
                              </span>
                              <p className="font-bold text-slate-900 group-hover:text-purple-900 transition-colors truncate">
                                {txn.merchant}
                              </p>
                              {mappedInfo && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigateToMappedRecord(mappedInfo.recordId, mappedInfo.type);
                                  }}
                                  title={`Open ${mappedInfo.counterpartyName}'s ${mappedInfo.type === "LENT" ? "Money Lent" : "Debt"} page`}
                                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
                                    mappedInfo.type === "LENT"
                                      ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300"
                                      : "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                                  }`}
                                >
                                  <Link2 className="w-3 h-3" />
                                  <span>
                                    {mappedInfo.isInstallment
                                      ? `Repayment · ${mappedInfo.counterpartyName}`
                                      : `${mappedInfo.type === "LENT" ? "Lent" : "Debt"} · ${mappedInfo.counterpartyName}`}
                                  </span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                              <CategoryBadge category={txn.category} className="scale-90 origin-left" />
                              <span>·</span>
                              <span>{txn.paymentMethod}</span>
                              {txn.referenceNumber && <span>· Ref: {txn.referenceNumber}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span
                            className={`font-black ${
                              txn.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {txn.transactionType === "EXPENSE" ? "-" : "+"}
                            {formatCurrency(txn.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No transactions recorded across these selected dates.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Category Budget Modal */}
      {budgetModalOpen && (
        <CategoryBudgetModal
          isOpen={budgetModalOpen}
          onClose={() => setBudgetModalOpen(false)}
          onUpdated={fetchCalendar}
          year={year}
          month={month}
          monthName={monthName}
          totalExpenses={totalMonthExpense}
        />
      )}
    </div>
  );
}
