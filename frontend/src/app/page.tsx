"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardSummary, MonthlyChartData, MonthlyChartPoint } from "@/types";
import MetricCard from "@/components/dashboard/MetricCard";
import ExpenseChart, { ChartPeriod, ChartPeriodStats } from "@/components/dashboard/ExpenseChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  ReceiptText,
  PieChart,
  PlusCircle,
  Calendar,
  ArrowRight,
  UploadCloud,
  HandCoins,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import CsvImportModal from "@/components/transactions/CsvImportModal";
import CategoryBudgetModal from "@/components/dashboard/CategoryBudgetModal";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { CategoryBudgetStatus, OverallBudgetInfo } from "@/types";
import { DashboardSkeleton } from "@/components/common/LoadingSkeletons";
import { getCategoryTheme } from "@/lib/category-theme";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyChart, setMonthlyChart] = useState<MonthlyChartData | null>(null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetStatus[]>([]);
  const [overallBudget, setOverallBudget] = useState<OverallBudgetInfo | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("modal") === "budget";
    }
    return false;
  });
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedMonthName, setSelectedMonthName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Period toggle: MONTHLY | WEEKLY | YEARLY
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("MONTHLY");

  // Remember previous month state when switching between toggles
  const [previousMonthPoint, setPreviousMonthPoint] = useState<MonthlyChartPoint | null>(null);

  // Live stats computed based on the active toggle (Monthly, Weekly, Yearly)
  const [activeToggleStats, setActiveToggleStats] = useState<ChartPeriodStats | null>(null);

  // Category Expand state: keep standard 4 items, allow expanding if more
  const [showAllCategories, setShowAllCategories] = useState(false);

  const loadData = async (year?: number, month?: number, monthKey?: string) => {
    try {
      if (year && month) {
        setIsFiltering(true);
      } else {
        setLoading(true);
      }

      const [sum, chart, budgetRes] = await Promise.all([
        api.getDashboardSummary(year, month),
        api.getMonthlyChart(),
        api.getBudgetSummary(year, month).catch(() => null),
      ]);

      setSummary(sum);
      setMonthlyChart(chart);
      if (budgetRes) {
        setCategoryBudgets(budgetRes.categories || []);
        setOverallBudget(budgetRes.overallBudget || null);
      } else {
        setCategoryBudgets([]);
        setOverallBudget(null);
      }

      if (monthKey) {
        setSelectedMonthKey(monthKey);
        setSelectedMonthName(sum.activeMonthName || monthKey);
      } else if (sum.activeMonthKey) {
        setSelectedMonthKey(sum.activeMonthKey);
        setSelectedMonthName(sum.activeMonthName || sum.activeMonthKey);
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    // Restore previous state from localStorage
    if (typeof window !== "undefined") {
      const savedPeriod = localStorage.getItem("finora_dashboard_period") as ChartPeriod | null;
      if (savedPeriod && (savedPeriod === "MONTHLY" || savedPeriod === "WEEKLY" || savedPeriod === "YEARLY")) {
        setChartPeriod(savedPeriod);
      }
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const savedMonthKey = localStorage.getItem("finora_saved_month_key");
      const savedMonthName = localStorage.getItem("finora_saved_month_name");
      if (savedMonthKey && savedMonthKey === currentMonthKey) {
        const parts = savedMonthKey.split("-").map(Number);
        if (parts.length === 2) {
          setPreviousMonthPoint({
            month: savedMonthName || "Month",
            fullMonth: savedMonthKey,
            year: parts[0],
            monthNumber: parts[1],
            expenses: 0,
            income: 0,
            savings: 0,
          });
          loadData(parts[0], parts[1], savedMonthKey);
          return;
        }
      }
    }
    loadData();
  }, []);

  const handlePeriodChange = (newPeriod: ChartPeriod) => {
    setChartPeriod(newPeriod);
    if (typeof window !== "undefined") {
      localStorage.setItem("finora_dashboard_period", newPeriod);
    }
  };

  const handleSelectMonth = (point: MonthlyChartPoint) => {
    setPreviousMonthPoint(point);
    if (typeof window !== "undefined") {
      localStorage.setItem("finora_saved_month_key", point.fullMonth);
      localStorage.setItem("finora_saved_month_name", point.month);
    }
    loadData(point.year, point.monthNumber, point.fullMonth);
  };

  const handleResetMonth = () => {
    setSelectedMonthKey(null);
    setSelectedMonthName(null);
    setPreviousMonthPoint(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("finora_saved_month_key");
      localStorage.removeItem("finora_saved_month_name");
    }
    loadData();
  };

  // If loading initially, show the smooth Apple Liquid Glass skeleton loader
  if (loading && !summary) {
    return <DashboardSkeleton />;
  }

  // Compute category breakdown entries
  const categoryEntries = summary?.categoryBreakdown
    ? Object.entries(summary.categoryBreakdown).sort((a, b) => b[1] - a[1])
    : [];
  const totalCategoryExpenses = summary?.totalExpensesThisMonth || 1;
  const visibleCategories = showAllCategories ? categoryEntries : categoryEntries.slice(0, 4);

  return (
    <div className="space-y-5 sm:space-y-6 pb-28">
      {/* ========================================================= */}
      {/* 1. TOP HEADER: Clean Title & Compact Action Buttons       */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          {/* Permanent, stable title that never jumps */}
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Financial Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Real-time HDFC transaction monitoring</span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-700">
              {selectedMonthName || summary?.activeMonthName || "Current Period"}
            </span>
            {selectedMonthKey && (
              <button
                type="button"
                onClick={handleResetMonth}
                className="text-[11px] text-[#6C3BFF] font-bold hover:underline cursor-pointer"
              >
                (Reset Filter)
              </button>
            )}
          </p>
        </div>

        {/* Compact, refined action buttons (not oversized) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="btn-secondary h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#5228E0]" />
            <span>Import CSV</span>
          </button>
          <Link
            href="/calendar"
            className="btn-secondary h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-[#5228E0]" />
            <span>Calendar</span>
          </Link>
          <Link
            href="/transactions?action=new"
            className="btn-primary h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-white" />
            <span className="text-white font-semibold">New Entry</span>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. METRIC CARDS: 2x2 Bento on Mobile, 4-col on Desktop    */}
      {/* ========================================================= */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 transition-opacity duration-200 ${
          isFiltering ? "opacity-60" : "opacity-100"
        }`}
      >
        <MetricCard
          title={
            chartPeriod === "YEARLY"
              ? "Annual Expenses"
              : chartPeriod === "WEEKLY"
              ? "Weekly Expenses"
              : "Total Expenses"
          }
          amount={activeToggleStats ? activeToggleStats.expenses : summary?.totalExpensesThisMonth || 0}
          icon={TrendingDown}
          variant="expense"
          count={activeToggleStats?.count ?? summary?.expensesCountThisMonth}
          subtitle={activeToggleStats?.subtitle || summary?.activeMonthName || "This Month"}
        />
        <MetricCard
          title={
            chartPeriod === "YEARLY"
              ? "Annual Income"
              : chartPeriod === "WEEKLY"
              ? "Weekly Income"
              : "Total Income"
          }
          amount={activeToggleStats ? activeToggleStats.income : summary?.totalIncomeThisMonth || 0}
          icon={TrendingUp}
          variant="income"
          count={summary?.incomeCountThisMonth}
          subtitle={activeToggleStats?.subtitle || summary?.activeMonthName || "This Month"}
        />
        <MetricCard
          title="Net Savings"
          amount={activeToggleStats ? activeToggleStats.savings : summary?.netSavingsThisMonth || 0}
          icon={Wallet}
          variant="savings"
          subtitle={
            activeToggleStats
              ? `${activeToggleStats.subtitle} Net`
              : summary?.activeMonthName
              ? `${summary.activeMonthName} Net`
              : "Inflow - Outflow"
          }
        />
        <MetricCard
          title={chartPeriod === "YEARLY" ? "Annual Records" : "Total Records"}
          amount={
            chartPeriod === "YEARLY" && activeToggleStats?.count !== undefined
              ? activeToggleStats.count
              : summary?.totalTransactionsCount || 0
          }
          icon={ReceiptText}
          variant="neutral"
          isCurrency={false}
          subtitle={chartPeriod === "YEARLY" ? "Annual Transactions" : "All Time Records"}
        />
      </div>

      {/* ========================================================= */}
      {/* 3. CHART & CATEGORY BREAKDOWN GRID                        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Chart Column (2 Cols) */}
        <div className="lg:col-span-2">
          <ExpenseChart
            data={monthlyChart?.points || []}
            activeMonthKey={selectedMonthKey}
            activeMonthName={selectedMonthName}
            period={chartPeriod}
            onPeriodChange={handlePeriodChange}
            onPeriodStatsChange={setActiveToggleStats}
            onSelectMonth={handleSelectMonth}
            onResetMonth={handleResetMonth}
          />
        </div>

        {/* ========================================================= */}
        {/* CATEGORY BREAKDOWN CARD: Standard Box with "More" Toggle  */}
        {/* ========================================================= */}
        <div
          id="expense-by-category"
          className="rounded-3xl liquid-glass p-5 sm:p-6 border border-slate-200/80 flex flex-col justify-between shadow-xs select-none"
        >
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-50 text-[#6C3BFF] border border-purple-100 shadow-2xs">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    Expense by Category
                  </h4>
                  {summary?.activeMonthName && (
                    <span className="text-[10px] text-[#6C3BFF] font-bold">
                      {summary.activeMonthName}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBudgetModalOpen(true)}
                className="btn-secondary h-7 px-2.5 rounded-lg text-[11px] font-semibold cursor-pointer shadow-2xs hover:border-[#6C3BFF]/30 flex items-center gap-1"
                title="Configure monthly budget limits"
              >
                <Sliders className="w-3 h-3 text-[#5228E0]" />
                <span>Limits</span>
              </button>
            </div>

            {/* Continuous Proportional Bar Strip across Categories */}
            {categoryEntries.length > 0 && (
              <div className="mb-3.5">
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                  {categoryEntries.map(([cat, amt]) => {
                    const pct = Math.max(2, Math.round((amt / totalCategoryExpenses) * 100));
                    const theme = getCategoryTheme(cat);
                    return (
                      <div
                        key={cat}
                        style={{ width: `${pct}%`, backgroundColor: theme.hexColor }}
                        className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full hover:opacity-85 cursor-pointer"
                        title={`${cat}: ${formatCurrency(amt)} (${pct}%)`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Overall Monthly Budget Indicator */}
            {overallBudget && overallBudget.hasLimit && overallBudget.limitValue > 0 && (
              <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-100/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                    <Wallet className="w-3 h-3 text-indigo-600" />
                    <span>Monthly Budget</span>
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs">
                    {formatCurrency(overallBudget.totalExpenses || summary?.totalExpensesThisMonth || 0)}{" "}
                    <span className="text-slate-400 font-normal text-[10px]">
                      / {formatCurrency(overallBudget.limitValue)}
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
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
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>
                    Allocated: <strong className="text-slate-700">{formatCurrency(overallBudget.totalAllocated)}</strong>
                  </span>
                  <span
                    className={
                      overallBudget.remainingBuffer < 0
                        ? "text-rose-600 font-bold"
                        : "text-emerald-700 font-semibold"
                    }
                  >
                    {overallBudget.remainingBuffer < 0
                      ? `Over by ${formatCurrency(Math.abs(overallBudget.remainingBuffer))}`
                      : `Buffer: ${formatCurrency(overallBudget.remainingBuffer)}`}
                  </span>
                </div>
              </div>
            )}

            {/* Standard Category Rows using Uniform Theme */}
            {categoryEntries.length > 0 ? (
              <div className="space-y-2.5">
                {visibleCategories.map(([cat, amt]) => {
                  const pctOfTotal = Math.min(100, Math.round((amt / totalCategoryExpenses) * 100));
                  const budget = categoryBudgets.find((b) => b.category === cat);
                  const hasLimit = !!(
                    budget &&
                    budget.hasLimit &&
                    budget.computedLimitAmount &&
                    budget.computedLimitAmount > 0
                  );
                  const computedLimit = budget?.computedLimitAmount || 0;
                  const pctOfLimit = hasLimit ? Math.round((amt / computedLimit) * 100) : 0;
                  const isOver = hasLimit && amt > computedLimit;
                  const isWarning = hasLimit && !isOver && pctOfLimit >= 80;

                  const theme = getCategoryTheme(cat);
                  const CategoryIcon = theme.icon;

                  return (
                    <div key={cat} className="space-y-1 p-1.5 rounded-xl hover:bg-slate-50/80 transition-colors">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Uniform Category Icon */}
                          <div
                            className={`w-5 h-5 rounded-md ${theme.bgLight} ${theme.iconClass} flex items-center justify-center shrink-0 border border-slate-200/50`}
                          >
                            <CategoryIcon className="w-3 h-3" />
                          </div>

                          <span className="text-slate-800 font-bold tracking-tight text-xs truncate">
                            {cat}
                          </span>

                          {hasLimit && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                                isOver
                                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                                  : isWarning
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isOver ? `+${formatCurrency(amt - computedLimit)}` : `${pctOfLimit}%`}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-slate-800 font-extrabold text-xs">
                            {formatCurrency(amt)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({pctOfTotal}%)
                          </span>
                        </div>
                      </div>

                      {/* Tailored Category Gradient Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${theme.gradient}`}
                          style={{
                            width: `${hasLimit ? Math.min(100, pctOfLimit) : pctOfTotal}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* More / Show Less Toggle Button (keeps box size standard) */}
                {categoryEntries.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="w-full py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1 cursor-pointer transition-colors mt-2"
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
              <div className="py-8 text-center text-xs text-slate-400">
                No expense categories recorded for this period.
              </div>
            )}
          </div>

          {/* Footer Card */}
          <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {categoryBudgets.filter((b) => b.hasLimit).length > 0
                ? `${categoryBudgets.filter((b) => b.hasLimit).length} budget limits active`
                : "Automated classification active"}
            </span>
            <button
              type="button"
              onClick={() => setBudgetModalOpen(true)}
              className="text-[#6C3BFF] font-bold hover:underline cursor-pointer text-[10px] sm:text-[11px]"
            >
              Configure Limits →
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Feature Cards (Calendar & Debt/Lent) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calendar Card */}
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass border border-slate-200/80 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Monthly Cashflow Calendar</h4>
              <p className="text-xs text-slate-500">
                Daily transaction distribution, spikes, and multi-day selection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/calendar"
              className="btn-secondary h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open Calendar</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5228E0]" />
            </Link>
          </div>
        </div>

        {/* Debt & Lent Card */}
        <div className="p-4 sm:p-5 rounded-3xl liquid-glass border border-slate-200/80 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <HandCoins className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Debt & Lent Tracker</h4>
              <p className="text-xs text-slate-500">
                Money lent to friends, debts owed, interest rates, and installment checklists.
              </p>
            </div>
          </div>

          <Link
            href="/debt-lent"
            className="btn-secondary self-start h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Debt & Lent</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#5228E0]" />
          </Link>
        </div>
      </div>

      {/* Recent Activity List with Section Anchor */}
      <div id="recent-transactions-section">
        <RecentTransactions
          transactions={summary?.recentTransactions || []}
          monthName={summary?.activeMonthName}
        />
      </div>

      {/* CSV Import & Verification Modal */}
      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Category Budgets & Spending Limits Modal */}
      <CategoryBudgetModal
        isOpen={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        onUpdated={() => {
          loadData();
        }}
        year={
          selectedMonthKey
            ? parseInt(selectedMonthKey.split("-")[0], 10)
            : summary?.activeMonthKey
            ? parseInt(summary.activeMonthKey.split("-")[0], 10)
            : undefined
        }
        month={
          selectedMonthKey
            ? parseInt(selectedMonthKey.split("-")[1], 10)
            : summary?.activeMonthKey
            ? parseInt(summary.activeMonthKey.split("-")[1], 10)
            : undefined
        }
        monthName={summary?.activeMonthName}
        totalExpenses={summary?.totalExpensesThisMonth || 0}
      />
    </div>
  );
}
