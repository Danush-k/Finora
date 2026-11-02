"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
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

// ============================================================================
// MEMOIZED CALENDAR DAY CELL
// Uses performant CSS transitions so ONLY changed cells re-render/animate!
// ============================================================================
interface CalendarDayCellProps {
  day: CalendarDaySummary;
  isSelected: boolean;
  hasLent: boolean;
  hasDebt: boolean;
  onPointerDown: (dayNum: number, e: React.PointerEvent) => void;
  onPointerEnter: (dayNum: number) => void;
  onPointerUp: (dayNum: number) => void;
}

const CalendarDayCell = memo(function CalendarDayCell({
  day,
  isSelected,
  hasLent,
  hasDebt,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}: CalendarDayCellProps) {
  const hasExpense = day.totalExpense > 0;
  const hasIncome = day.totalIncome > 0;

  return (
    <div
      onPointerDown={(e) => onPointerDown(day.dayOfMonth, e)}
      onPointerEnter={() => onPointerEnter(day.dayOfMonth)}
      onPointerUp={() => onPointerUp(day.dayOfMonth)}
      className={cn(
        "h-[74px] sm:h-[88px] min-h-[74px] sm:min-h-[88px] p-1.5 sm:p-2 rounded-xl border transition-[background-color,border-color,box-shadow,color] duration-200 ease-out cursor-pointer flex flex-col justify-between select-none relative outline-none",
        isSelected
          ? "bg-[#F4EFFF] border-[#6C3BFF] shadow-[0_2px_10px_rgba(108,59,255,0.14)] z-10"
          : day.transactionCount > 0
          ? hasLent
            ? "bg-white border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/25 hover:shadow-2xs"
            : hasDebt
            ? "bg-white border-amber-300 hover:border-amber-500 hover:bg-amber-50/25 hover:shadow-2xs"
            : "bg-white border-slate-200/90 hover:border-purple-300/80 hover:bg-purple-50/20 hover:shadow-2xs"
          : "bg-white/70 border-slate-100/90 hover:border-slate-200/90 hover:bg-slate-50/50"
      )}
    >
      <div className="flex items-center justify-between pointer-events-none h-5 sm:h-5.5">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span
            className={cn(
              "text-[11px] sm:text-xs font-black transition-colors duration-150 leading-none",
              isSelected ? "text-[#5228E0]" : "text-slate-800"
            )}
          >
            {day.dayOfMonth}
          </span>
          {(hasLent || hasDebt) && (
            <span
              className={cn(
                "text-[8px] sm:text-[9px] font-extrabold px-1 sm:px-1.5 py-0.2 rounded leading-tight border",
                hasLent
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}
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
          <span
            className={cn(
              "text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-bold border transition-colors leading-none",
              isSelected
                ? "bg-[#6C3BFF]/15 text-[#5228E0] border-[#6C3BFF]/30"
                : "bg-slate-100 text-slate-700 border-slate-200"
            )}
          >
            {day.transactionCount}
          </span>
        )}
      </div>

      {/* Day Cashflow Indicators: always fixed height h-7 sm:h-8 so no date cell collapses */}
      <div className="h-7 sm:h-8 flex flex-col justify-end gap-0.5 overflow-hidden pointer-events-none">
        {hasIncome && (
          <span className="text-[9px] sm:text-[11px] font-bold text-emerald-600 truncate tabular-nums leading-none">
            +{formatCurrency(day.totalIncome)}
          </span>
        )}
        {hasExpense && (
          <span className="text-[9px] sm:text-[11px] font-bold text-rose-600 truncate tabular-nums leading-none">
            -{formatCurrency(day.totalExpense)}
          </span>
        )}
      </div>
    </div>
  );
});

export default function MonthlyCalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarDays, setCalendarDays] = useState<CalendarDaySummary[]>(() => {
    const now = new Date();
    return api.getCachedMonthlyCalendar(now.getFullYear(), now.getMonth() + 1) || [];
  });
  const [loading, setLoading] = useState(false);
  const [selectedDayNumbers, setSelectedDayNumbers] = useState<number[]>([]);
  const [debtLentRecords, setDebtLentRecords] = useState<DebtLentRecord[]>(() => {
    return api.getCachedDebtLentRecords() || [];
  });
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [todayYear, setTodayYear] = useState<number>(() => new Date().getFullYear());
  const [todayMonth, setTodayMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Preserve last active selection data so exit animations collapse smoothly without glitching or flashing empty
  const [lastSelectionData, setLastSelectionData] = useState<{
    days: number[];
    list: CalendarDaySummary[];
    expense: number;
    income: number;
    net: number;
    txns: Transaction[];
    count: number;
    title: string;
  } | null>(null);
  const [monthDirection, setMonthDirection] = useState<"next" | "prev">("next");

  const transactionsSectionRef = useRef<HTMLDivElement>(null);

  // Pointer & Drag selection tracking
  const pointerOriginRef = useRef<{ x: number; y: number; dayNum: number } | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    api
      .getDebtLentRecords()
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
      pointerOriginRef.current = null;
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, []);

  const handlePrevMonth = () => {
    setMonthDirection("prev");
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setMonthDirection("next");
    setCurrentDate(new Date(year, month, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setMonthDirection(now.getTime() > currentDate.getTime() ? "next" : "prev");
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Calculate first day of month offset for grid alignment (Mon = 0, Sun = 6)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDayOfMonth + 6) % 7; // Monday as first column
  const totalDays = startOffset + calendarDays.length;
  const totalWeeks = Math.max(5, Math.ceil(totalDays / 7));
  const trailingSpaces = Math.max(0, totalWeeks * 7 - totalDays);

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
    const cols = selectedDaysList.map((d) => (startOffset + (d.dayOfMonth - 1)) % 7);
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

  // Keep lastSelectionData synced whenever an active selection exists
  useEffect(() => {
    if (selectedDayNumbers.length > 0) {
      setLastSelectionData({
        days: selectedDayNumbers,
        list: selectedDaysList,
        expense: selectedTotalExpense,
        income: selectedTotalIncome,
        net: selectedNet,
        txns: selectedTransactions,
        count: selectedTxnCount,
        title: selectionTitle,
      });
    }
  }, [
    selectedDayNumbers,
    selectedDaysList,
    selectedTotalExpense,
    selectedTotalIncome,
    selectedNet,
    selectedTransactions,
    selectedTxnCount,
    selectionTitle,
  ]);

  // Stabilized values for the details panel: during an exit transition when selectedDayNumbers becomes [],
  // we seamlessly retain the last valid selection data so the UI collapses smoothly with 0 glitching or snapping
  const panelDaysCount =
    selectedDayNumbers.length > 0 ? selectedDayNumbers.length : (lastSelectionData?.days.length || 0);
  const panelTransactions =
    selectedDayNumbers.length > 0 ? selectedTransactions : (lastSelectionData?.txns || []);
  const panelTitle =
    selectedDayNumbers.length > 0 ? selectionTitle : (lastSelectionData?.title || "");
  const panelTxnCount =
    selectedDayNumbers.length > 0 ? selectedTxnCount : (lastSelectionData?.count || 0);
  const panelExpense =
    selectedDayNumbers.length > 0 ? selectedTotalExpense : (lastSelectionData?.expense || 0);
  const panelIncome =
    selectedDayNumbers.length > 0 ? selectedTotalIncome : (lastSelectionData?.income || 0);
  const panelNet =
    selectedDayNumbers.length > 0 ? selectedNet : (lastSelectionData?.net || 0);

  // Group transactions chronologically by date for multiple selected dates
  const groupedTransactionsByDate = useMemo(() => {
    if (panelDaysCount <= 1) return [];

    const map = new Map<string, Transaction[]>();
    const sorted = [...panelTransactions].sort((a, b) => {
      return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
    });

    sorted.forEach((txn) => {
      const dKey = txn.transactionDate ? txn.transactionDate.split("T")[0] : "Other";
      if (!map.has(dKey)) {
        map.set(dKey, []);
      }
      map.get(dKey)!.push(txn);
    });

    const groups: {
      dateKey: string;
      dateLabel: string;
      txns: Transaction[];
      dayExpense: number;
      dayIncome: number;
    }[] = [];

    map.forEach((txns, dKey) => {
      const dObj = new Date(dKey);
      const dateLabel = isNaN(dObj.getTime())
        ? dKey
        : dObj.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          });
      const dayExpense = txns
        .filter((t) => t.transactionType === "EXPENSE")
        .reduce((sum, t) => sum + t.amount, 0);
      const dayIncome = txns
        .filter((t) => t.transactionType === "INCOME")
        .reduce((sum, t) => sum + t.amount, 0);

      groups.push({
        dateKey: dKey,
        dateLabel,
        txns,
        dayExpense,
        dayIncome,
      });
    });

    return groups;
  }, [panelTransactions, panelDaysCount]);

  // Column header click: toggle all dates in that column
  const handleWeekdayClick = useCallback((colIdx: number) => {
    const matchingDays = calendarDays
      .filter((d) => (startOffset + (d.dayOfMonth - 1)) % 7 === colIdx)
      .map((d) => d.dayOfMonth);

    if (matchingDays.length === 0) return;

    setSelectedDayNumbers((prev) => {
      const allSelected = matchingDays.every((d) => prev.includes(d));
      if (allSelected) {
        return prev.filter((d) => !matchingDays.includes(d));
      } else {
        return Array.from(new Set([...prev, ...matchingDays]));
      }
    });
  }, [calendarDays, startOffset]);

  // Pointer interactions with clean single click vs dragging range selection
  const handleDayPointerDown = useCallback((dayNum: number, e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    pointerOriginRef.current = { x: e.clientX, y: e.clientY, dayNum };
  }, []);

  const handleDayPointerEnter = useCallback((dayNum: number) => {
    if (!isPointerDownRef.current || !pointerOriginRef.current) return;
    const startDay = pointerOriginRef.current.dayNum;
    if (dayNum === startDay && !isDraggingRef.current) return;

    isDraggingRef.current = true;
    const minDay = Math.min(startDay, dayNum);
    const maxDay = Math.max(startDay, dayNum);
    const range: number[] = [];
    for (let d = minDay; d <= maxDay; d++) {
      range.push(d);
    }
    setSelectedDayNumbers(range);
  }, []);

  const handleDayPointerUp = useCallback((dayNum: number) => {
    if (!isPointerDownRef.current) return;

    // If no drag occurred, this was a clean single click!
    if (!isDraggingRef.current) {
      setSelectedDayNumbers((prev) => {
        // If clicking already selected single date, deselect it correctly
        if (prev.length === 1 && prev[0] === dayNum) {
          return [];
        }
        // Otherwise, select ONLY that particular date
        return [dayNum];
      });
    }

    isPointerDownRef.current = false;
    isDraggingRef.current = false;
    pointerOriginRef.current = null;
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedDayNumbers([]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Month Highlights Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl liquid-glass border border-rose-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Spent
            </span>
            <h4 className="text-base sm:text-xl font-black text-rose-600 mt-0.5 sm:mt-1 tabular-nums">
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
            <h4 className="text-base sm:text-xl font-black text-emerald-600 mt-0.5 sm:mt-1 tabular-nums">
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
            <h4 className="text-base sm:text-xl font-black text-indigo-700 mt-0.5 sm:mt-1 tabular-nums">
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
              <span>
                {monthName} {year}
              </span>
              {loading && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Prev / Next controls */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={handlePrevMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-700 transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-700 transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {(year !== todayYear || month !== todayMonth) && (
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] sm:text-xs font-semibold hover:bg-indigo-100 transition-all active:scale-95 cursor-pointer"
                title="Return to Current Month"
              >
                Today
              </button>
            )}

            {/* Budget Limits Button */}
            <button
              type="button"
              onClick={() => setBudgetModalOpen(true)}
              className="btn-secondary flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold active:scale-98 cursor-pointer"
              title={`Configure monthly overall budget and category limits for ${monthName} ${year}`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#5228E0]" />
              <span className="hidden xs:inline">Budget Limits</span>
              <span className="xs:hidden">Limits</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOP QUICK REPORT BANNER (Smooth Pop-up on Multi-Day Selection)            */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedDayNumbers.length > 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{
                opacity: 1,
                height: "auto",
                marginBottom: 16,
                transition: {
                  height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.22, ease: "easeOut" },
                  marginBottom: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              exit={{
                opacity: 0,
                height: 0,
                marginBottom: 0,
                transition: {
                  height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.16, ease: "easeIn" },
                  marginBottom: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="overflow-hidden"
            >
              <div className="p-3 sm:p-4 rounded-2xl liquid-glass border border-purple-200/90 bg-gradient-to-r from-purple-50/90 via-white to-indigo-50/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#6C3BFF] border border-purple-200/90 flex items-center justify-center shrink-0 shadow-2xs">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate">
                        {panelTitle}
                      </h5>
                      <span className="text-[10px] font-bold text-[#5228E0] bg-purple-100/80 border border-purple-200/70 px-2 py-0.5 rounded-full shrink-0">
                        Combined Report · {panelDaysCount} {panelDaysCount === 1 ? "date" : "dates"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Multi-day selection · {panelDaysCount} dates combined
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-5 flex-wrap w-full md:w-auto justify-between md:justify-end">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Spent</span>
                    <span className="text-xs sm:text-sm font-black text-rose-600 tabular-nums">
                      {formatCurrency(panelExpense)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Inflow</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 tabular-nums">
                      {formatCurrency(panelIncome)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Net</span>
                    <span
                      className={cn(
                        "text-xs sm:text-sm font-black tabular-nums",
                        panelNet >= 0 ? "text-emerald-700" : "text-rose-600"
                      )}
                    >
                      {panelNet >= 0 ? "+" : ""}
                      {formatCurrency(panelNet)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Records</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 tabular-nums">
                      {panelTxnCount} {panelTxnCount === 1 ? "txn" : "txns"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto md:ml-2">
                    {panelTxnCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById("calendar-transactions-section");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }}
                        className="btn-primary h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl text-white text-[10px] sm:text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-102 active:scale-98 transition-all"
                      >
                        Inspect {panelTxnCount} {panelTxnCount === 1 ? "Txn" : "Txns"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Clear selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* SECTION 7: SMOOTH HORIZONTAL MONTH SLIDE TRANSITION                       */}
        {/* ========================================================================= */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={monthDirection}>
            <motion.div
              key={`${year}-${month}`}
              custom={monthDirection}
              variants={{
                enter: (dir: "next" | "prev") => ({
                  x: dir === "next" ? 18 : -18,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: (dir: "next" | "prev") => ({
                  x: dir === "next" ? -18 : 18,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Weekday Column Headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center select-none">
                {dayNames.map((d, colIdx) => {
                  const matchingDays = calendarDays
                    .filter((day) => (startOffset + (day.dayOfMonth - 1)) % 7 === colIdx)
                    .map((day) => day.dayOfMonth);

                  const isColSelected =
                    matchingDays.length > 0 &&
                    matchingDays.every((dayNum) => selectedDayNumbers.includes(dayNum));

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleWeekdayClick(colIdx)}
                      title={`Click to toggle all ${d === "Sun" ? "Sundays" : d === "Sat" ? "Saturdays" : d + "s"}`}
                      className={cn(
                        "py-1.5 rounded-lg transition-all cursor-pointer select-none text-[10px] sm:text-[11px] font-black uppercase tracking-wider",
                        isColSelected
                          ? "bg-[#6C3BFF] text-white shadow-xs"
                          : d === "Sun"
                          ? "text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          : "text-slate-400 hover:bg-purple-50 hover:text-[#6C3BFF]"
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Days Grid with Memoized Cells and Fixed Dimension Completeness */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-fr select-none touch-none">
                {/* Leading empty spaces */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div
                    key={`leading-${i}`}
                    className="h-[74px] sm:h-[88px] min-h-[74px] sm:min-h-[88px] rounded-xl bg-slate-50/40 border border-transparent"
                  />
                ))}

                {/* Calendar Day Cells */}
                {calendarDays.map((day) => {
                  const isSelected = selectedDayNumbers.includes(day.dayOfMonth);

                  const mappedDayItems = day.transactions
                    ? day.transactions
                        .map((t) => mappedTxnMap.get(t.id))
                        .filter((m): m is NonNullable<typeof m> => Boolean(m))
                    : [];

                  const hasLent = mappedDayItems.some((m) => m.type === "LENT");
                  const hasDebt = mappedDayItems.some((m) => m.type === "DEBT");

                  return (
                    <CalendarDayCell
                      key={day.dayOfMonth}
                      day={day}
                      isSelected={isSelected}
                      hasLent={hasLent}
                      hasDebt={hasDebt}
                      onPointerDown={handleDayPointerDown}
                      onPointerEnter={handleDayPointerEnter}
                      onPointerUp={handleDayPointerUp}
                    />
                  );
                })}

                {/* Trailing empty spaces so all rows maintain 7 columns */}
                {Array.from({ length: trailingSpaces }).map((_, i) => (
                  <div
                    key={`trailing-${i}`}
                    className="h-[74px] sm:h-[88px] min-h-[74px] sm:min-h-[88px] rounded-xl bg-slate-50/40 border border-transparent"
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ========================================================================= */}
        {/* UNIFIED SELECTED DATE SUMMARY & TRANSACTIONS (Stable Layout Below Grid)   */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedDayNumbers.length > 0 && (
            <motion.div
              id="calendar-transactions-section"
              key="calendar-transactions-section"
              ref={transactionsSectionRef}
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{
                opacity: 1,
                height: "auto",
                marginTop: 24,
                transition: {
                  height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.22, ease: "easeOut" },
                  marginTop: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              exit={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                transition: {
                  height: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.16, ease: "easeIn" },
                  marginTop: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-purple-200/80 shadow-md p-4 sm:p-5">
                {/* Header of details panel with title, metrics and clear button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black text-slate-900">
                        {panelDaysCount === 1
                          ? `Transactions on ${panelTitle}`
                          : `Consolidated Transactions (${panelTitle})`}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                        {panelTxnCount} {panelTxnCount === 1 ? "record" : "records"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                      <span>
                        Spent: <strong className="text-rose-600">{formatCurrency(panelExpense)}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Inflow: <strong className="text-emerald-600">{formatCurrency(panelIncome)}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Net:{" "}
                        <strong className={panelNet >= 0 ? "text-emerald-700" : "text-rose-600"}>
                          {panelNet >= 0 ? "+" : ""}
                          {formatCurrency(panelNet)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer self-end sm:self-center"
                    title="Clear date selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {panelTransactions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-slate-300 mb-1.5" />
                    <p className="font-medium">
                      No transactions recorded for {panelDaysCount === 1 ? "this date" : "these selected dates"}.
                    </p>
                  </div>
                ) : panelDaysCount === 1 ? (
                  /* Single Day: Direct Clean List */
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {panelTransactions.map((txn: Transaction) => {
                      const mappedInfo = mappedTxnMap.get(txn.id);
                      return (
                        <div
                          key={txn.id}
                          onClick={() => {
                            if (mappedInfo) {
                              handleNavigateToMappedRecord(mappedInfo.recordId, mappedInfo.type);
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all text-xs",
                            mappedInfo
                              ? mappedInfo.type === "LENT"
                                ? "bg-emerald-50/60 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 shadow-2xs cursor-pointer group"
                                : "bg-amber-50/60 border-amber-200 hover:border-amber-300 hover:bg-amber-50 shadow-2xs cursor-pointer group"
                              : "bg-slate-50/80 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "p-2 rounded-xl shrink-0",
                                txn.transactionType === "EXPENSE"
                                  ? "bg-rose-100/80 text-rose-600 border border-rose-200/60"
                                  : "bg-emerald-100/80 text-emerald-600 border border-emerald-200/60"
                              )}
                            >
                              {txn.transactionType === "EXPENSE" ? (
                                <ArrowDownRight className="w-4 h-4" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
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
                                    title={`Open ${mappedInfo.counterpartyName}'s ${
                                      mappedInfo.type === "LENT" ? "Money Lent" : "Debt"
                                    } page`}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs",
                                      mappedInfo.type === "LENT"
                                        ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300"
                                        : "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                                    )}
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
                              className={cn(
                                "font-black tabular-nums",
                                txn.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"
                              )}
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
                  /* Multiple Dates: Grouped by Date in Chronological Order */
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {groupedTransactionsByDate.map((group) => (
                      <div key={group.dateKey} className="space-y-1.5">
                        <div className="flex items-center justify-between px-1 py-1 text-[11px] font-bold text-slate-600 bg-slate-50 rounded-lg border border-slate-100">
                          <span>{group.dateLabel}</span>
                          <div className="flex items-center gap-2 text-[10px]">
                            {group.dayExpense > 0 && (
                              <span className="text-rose-600 font-extrabold tabular-nums">
                                -{formatCurrency(group.dayExpense)}
                              </span>
                            )}
                            {group.dayIncome > 0 && (
                              <span className="text-emerald-600 font-extrabold tabular-nums">
                                +{formatCurrency(group.dayIncome)}
                              </span>
                            )}
                            <span className="text-slate-400 font-medium">({group.txns.length})</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pl-2">
                          {group.txns.map((txn) => {
                            const mappedInfo = mappedTxnMap.get(txn.id);
                            return (
                              <div
                                key={txn.id}
                                onClick={() => {
                                  if (mappedInfo) {
                                    handleNavigateToMappedRecord(mappedInfo.recordId, mappedInfo.type);
                                  }
                                }}
                                className={cn(
                                  "flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs",
                                  mappedInfo
                                    ? mappedInfo.type === "LENT"
                                      ? "bg-emerald-50/60 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 shadow-2xs cursor-pointer group"
                                      : "bg-amber-50/60 border-amber-200 hover:border-amber-300 hover:bg-amber-50 shadow-2xs cursor-pointer group"
                                    : "bg-slate-50/80 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={cn(
                                      "p-1.5 rounded-lg shrink-0",
                                      txn.transactionType === "EXPENSE"
                                        ? "bg-rose-100/80 text-rose-600 border border-rose-200/60"
                                        : "bg-emerald-100/80 text-emerald-600 border border-emerald-200/60"
                                    )}
                                  >
                                    {txn.transactionType === "EXPENSE" ? (
                                      <ArrowDownRight className="w-3.5 h-3.5" />
                                    ) : (
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-bold text-slate-900 truncate">{txn.merchant}</p>
                                      {mappedInfo && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNavigateToMappedRecord(
                                              mappedInfo.recordId,
                                              mappedInfo.type
                                            );
                                          }}
                                          className={cn(
                                            "inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full border shadow-2xs",
                                            mappedInfo.type === "LENT"
                                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                              : "bg-amber-100 text-amber-800 border-amber-300"
                                          )}
                                        >
                                          <Link2 className="w-2.5 h-2.5" />
                                          <span>{mappedInfo.counterpartyName}</span>
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-0.5">
                                      <CategoryBadge
                                        category={txn.category}
                                        className="scale-75 origin-left"
                                      />
                                      <span>·</span>
                                      <span>{txn.paymentMethod}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <span
                                    className={cn(
                                      "font-black text-xs tabular-nums",
                                      txn.transactionType === "EXPENSE"
                                        ? "text-rose-600"
                                        : "text-emerald-600"
                                    )}
                                  >
                                    {txn.transactionType === "EXPENSE" ? "-" : "+"}
                                    {formatCurrency(txn.amount)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
