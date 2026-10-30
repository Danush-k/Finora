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
    api.getDashboardSummary().then((summary) => {
      if (summary.recentTransactions && summary.recentTransactions.length > 0) {
        const latestDate = new Date(summary.recentTransactions[0].transactionDate);
        setCurrentDate(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
      } else {
        setCurrentDate(new Date());
      }
    }).catch(() => {
      setCurrentDate(new Date());
    });
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

  // Monthly totals
  const totalMonthExpense = calendarDays.reduce((acc, d) => acc + d.totalExpense, 0);
  const totalMonthIncome = calendarDays.reduce((acc, d) => acc + d.totalIncome, 0);
  const activeDays = calendarDays.filter((d) => d.transactionCount > 0).length;

  return (
    <div className="space-y-6">
      {/* Month Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl liquid-glass border border-rose-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Spent in {monthName}
            </span>
            <h4 className="text-xl font-extrabold text-rose-600 mt-1">
              {formatCurrency(totalMonthExpense)}
            </h4>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl liquid-glass border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Inflow in {monthName}
            </span>
            <h4 className="text-xl font-extrabold text-emerald-600 mt-1">
              {formatCurrency(totalMonthIncome)}
            </h4>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl liquid-glass border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Transaction Days
            </span>
            <h4 className="text-xl font-extrabold text-indigo-600 mt-1">
              {activeDays} {activeDays === 1 ? "day" : "days"}
            </h4>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="w-full rounded-2xl liquid-glass p-5 border border-slate-200/80 shadow-sm">
        {/* Calendar Header with Month Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                Daily Cashflow Calendar
              </h4>
              <p className="text-xs text-slate-500">Select any date to inspect transactions</p>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 min-w-[130px] text-center text-slate-900">
              {monthName} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
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
            <div key={`empty-${i}`} className="min-h-[58px] sm:min-h-[76px] rounded-xl bg-slate-50/50" />
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
                className={`min-h-[58px] sm:min-h-[76px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-200"
                    : day.transactionCount > 0
                    ? "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs"
                    : "bg-white/60 border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? "text-indigo-700" : "text-slate-800"
                    }`}
                  >
                    {day.dayOfMonth}
                  </span>
                  {day.transactionCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      {day.transactionCount}
                    </span>
                  )}
                </div>

                {/* Day Cashflow Tags */}
                <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                  {hasIncome && (
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 truncate">
                      +{formatCurrency(day.totalIncome)}
                    </span>
                  )}
                  {hasExpense && (
                    <span className="text-[10px] sm:text-[11px] font-bold text-rose-600 truncate">
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
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedDay.transactions && selectedDay.transactions.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedDay.transactions.map((txn: Transaction) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg ${
                          txn.transactionType === "EXPENSE"
                            ? "bg-rose-100/80 text-rose-600"
                            : "bg-emerald-100/80 text-emerald-600"
                        }`}
                      >
                        {txn.transactionType === "EXPENSE" ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{txn.merchant}</p>
                        <p className="text-[10px] text-slate-500">
                          {txn.category} · {txn.paymentMethod} {txn.referenceNumber ? `· Ref: ${txn.referenceNumber}` : ""}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-extrabold ${
                        txn.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {txn.transactionType === "EXPENSE" ? "-" : "+"}
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-2">No transactions recorded on this day.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
