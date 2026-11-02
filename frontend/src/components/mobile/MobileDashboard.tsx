"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  PieChart,
  PlusCircle,
  UploadCloud,
  Calendar,
  HandCoins,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import {
  DashboardSummary,
  MonthlyChartData,
  MonthlyChartPoint,
  CategoryBudgetStatus,
  OverallBudgetInfo,
  Transaction,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getCategoryTheme } from "@/lib/category-theme";
import { ChartPeriod } from "@/components/dashboard/ExpenseChart";
import MobileTransactionSheet from "./MobileTransactionSheet";

interface MobileDashboardProps {
  summary: DashboardSummary | null;
  monthlyChart: MonthlyChartData | null;
  categoryBudgets: CategoryBudgetStatus[];
  overallBudget: OverallBudgetInfo | null;
  selectedMonthKey: string | null;
  selectedMonthName: string | null;
  chartPeriod: ChartPeriod;
  onPeriodChange: (p: ChartPeriod) => void;
  onSelectMonth: (point: MonthlyChartPoint) => void;
  onResetMonth: () => void;
  onOpenBudgetModal: () => void;
  onOpenCsvModal: () => void;
  onEditTransaction?: (txn: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
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
  onSelectMonth,
  onResetMonth,
  onOpenBudgetModal,
  onOpenCsvModal,
  onEditTransaction,
  onDeleteTransaction,
}: MobileDashboardProps) {
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Financial figures
  const totalExpenses = summary?.totalExpensesThisMonth || 0;
  const totalIncome = summary?.totalIncomeThisMonth || 0;
  const netSavings = summary?.netSavingsThisMonth || 0;
  const totalRecords = summary?.totalTransactionsCount || 0;

  // Savings rate
  const savingsRate =
    totalIncome > 0
      ? Math.max(0, Math.min(100, Math.round((netSavings / totalIncome) * 100)))
      : 0;

  // Categories
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
    <div className="space-y-4 pb-28 md:hidden">
      {/* ========================================================= */}
      {/* 1. MOBILE HEADER: Greeting, Active Period, Quick Action   */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6C3BFF]">
            {selectedMonthName || summary?.activeMonthName || "Current Month"}
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
            Financial Overview
          </h2>
        </div>

        {/* Quick Actions (Add Entry & Import) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCsvModal}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="Import CSV"
          >
            <UploadCloud className="w-4 h-4 text-[#5228E0]" />
          </button>
          <Link
            href="/transactions?action=new"
            className="btn-primary flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white shadow-2xs"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Add</span>
          </Link>
        </div>
      </div>

      {/* Selected Month Filter Reset Pill */}
      {selectedMonthKey && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-purple-50/90 border border-purple-200 text-xs">
          <span className="text-[11px] font-semibold text-purple-900">
            Filtered by: <strong>{selectedMonthName}</strong>
          </span>
          <button
            type="button"
            onClick={onResetMonth}
            className="text-[11px] font-bold text-[#6C3BFF] hover:underline cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PRIMARY FINANCIAL HERO CARD: Net Savings & Rate        */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-gradient-to-br from-[#FAF8FF] via-white to-purple-50/70 border border-purple-200/90 p-4.5 shadow-xs relative overflow-hidden select-none">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#6C3BFF]" />
            <span>Net Monthly Savings</span>
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              netSavings >= 0
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {netSavings >= 0 ? `${savingsRate}% saved` : "Deficit"}
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-0.5">
          <h3
            className={`text-2xl font-black tracking-tight tabular-nums ${
              netSavings >= 0 ? "text-slate-900" : "text-rose-600"
            }`}
          >
            {netSavings >= 0 ? "+" : ""}
            {formatCurrency(netSavings)}
          </h3>
          <span className="text-[11px] font-medium text-slate-400">
            {totalRecords} txns recorded
          </span>
        </div>

        {/* Progress Bar for Savings Ratio */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8F6BFF] via-[#7547F5] to-[#5228E0] transition-all duration-500"
            style={{ width: `${Math.max(5, savingsRate)}%` }}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SUPPORTING METRICS 2-COL GRID: Expenses & Income       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Expenses Card */}
        <div className="p-3.5 rounded-2xl bg-white border border-rose-100/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Expenses
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base font-black text-rose-600 tabular-nums">
            {formatCurrency(totalExpenses)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">Total Outflow</span>
        </div>

        {/* Total Income Card */}
        <div className="p-3.5 rounded-2xl bg-white border border-emerald-100/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Income
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base font-black text-emerald-600 tabular-nums">
            {formatCurrency(totalIncome)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5">Total Inflow</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MOBILE CASHFLOW OVERVIEW: Responsive Bar Chart         */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Cashflow Flow
            </h4>
            <span className="text-[10px] text-slate-500">Inflow vs Outflow</span>
          </div>

          {/* Segmented Period Control (Monthly | Weekly | Yearly) */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-[10px] font-bold">
            {(["MONTHLY", "WEEKLY", "YEARLY"] as ChartPeriod[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => onPeriodChange(period)}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  chartPeriod === period
                    ? "bg-white text-[#5228E0] shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {period === "MONTHLY" ? "M" : period === "WEEKLY" ? "W" : "Y"}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Mobile Bar Chart (6 points max, touchable) */}
        {monthlyChart && monthlyChart.points && monthlyChart.points.length > 0 ? (
          <div>
            <div className="h-44 flex items-end justify-between gap-2 pt-4 px-1">
              {monthlyChart.points.slice(-6).map((pt, idx) => {
                const maxVal = Math.max(
                  ...monthlyChart.points.map((p) => Math.max(p.expenses, p.income, 1))
                );
                const expenseH = Math.max(8, Math.round((pt.expenses / maxVal) * 100));
                const incomeH = Math.max(8, Math.round((pt.income / maxVal) * 100));
                const isSelected = selectedMonthKey === pt.fullMonth;

                return (
                  <div
                    key={idx}
                    onClick={() => onSelectMonth(pt)}
                    className={`flex-1 flex flex-col items-center gap-1 cursor-pointer transition-transform active:scale-95 ${
                      isSelected ? "scale-105" : ""
                    }`}
                  >
                    <div className="w-full flex items-end justify-center gap-1 h-32">
                      {/* Income Bar (Mint Green) */}
                      <div
                        className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${
                          isSelected ? "bg-emerald-500" : "bg-emerald-400/80"
                        }`}
                        style={{ height: `${incomeH}%` }}
                        title={`Income: ${formatCurrency(pt.income)}`}
                      />
                      {/* Expense Bar (Lavender Purple) */}
                      <div
                        className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${
                          isSelected ? "bg-[#6C3BFF]" : "bg-indigo-300/85"
                        }`}
                        style={{ height: `${expenseH}%` }}
                        title={`Expenses: ${formatCurrency(pt.expenses)}`}
                      />
                    </div>
                    {/* Month Label */}
                    <span
                      className={`text-[9px] font-semibold truncate ${
                        isSelected
                          ? "text-[#6C3BFF] font-black underline"
                          : "text-slate-500"
                      }`}
                    >
                      {pt.month.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[10px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-emerald-400 inline-block" />
                  Inflow
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-[#6C3BFF] inline-block" />
                  Outflow
                </span>
              </div>
              <span className="text-[9px] text-slate-400">Tap bar to filter</span>
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400">
            No cashflow data available.
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. EXPENSE CATEGORIES: Mobile Clean Card                  */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 text-[#6C3BFF] border border-purple-100">
              <PieChart className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Expense by Category
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenBudgetModal}
            className="text-[11px] font-bold text-[#6C3BFF] flex items-center gap-1 cursor-pointer hover:underline"
          >
            <Sliders className="w-3 h-3" />
            <span>Limits</span>
          </button>
        </div>

        {/* Overall Monthly Budget Bar */}
        {overallBudget && overallBudget.hasLimit && overallBudget.limitValue > 0 && (
          <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-purple-50/50 border border-indigo-100 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-slate-700 text-[11px]">Monthly Budget</span>
              <span className="font-black text-slate-900 text-[11px]">
                {formatCurrency(overallBudget.totalExpenses || totalExpenses)}{" "}
                <span className="text-slate-400 font-normal">
                  / {formatCurrency(overallBudget.limitValue)}
                </span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallBudget.status === "EXCEEDED"
                    ? "bg-rose-500"
                    : overallBudget.status === "WARNING"
                    ? "bg-amber-500"
                    : "bg-[#6C3BFF]"
                }`}
                style={{
                  width: `${Math.min(100, Math.round(overallBudget.percentageUsed || 0))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Category Rows */}
        {categoryEntries.length > 0 ? (
          <div className="space-y-2">
            {visibleCategories.map(([cat, amt]) => {
              const pct = Math.min(100, Math.round((amt / totalCatExpenses) * 100));
              const theme = getCategoryTheme(cat);
              const CategoryIcon = theme.icon;

              return (
                <div key={cat} className="space-y-1 py-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md ${theme.bgLight} ${theme.iconClass} flex items-center justify-center shrink-0 border border-slate-200/50`}
                      >
                        <CategoryIcon className="w-3 h-3" />
                      </div>
                      <span className="font-bold text-slate-800 text-xs truncate">
                        {cat}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 text-xs">
                        {formatCurrency(amt)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {categoryEntries.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="w-full py-1.5 rounded-xl bg-slate-50 text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1 cursor-pointer mt-1"
              >
                <span>
                  {showAllCategories
                    ? "Show Less"
                    : `+${categoryEntries.length - 4} More Categories`}
                </span>
                {showAllCategories ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            No expenses categorized for this month.
          </p>
        )}
      </div>

      {/* ========================================================= */}
      {/* 6. MOBILE RECENT ACTIVITY: Compact Interactive List       */}
      {/* ========================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-4 shadow-xs">
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
            className="text-[11px] font-bold text-[#6C3BFF] hover:underline"
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
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isExpense
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}
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
                      className={`text-xs font-black tabular-nums ${
                        isExpense ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(txn.amount)}
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

      {/* ========================================================= */}
      {/* 7. QUICK FEATURE SHORTCUTS: Calendar & Debt/Lent          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/calendar"
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2 cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Calendar className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Cashflow Calendar</h5>
            <p className="text-[10px] text-slate-500">Day-by-day view</p>
          </div>
        </Link>

        <Link
          href="/debt-lent"
          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-2 cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <HandCoins className="w-4 h-4" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Debt & Lent</h5>
            <p className="text-[10px] text-slate-500">Money lent & owed</p>
          </div>
        </Link>
      </div>

      {/* Mobile Transaction Bottom Sheet */}
      <MobileTransactionSheet
        transaction={selectedTxn}
        isOpen={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onEdit={(txn) => {
          onEditTransaction?.(txn);
        }}
        onDelete={(id) => {
          onDeleteTransaction?.(id);
        }}
      />
    </div>
  );
}
