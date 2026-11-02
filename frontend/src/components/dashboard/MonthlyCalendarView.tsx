"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { CalendarDaySummary, DebtLentRecord, Transaction } from "@/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, ArrowDownRight, ArrowUpRight, X, Link2, ExternalLink, Sliders, CheckSquare, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import CategoryBadge from "@/components/common/CategoryBadge";
import CategoryBudgetModal from "@/components/dashboard/CategoryBudgetModal";

export default function MonthlyCalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 10, 1));
  const [calendarDays, setCalendarDays] = useState<CalendarDaySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDaySummary | null>(null);
  const [selectedDayNumbers, setSelectedDayNumbers] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDay, setDragStartDay] = useState<number | null>(null);
  const [isMultiDayDrawerOpen, setIsMultiDayDrawerOpen] = useState(false);
  const [debtLentRecords, setDebtLentRecords] = useState<DebtLentRecord[]>([]);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [todayYear, setTodayYear] = useState<number>(2026);
  const [todayMonth, setTodayMonth] = useState<number>(11);

  useEffect(() => {
    // Always default calendar to current real-time month on client mount
    const now = new Date();
    setTodayYear(now.getFullYear());
    setTodayMonth(now.getMonth() + 1);
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));

    api.getDebtLentRecords().then((records) => {
      setDebtLentRecords(records);
    }).catch((e) => {
      console.error("Failed to load debt & lent records for calendar", e);
    });
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

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const data = await api.getMonthlyCalendar(year, month);
      setCalendarDays(data);
    } catch (e) {
      console.error("Failed to load monthly calendar data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    setSelectedDay(null);
    setSelectedDayNumbers([]);
    setIsMultiDayDrawerOpen(false);

    const handleSync = () => {
      fetchCalendar();
      fetchDebtLentRecords();
    };
    window.addEventListener("finora-sync-completed", handleSync);
    return () => window.removeEventListener("finora-sync-completed", handleSync);
  }, [year, month]);

  // Window mouseup listener to guarantee drag cancellation
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
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

  const selectionTitle = useMemo(() => {
    if (selectedDayNumbers.length === 0) return "";
    if (selectedDayNumbers.length === 1) {
      const d = selectedDaysList[0];
      return d ? `${d.date}` : `Day ${selectedDayNumbers[0]}`;
    }

    // Check if all selected days correspond to a single weekday column (e.g. all Sundays)
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
      return `All ${fullNames[colName] || colName} (${selectedDayNumbers.length} days)`;
    }

    const sorted = [...selectedDayNumbers].sort((a, b) => a - b);
    const isContiguous = sorted.every((num, idx) => idx === 0 || num === sorted[idx - 1] + 1);
    if (isContiguous) {
      return `${monthName} ${sorted[0]} – ${sorted[sorted.length - 1]} (${sorted.length} days)`;
    }

    return `${sorted.length} Days Selected`;
  }, [selectedDayNumbers, selectedDaysList, startOffset, dayNames, monthName]);

  const handleWeekdayClick = (colIdx: number) => {
    const matchingDays = calendarDays
      .filter((d) => ((startOffset + (d.dayOfMonth - 1)) % 7) === colIdx)
      .map((d) => d.dayOfMonth);

    if (matchingDays.length === 0) return;

    const allSelected = matchingDays.every((d) => selectedDayNumbers.includes(d));
    if (allSelected) {
      setSelectedDayNumbers((prev) => prev.filter((d) => !matchingDays.includes(d)));
      setSelectedDay(null);
      setIsMultiDayDrawerOpen(false);
    } else {
      const nextSelection = Array.from(new Set([...selectedDayNumbers, ...matchingDays]));
      setSelectedDayNumbers(nextSelection);
      setIsMultiDayDrawerOpen(true);
      if (matchingDays.length === 1) {
        const found = calendarDays.find((d) => d.dayOfMonth === matchingDays[0]);
        if (found) setSelectedDay(found);
      } else {
        setSelectedDay(null);
      }
    }
  };

  const handleDayMouseDown = (dayNum: number, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (selectedDayNumbers.includes(dayNum)) {
        setSelectedDayNumbers((prev) => prev.filter((d) => d !== dayNum));
      } else {
        setSelectedDayNumbers((prev) => [...prev, dayNum]);
      }
      return;
    }

    setIsDragging(true);
    setDragStartDay(dayNum);
    setSelectedDayNumbers([dayNum]);
    const found = calendarDays.find((d) => d.dayOfMonth === dayNum);
    setSelectedDay(found || null);
    setIsMultiDayDrawerOpen(false);
  };

  const handleDayMouseEnter = (dayNum: number) => {
    if (!isDragging || dragStartDay === null) return;
    const start = Math.min(dragStartDay, dayNum);
    const end = Math.max(dragStartDay, dayNum);
    const range: number[] = [];
    for (let i = start; i <= end; i++) {
      if (calendarDays.some((d) => d.dayOfMonth === i)) {
        range.push(i);
      }
    }
    setSelectedDayNumbers(range);
    if (range.length > 1) {
      setSelectedDay(null);
      setIsMultiDayDrawerOpen(true);
    }
  };

  const handleDayClick = (day: CalendarDaySummary) => {
    if (selectedDayNumbers.length > 1) {
      setSelectedDayNumbers([day.dayOfMonth]);
      setSelectedDay(day);
      setIsMultiDayDrawerOpen(false);
    } else if (selectedDayNumbers.includes(day.dayOfMonth) && selectedDay) {
      setSelectedDayNumbers([]);
      setSelectedDay(null);
      setIsMultiDayDrawerOpen(false);
    } else {
      setSelectedDayNumbers([day.dayOfMonth]);
      setSelectedDay(day);
      setIsMultiDayDrawerOpen(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedDayNumbers([]);
    setSelectedDay(null);
    setIsMultiDayDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Month Highlights Banner: 2x2 grid on phone view */}
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
            <h4 className="text-base sm:text-xl font-black text-indigo-600 mt-0.5 sm:mt-1">
              {activeDays} {activeDays === 1 ? "day" : "days"}
            </h4>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="w-full rounded-2xl liquid-glass p-3.5 sm:p-5 border border-slate-200/80 shadow-sm">
        {/* Calendar Header with Month Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  Daily Cashflow Calendar
                </h4>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Lent
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Debt
                  </span>
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Click headers to select all (e.g. Sun) or click & drag to batch calculate
              </p>
            </div>
          </div>

          {/* Controls: Month Navigation & Set Limits */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Navigation */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer shadow-2xs"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={handleCurrentMonth}
                className="text-xs font-bold px-2 sm:px-3 min-w-[110px] sm:min-w-[130px] text-center text-slate-900 hover:text-[#5228E0] transition-colors cursor-pointer"
                title="Click to jump to Current Month"
              >
                {monthName} {year}
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

        {/* Multi-Day Selection Quick Report Banner */}
        {selectedDayNumbers.length > 0 && (
          <div className="mb-4 p-3 sm:p-4 rounded-2xl liquid-glass border border-indigo-200/90 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fadeIn select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                {selectedDayNumbers.length}d
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                    {selectionTitle}
                  </h5>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 border border-indigo-200/60 px-2 py-0.5 rounded-full">
                    Total Report
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {selectedDayNumbers.length > 1
                    ? "Combined expenses & income across selected days"
                    : "Single day summary view"}
                </p>
              </div>
            </div>

            {/* Financial Summary Metrics */}
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

              <div className="flex items-center gap-1.5 ml-auto md:ml-1">
                {selectedTxnCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedDayNumbers.length === 1) {
                        const found = calendarDays.find((d) => d.dayOfMonth === selectedDayNumbers[0]);
                        if (found) setSelectedDay(found);
                      }
                      setIsMultiDayDrawerOpen(true);
                    }}
                    className="btn-primary h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl text-white text-[10px] sm:text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    Inspect {selectedTxnCount} Txns
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Clear Selection"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Weekday Labels (Clickable column selectors) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2 select-none">
          {dayNames.map((d, colIdx) => {
            const matchingDays = calendarDays
              .filter((day) => ((startOffset + (day.dayOfMonth - 1)) % 7) === colIdx)
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
                    ? "bg-indigo-600 text-white shadow-xs"
                    : d === "Sun"
                    ? "text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    : "text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                )}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 select-none">
          {/* Leading empty spaces */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[58px] sm:min-h-[76px] rounded-xl bg-slate-50/50" />
          ))}

          {/* Calendar Days */}
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
              <div
                key={day.dayOfMonth}
                onMouseDown={(e) => handleDayMouseDown(day.dayOfMonth, e)}
                onMouseEnter={() => handleDayMouseEnter(day.dayOfMonth)}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[58px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none",
                  isSelected
                    ? "bg-indigo-50/90 border-indigo-500 shadow-md ring-2 ring-indigo-400/80 scale-[1.02] z-10"
                    : day.transactionCount > 0
                    ? hasLent
                      ? "bg-white border-emerald-300 hover:border-emerald-500 hover:shadow-xs"
                      : hasDebt
                      ? "bg-white border-amber-300 hover:border-amber-500 hover:shadow-xs"
                      : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs"
                    : "bg-white/60 border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span
                      className={`text-[11px] sm:text-xs font-black ${
                        isSelected ? "text-indigo-700" : "text-slate-800"
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

                {/* Day Cashflow Tags */}
                <div className="flex flex-col gap-0.5 mt-0.5 sm:mt-1 overflow-hidden">
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
              </div>
            );
          })}
        </div>

        {/* Slide-down Day Details / Multi-Day Drawer */}
        {(isMultiDayDrawerOpen && selectedDayNumbers.length > 0) ? (
          <div className="mt-6 p-4 rounded-2xl liquid-glass-elevated border border-indigo-200/90 shadow-md animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedDayNumbers.length}d
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      {selectionTitle}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                      {selectedTxnCount} {selectedTxnCount === 1 ? "transaction" : "transactions"}
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
              </div>
              <button
                type="button"
                onClick={() => setIsMultiDayDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer self-end sm:self-center"
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
                              {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                            </span>
                            <p className="font-bold text-slate-900 group-hover:text-indigo-900 transition-colors truncate">
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
              <p className="text-xs text-slate-500 py-3 text-center">No transactions recorded across these selected days.</p>
            )}
          </div>
        ) : selectedDay ? (
          <div className="mt-6 p-4 rounded-xl liquid-glass-elevated border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {selectedDay.date}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                  {selectedDay.transactionCount} {selectedDay.transactionCount === 1 ? "transaction" : "transactions"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDay.transactions && selectedDay.transactions.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedDay.transactions.map((txn: Transaction) => {
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
                      <div className="flex items-center gap-3">
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
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 group-hover:text-indigo-900 transition-colors">
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
                                className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
                                  mappedInfo.type === "LENT"
                                    ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20"
                                    : "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 ring-2 ring-amber-500/20"
                                }`}
                              >
                                <Link2 className="w-3 h-3" />
                                <span>
                                  {mappedInfo.isInstallment
                                    ? `Repayment · ${mappedInfo.counterpartyName}`
                                    : `${mappedInfo.type === "LENT" ? "Lent" : "Debt"} · ${mappedInfo.counterpartyName}`}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70 ml-0.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
                            <CategoryBadge category={txn.category} className="scale-90 origin-left" />
                            <span>·</span>
                            <span>{txn.paymentMethod}</span>
                            {txn.referenceNumber && <span>· Ref: {txn.referenceNumber}</span>}
                            {mappedInfo?.amountDifferenceReason && (
                              <span className="text-amber-800 font-medium">· Note: {mappedInfo.amountDifferenceReason}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`font-extrabold ${
                            txn.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {txn.transactionType === "EXPENSE" ? "-" : "+"}
                          {formatCurrency(txn.amount)}
                        </span>
                        {mappedInfo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToMappedRecord(mappedInfo.recordId, mappedInfo.type);
                            }}
                            className={`text-[10px] font-bold mt-1 flex items-center justify-end gap-1 hover:underline cursor-pointer ${
                              mappedInfo.type === "LENT"
                                ? "text-emerald-700 hover:text-emerald-800"
                                : "text-amber-700 hover:text-amber-800"
                            }`}
                          >
                            <span>Open Tracker</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">No transactions recorded on this day.</p>
            )}
          </div>
        ) : null}
      </div>

      {/* Category Spending Limits Modal for Calendar Month */}
      <CategoryBudgetModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        onUpdated={() => {
          fetchCalendar();
        }}
        year={year}
        month={month}
        monthName={`${monthName} ${year}`}
        totalExpenses={totalMonthExpense}
      />
    </div>
  );
}

