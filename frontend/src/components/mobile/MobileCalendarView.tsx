"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { CalendarDaySummary, DebtLentRecord, Transaction } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  Calendar as CalendarIcon,
  X,
  Plus,
  Link2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import CategoryBadge from "@/components/common/CategoryBadge";
import CategoryBudgetModal from "@/components/dashboard/CategoryBudgetModal";
import MobileTransactionSheet from "@/components/mobile/MobileTransactionSheet";
import TransactionModal from "@/components/transactions/TransactionModal";
import { motion, AnimatePresence } from "framer-motion";
import { getCategoryTheme } from "@/lib/category-theme";

// ============================================================================
// INTELLIGENT COMPACT CURRENCY FORMATTER FOR MOBILE CALENDAR CELLS
// Guarantees NO awkward truncation like "+₹2…" or "-₹4,…"
// Examples: 250 -> "₹250", 1250 -> "₹1.3K", 25000 -> "₹25K", 150000 -> "₹1.5L"
// ============================================================================
export function formatCompactCurrency(amount: number): string {
  if (!amount || isNaN(amount)) return "₹0";
  const abs = Math.abs(amount);
  if (abs >= 10000000) {
    return `₹${(abs / 10000000).toFixed(1).replace(/\.0$/, "")}Cr`;
  }
  if (abs >= 100000) {
    return `₹${(abs / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  }
  if (abs >= 1000) {
    return `₹${(abs / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `₹${Math.round(abs)}`;
}

// 7 Weekday Column Headers
const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MobileCalendarView() {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [calendarDays, setCalendarDays] = useState<CalendarDaySummary[]>(() => {
    const now = new Date();
    return api.getCachedMonthlyCalendar(now.getFullYear(), now.getMonth() + 1) || [];
  });

  const [debtLentRecords, setDebtLentRecords] = useState<DebtLentRecord[]>(() => {
    return api.getCachedDebtLentRecords() || [];
  });

  const [loading, setLoading] = useState(false);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [activeTxnSheet, setActiveTxnSheet] = useState<Transaction | null>(null);
  const [editModalTxn, setEditModalTxn] = useState<Transaction | null>(null);
  const [monthDirection, setMonthDirection] = useState<"next" | "prev">("next");

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const isCurrentMonth = year === todayYear && month === todayMonth;

  // Touch Swipe Gesture State
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Load Debt/Lent Records
  useEffect(() => {
    api
      .getDebtLentRecords()
      .then((records) => setDebtLentRecords(records))
      .catch((e) => console.error("Failed to load debt & lent records for mobile calendar", e));
  }, []);

  // Quick lookup map for mapped transactions (Lent, Debt, Repayments)
  const mappedTxnMap = useMemo(() => {
    const map = new Map<
      string,
      {
        recordId: string;
        type: "LENT" | "DEBT";
        counterpartyName: string;
      }
    >();

    debtLentRecords.forEach((rec) => {
      if (rec.linkedTransactionId) {
        map.set(rec.linkedTransactionId, {
          recordId: rec.id,
          type: rec.type,
          counterpartyName: rec.counterpartyName,
        });
      }
      if (rec.linkedTransactionIds && Array.isArray(rec.linkedTransactionIds)) {
        rec.linkedTransactionIds.forEach((id) => {
          if (id) {
            map.set(id, {
              recordId: rec.id,
              type: rec.type,
              counterpartyName: rec.counterpartyName,
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
            });
          }
        });
      }
    });

    return map;
  }, [debtLentRecords]);

  // Fetch Calendar Data
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
    // Default to today if viewing current month, or keep selection cleared
    setSelectedDayNum(isCurrentMonth ? todayDay : null);

    const handleSync = () => {
      fetchCalendar();
      api.getDebtLentRecords().then(setDebtLentRecords).catch(() => {});
    };
    window.addEventListener("finora-sync-completed", handleSync);
    return () => window.removeEventListener("finora-sync-completed", handleSync);
  }, [year, month, fetchCalendar, isCurrentMonth, todayDay]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setMonthDirection("prev");
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setMonthDirection("next");
    setCurrentDate(new Date(year, month, 1));
  };

  const handleCurrentMonth = () => {
    setMonthDirection(today.getTime() > currentDate.getTime() ? "next" : "prev");
    setCurrentDate(new Date(todayYear, todayMonth - 1, 1));
    setSelectedDayNum(todayDay);
  };

  // Grid offsets (Monday = 0, Sunday = 6)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDayOfMonth + 6) % 7;
  const totalDays = startOffset + calendarDays.length;
  const totalWeeks = Math.max(5, Math.ceil(totalDays / 7));
  const trailingSpaces = Math.max(0, totalWeeks * 7 - totalDays);

  // Monthly totals
  const totalMonthExpense = useMemo(
    () => calendarDays.reduce((acc, d) => acc + (d.totalExpense || 0), 0),
    [calendarDays]
  );
  const totalMonthIncome = useMemo(
    () => calendarDays.reduce((acc, d) => acc + (d.totalIncome || 0), 0),
    [calendarDays]
  );
  const totalMonthNet = totalMonthIncome - totalMonthExpense;
  const activeDaysCount = useMemo(
    () => calendarDays.filter((d) => d.transactionCount > 0).length,
    [calendarDays]
  );

  // Selected Day Data
  const selectedDayData = useMemo(() => {
    if (selectedDayNum === null) return null;
    return calendarDays.find((d) => d.dayOfMonth === selectedDayNum) || null;
  }, [calendarDays, selectedDayNum]);

  const selectedDayIncome = selectedDayData?.totalIncome || 0;
  const selectedDayExpense = selectedDayData?.totalExpense || 0;
  const selectedDayNet = selectedDayIncome - selectedDayExpense;
  const selectedDayTxns: Transaction[] = selectedDayData?.transactions || [];

  // Toggle selection
  const handleDateClick = (dayNum: number) => {
    if (selectedDayNum === dayNum) {
      setSelectedDayNum(null); // Deselect on second tap
    } else {
      setSelectedDayNum(dayNum);
    }
  };

  // Touch Swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Must be horizontal gesture (> 50px) and deltaX dominant over deltaY
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0) {
        handlePrevMonth(); // swipe right -> prev month
      } else {
        handleNextMonth(); // swipe left -> next month
      }
    }
  };

  return (
    <div className="md:hidden space-y-4 pb-28 select-none">
      {/* ========================================================= */}
      {/* 1. COMPACT CALENDAR HEADER                                */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          {/* Month & Year Title */}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>
                {monthName} {year}
              </span>
              {loading && <span className="w-2 h-2 rounded-full bg-[#6C3BFF] animate-ping" />}
            </h2>
          </div>

          {/* Controls: Prev/Next, Today Shortcut, Limits */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Today Button when not current month */}
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="px-2.5 py-1 rounded-xl bg-purple-50 text-[#6C3BFF] border border-purple-200/80 text-[11px] font-bold active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                Today
              </button>
            )}

            {/* Prev Month */}
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Month */}
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Limits Action */}
            <button
              type="button"
              onClick={() => setBudgetModalOpen(true)}
              className="btn-secondary h-8 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
              title="Budget & Category Limits"
            >
              <Sliders className="w-3.5 h-3.5 text-[#6C3BFF]" />
              <span>Limits</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COMPACT MONTH HIGHLIGHTS STRIP                            */}
        {/* ========================================================= */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
          <div className="bg-rose-50/70 border border-rose-100/90 rounded-xl py-1.5 px-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 block">
              Spent
            </span>
            <span className="text-xs font-black text-rose-600 tabular-nums">
              {formatCurrency(totalMonthExpense)}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100/90 rounded-xl py-1.5 px-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">
              Inflow
            </span>
            <span className="text-xs font-black text-emerald-600 tabular-nums">
              {formatCurrency(totalMonthIncome)}
            </span>
          </div>

          <div className="bg-purple-50/70 border border-purple-100/90 rounded-xl py-1.5 px-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-700 block">
              Active Days
            </span>
            <span className="text-xs font-black text-[#5228E0] tabular-nums">
              {activeDaysCount} <span className="text-[10px] text-purple-400 font-semibold">/ {calendarDays.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. COMPACT CALENDAR GRID (7 COLUMNS, CONNECTED, BALANCED)  */}
      {/* ========================================================= */}
      <div
        className="rounded-2xl bg-white border border-slate-200/90 p-3 shadow-2xs overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Weekday Column Headers (MON | TUE | WED | THU | FRI | SAT | SUN) */}
        <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
          {WEEKDAY_NAMES.map((dayName, idx) => (
            <div
              key={dayName}
              className={cn(
                "py-1 text-[10px] font-black uppercase tracking-wider",
                idx === 6 ? "text-rose-500" : "text-slate-400"
              )}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Grid Container with Smooth Month Transition */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={monthDirection}>
            <motion.div
              key={`${year}-${month}`}
              custom={monthDirection}
              variants={{
                enter: (dir: "next" | "prev") => ({
                  x: dir === "next" ? 20 : -20,
                  opacity: 0,
                }),
                center: { x: 0, opacity: 1 },
                exit: (dir: "next" | "prev") => ({
                  x: dir === "next" ? -20 : 20,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="grid grid-cols-7 gap-1"
            >
              {/* Leading Empty Cells */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <div
                  key={`leading-${i}`}
                  className="aspect-[1/1.05] min-h-[46px] rounded-xl bg-slate-50/40 border border-transparent"
                />
              ))}

              {/* Active Month Days */}
              {calendarDays.map((day) => {
                const isSelected = selectedDayNum === day.dayOfMonth;
                const isToday = isCurrentMonth && day.dayOfMonth === todayDay;
                const hasTransactions = day.transactionCount > 0;
                const hasIncome = day.totalIncome > 0;
                const hasExpense = day.totalExpense > 0;

                const mappedDayItems = day.transactions
                  ? day.transactions
                      .map((t) => mappedTxnMap.get(t.id))
                      .filter((m): m is NonNullable<typeof m> => Boolean(m))
                  : [];
                const hasLent = mappedDayItems.some((m) => m.type === "LENT");
                const hasDebt = mappedDayItems.some((m) => m.type === "DEBT");

                return (
                  <button
                    key={day.dayOfMonth}
                    type="button"
                    onClick={() => handleDateClick(day.dayOfMonth)}
                    className={cn(
                      "aspect-[1/1.05] min-h-[46px] p-1 rounded-xl border flex flex-col justify-between items-center transition-all select-none relative cursor-pointer outline-none",
                      isSelected
                        ? "bg-[#F4EFFF] border-[#6C3BFF] shadow-[0_2px_8px_rgba(108,59,255,0.2)] z-10 scale-[1.02]"
                        : hasTransactions
                        ? "bg-white border-slate-200/90 active:scale-95 hover:border-purple-300"
                        : "bg-white/70 border-slate-100 hover:bg-slate-50 active:scale-95"
                    )}
                  >
                    {/* Top Row: Date Number & Transaction Count */}
                    <div className="w-full flex items-center justify-between px-0.5 pointer-events-none">
                      <span
                        className={cn(
                          "text-[11px] font-black leading-none",
                          isSelected
                            ? "text-[#5228E0]"
                            : isToday
                            ? "text-[#6C3BFF]"
                            : "text-slate-800"
                        )}
                      >
                        {day.dayOfMonth}
                      </span>

                      {/* Transaction Count Pill (if > 1) */}
                      {day.transactionCount > 1 && (
                        <span
                          className={cn(
                            "text-[8px] font-bold px-1 py-0.2 rounded-full leading-none border",
                            isSelected
                              ? "bg-[#6C3BFF]/20 text-[#5228E0] border-[#6C3BFF]/30"
                              : "bg-slate-100 text-slate-600 border-slate-200/80"
                          )}
                        >
                          {day.transactionCount}
                        </span>
                      )}

                      {/* Single Transaction or Today Marker */}
                      {day.transactionCount === 1 && isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6C3BFF]" />
                      )}
                      {day.transactionCount === 0 && isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6C3BFF]" />
                      )}
                    </div>

                    {/* Bottom Area: Intelligent Financial Indicator without truncation */}
                    <div className="w-full flex flex-col items-center justify-end pointer-events-none pb-0.5">
                      {/* Scenario A: Single Transaction -> Show Compact Amount (e.g. ₹250, ₹1.5K) */}
                      {day.transactionCount === 1 ? (
                        hasExpense ? (
                          <span className="text-[9px] font-bold text-rose-600 leading-none truncate max-w-full">
                            -{formatCompactCurrency(day.totalExpense)}
                          </span>
                        ) : hasIncome ? (
                          <span className="text-[9px] font-bold text-emerald-600 leading-none truncate max-w-full">
                            +{formatCompactCurrency(day.totalIncome)}
                          </span>
                        ) : null
                      ) : day.transactionCount > 1 ? (
                        /* Scenario B: Multiple Transactions -> Dual Subtle Indicators */
                        <div className="flex items-center gap-1">
                          {hasIncome && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-2xs"
                              title="Income"
                            />
                          )}
                          {hasExpense && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-2xs"
                              title="Expense"
                            />
                          )}
                        </div>
                      ) : null}

                      {/* Lent / Debt Subtle Tag if applicable */}
                      {(hasLent || hasDebt) && (
                        <span
                          className={cn(
                            "text-[7px] font-black px-1 rounded leading-none border mt-0.5",
                            hasLent
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {hasLent ? "L" : "D"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Trailing Empty Cells */}
              {Array.from({ length: trailingSpaces }).map((_, i) => (
                <div
                  key={`trailing-${i}`}
                  className="aspect-[1/1.05] min-h-[46px] rounded-xl bg-slate-50/40 border border-transparent"
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. FINANCIAL ACTIVITY SUMMARY FOR SELECTED DATE           */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-2xs">
        {selectedDayNum !== null ? (
          <div>
            {/* Header: Selected Date Title & Quick Deselect */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-[#6C3BFF] flex items-center justify-center font-bold text-xs">
                  {selectedDayNum}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">
                    {selectedDayNum} {monthName} {year}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {selectedDayTxns.length}{" "}
                    {selectedDayTxns.length === 1 ? "transaction recorded" : "transactions recorded"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayNum(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Deselect date"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Summary Metric Row */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Income
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-700 tabular-nums">
                  {formatCurrency(selectedDayIncome)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 block">
                  Expenses
                </span>
                <span className="text-xs sm:text-sm font-black text-rose-600 tabular-nums">
                  {formatCurrency(selectedDayExpense)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                  Net
                </span>
                <span
                  className={cn(
                    "text-xs sm:text-sm font-black tabular-nums",
                    selectedDayNet >= 0 ? "text-emerald-700" : "text-rose-600"
                  )}
                >
                  {selectedDayNet >= 0 ? "+" : ""}
                  {formatCurrency(selectedDayNet)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Default state when no single day selected: Monthly Overview */
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6C3BFF]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Monthly Cashflow Position
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Tap any date to inspect</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Income
                </span>
                <span className="text-xs font-black text-emerald-700 tabular-nums">
                  {formatCurrency(totalMonthIncome)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 block">
                  Expenses
                </span>
                <span className="text-xs font-black text-rose-600 tabular-nums">
                  {formatCurrency(totalMonthExpense)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-100">
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 block">
                  Net Position
                </span>
                <span
                  className={cn(
                    "text-xs font-black tabular-nums",
                    totalMonthNet >= 0 ? "text-emerald-700" : "text-rose-600"
                  )}
                >
                  {totalMonthNet >= 0 ? "+" : ""}
                  {formatCurrency(totalMonthNet)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. DAILY TRANSACTION LIST FOR SELECTED DATE               */}
      {/* ========================================================= */}
      {selectedDayNum !== null && (
        <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">
              Activity for {selectedDayNum} {monthName}
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/80">
              {selectedDayTxns.length} {selectedDayTxns.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {selectedDayTxns.length === 0 ? (
            /* Empty State */
            <div className="py-7 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
              <CalendarIcon className="w-7 h-7 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No activity recorded for this date.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Zero expenses or deposits logged on {selectedDayNum} {monthName}.
              </p>
              <button
                type="button"
                onClick={() => router.push("/transactions?action=new")}
                className="btn-primary mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry</span>
              </button>
            </div>
          ) : (
            /* Transactions List */
            <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar pt-1">
              {selectedDayTxns.map((txn) => {
                const isExpense = txn.transactionType === "EXPENSE";
                const theme = getCategoryTheme(txn.category || "Other");
                const CategoryIcon = theme.icon;
                const mappedInfo = mappedTxnMap.get(txn.id);

                return (
                  <div
                    key={txn.id}
                    onClick={() => setActiveTxnSheet(txn)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200/70 transition-all cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Category Icon Badge */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/60",
                          theme.bgLight,
                          theme.iconClass
                        )}
                      >
                        <CategoryIcon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {txn.merchant}
                          </p>
                          {mappedInfo && (
                            <span
                              className={cn(
                                "text-[9px] font-extrabold px-1.5 py-0.2 rounded border",
                                mappedInfo.type === "LENT"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              )}
                            >
                              {mappedInfo.type === "LENT" ? "Lent" : "Debt"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span>{txn.category}</span>
                          <span>·</span>
                          <span>{txn.paymentMethod}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
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
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODALS & DRAWERS (Preserved Existing Functionality)    */}
      {/* ========================================================= */}
      {/* Category Budget Modal (Limits) */}
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

      {/* Transaction Details Bottom Sheet */}
      {activeTxnSheet && (
        <MobileTransactionSheet
          transaction={activeTxnSheet}
          isOpen={Boolean(activeTxnSheet)}
          onClose={() => setActiveTxnSheet(null)}
          onEdit={(txn) => {
            setActiveTxnSheet(null);
            setEditModalTxn(txn);
          }}
          onDelete={async (id) => {
            try {
              await api.deleteTransaction(id);
              fetchCalendar();
            } catch (e) {
              console.error("Failed to delete transaction", e);
            }
          }}
        />
      )}

      {/* Transaction Edit Modal */}
      {editModalTxn && (
        <TransactionModal
          isOpen={Boolean(editModalTxn)}
          onClose={() => setEditModalTxn(null)}
          initialData={editModalTxn}
          onSubmit={async (payload) => {
            await api.updateTransaction(editModalTxn.id, payload);
            fetchCalendar();
          }}
        />
      )}
    </div>
  );
}
