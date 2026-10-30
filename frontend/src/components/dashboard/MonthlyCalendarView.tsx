"use client";

import React, { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { CalendarDaySummary, DebtLentRecord, Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar, ArrowDownRight, ArrowUpRight, X, Link2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import CategoryBadge from "@/components/common/CategoryBadge";

export default function MonthlyCalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 9, 1));
  const [calendarDays, setCalendarDays] = useState<CalendarDaySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDaySummary | null>(null);
  const [debtLentRecords, setDebtLentRecords] = useState<DebtLentRecord[]>([]);

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
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                  Daily Cashflow Calendar
                </h4>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Lent
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Debt
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Select any date to inspect transactions and mapped debt/lent items
              </p>
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
                onClick={() => setSelectedDay(day)}
                className={`min-h-[62px] sm:min-h-[80px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-200"
                    : day.transactionCount > 0
                    ? hasLent
                      ? "bg-white border-emerald-300 hover:border-emerald-500 hover:shadow-xs"
                      : hasDebt
                      ? "bg-white border-amber-300 hover:border-amber-500 hover:shadow-xs"
                      : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs"
                    : "bg-white/60 border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-indigo-700" : "text-slate-800"
                      }`}
                    >
                      {day.dayOfMonth}
                    </span>
                    {(hasLent || hasDebt) && (
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded leading-tight border ${
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
                        {hasLent && hasDebt ? "Lent · Debt" : hasLent ? "Lent" : "Debt"}
                      </span>
                    )}
                  </div>
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
        )}
      </div>
    </div>
  );
}
