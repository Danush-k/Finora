"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { CalendarDaySummary, Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, ArrowDownRight, ArrowUpRight, X } from "lucide-react";

export default function MonthlyCalendarView() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 1));
  const [calendarDays, setCalendarDays] = useState<CalendarDaySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDaySummary | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

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
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Calculate first day of month offset for grid alignment (Mon = 0, Sun = 6)
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDayOfMonth + 6) % 7; // Monday as first column

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="w-full rounded-2xl liquid-glass p-5 border border-white/10">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
              Monthly Calendar View
            </h4>
            <p className="text-xs text-slate-400">Day-by-day cashflow & transactions</p>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-2 min-w-[120px] text-center text-slate-200">
            {monthName} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-medium text-slate-400 mb-2">
        {dayNames.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Leading empty spaces */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[52px] sm:min-h-[68px] rounded-xl bg-white/[0.02]" />
        ))}

        {/* Calendar Days */}
        {calendarDays.map((day) => {
          const hasExpense = day.totalExpense > 0;
          const hasIncome = day.totalIncome > 0;
          const isSelected = selectedDay?.dayOfMonth === day.dayOfMonth;

          return (
            <div
              key={day.dayOfMonth}
              onClick={() => setSelectedDay(day)}
              className={`min-h-[52px] sm:min-h-[68px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "bg-indigo-500/15 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30"
                  : day.transactionCount > 0
                  ? "bg-white/[0.05] border-white/10 hover:border-white/25 hover:bg-white/[0.08]"
                  : "bg-white/[0.02] border-white/5 hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${
                    isSelected ? "text-indigo-300" : "text-slate-300"
                  }`}
                >
                  {day.dayOfMonth}
                </span>
                {day.transactionCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-medium">
                    {day.transactionCount}
                  </span>
                )}
              </div>

              {/* Day Metrics */}
              <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                {hasIncome && (
                  <span className="text-[10px] sm:text-[11px] font-medium text-emerald-400 truncate">
                    +{formatCurrency(day.totalIncome)}
                  </span>
                )}
                {hasExpense && (
                  <span className="text-[10px] sm:text-[11px] font-medium text-rose-400 truncate">
                    -{formatCurrency(day.totalExpense)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-down Day Details Drawer */}
      {selectedDay && (
        <div className="mt-5 p-4 rounded-xl liquid-glass-elevated border border-white/15 animate-fadeIn">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {selectedDay.date}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                {selectedDay.transactionCount} {selectedDay.transactionCount === 1 ? "transaction" : "transactions"}
              </span>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDay.transactions && selectedDay.transactions.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedDay.transactions.map((txn: Transaction) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg ${
                        txn.transactionType === "EXPENSE"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {txn.transactionType === "EXPENSE" ? (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{txn.merchant}</p>
                      <p className="text-[10px] text-slate-400">
                        {txn.category} · {txn.paymentMethod} {txn.referenceNumber ? `· Ref: ${txn.referenceNumber}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold ${
                      txn.transactionType === "EXPENSE" ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {txn.transactionType === "EXPENSE" ? "-" : "+"}
                    {formatCurrency(txn.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2">No transactions recorded on this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
