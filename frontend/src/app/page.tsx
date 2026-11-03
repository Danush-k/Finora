"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardSummary, MonthlyChartData, MonthlyChartPoint, Transaction } from "@/types";
import MetricCard from "@/components/dashboard/MetricCard";
import HorizontalMetricsBar from "@/components/dashboard/HorizontalMetricsBar";
import ExpenseChart, { ChartPeriod, ChartPeriodStats } from "@/components/dashboard/ExpenseChart";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import DesktopExpenseByCategory from "@/components/dashboard/DesktopExpenseByCategory";
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
  ChevronRight,
} from "lucide-react";
import CsvImportModal from "@/components/transactions/CsvImportModal";
import CategoryBudgetModal from "@/components/dashboard/CategoryBudgetModal";
import TransactionModal from "@/components/transactions/TransactionModal";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { CategoryBudgetStatus, OverallBudgetInfo } from "@/types";
import {
  HorizontalMetricsBarSkeleton,
  ChartSkeleton,
  CategoryBreakdownSkeleton,
  RecentTransactionsSkeleton,
  TopProgressBar,
} from "@/components/common/LoadingSkeletons";
import { getCategoryTheme } from "@/lib/category-theme";
import MobileDashboard from "@/components/mobile/MobileDashboard";
import { categoryToSlug } from "@/lib/category-slugs";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(() => api.getCachedDashboardSummary() || null);
  const [monthlyChart, setMonthlyChart] = useState<MonthlyChartData | null>(() => api.getCachedMonthlyChart() || null);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetStatus[]>(() => api.getCachedBudgetSummary()?.categories || []);
  const [overallBudget, setOverallBudget] = useState<OverallBudgetInfo | null>(() => api.getCachedBudgetSummary()?.overallBudget || null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("modal") === "budget";
    }
    return false;
  });
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedMonthName, setSelectedMonthName] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(() => !api.getCachedDashboardSummary());
  const [loadingChart, setLoadingChart] = useState(() => !api.getCachedMonthlyChart());
  const [isFiltering, setIsFiltering] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  // Period toggle: MONTHLY | WEEKLY | YEARLY
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("MONTHLY");

  // Remember previous month state when switching between toggles
  const [previousMonthPoint, setPreviousMonthPoint] = useState<MonthlyChartPoint | null>(null);

  // Live stats computed based on the active toggle (Monthly, Weekly, Yearly)
  const [activeToggleStats, setActiveToggleStats] = useState<ChartPeriodStats | null>(null);

  // Category selection for desktop interactive filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [activeYear, setActiveYear] = useState<number>(2026);
  const [activeMonth, setActiveMonth] = useState<number>(11);

  // Category Expand state: keep standard 4 items, allow expanding if more
  const [showAllCategories, setShowAllCategories] = useState(false);

  const loadData = async (year?: number, month?: number, monthKey?: string) => {
    if (year && month) {
      setIsFiltering(true);
    } else {
      if (!summary) setLoadingSummary(true);
      if (!monthlyChart) setLoadingChart(true);
    }

    const targetYear = year || (selectedMonthKey ? parseInt(selectedMonthKey.split("-")[0], 10) : 2026);
    const targetMonth = month || (selectedMonthKey ? parseInt(selectedMonthKey.split("-")[1], 10) : 11);
    setActiveYear(targetYear);
    setActiveMonth(targetMonth);

    // Fetch month transactions for interactive category filtering & table
    const startStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const endStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const txPromise = api
      .getTransactions({
        startDate: startStr,
        endDate: endStr,
        size: 500,
      })
      .then((res) => {
        if (res && res.content) {
          setMonthTransactions(res.content);
        }
      })
      .catch((err) => {
        console.error("Failed to load month transactions", err);
      });

    // 1. Progressive fetch: Dashboard Summary (metrics, category breakdown, recent activity)
    const summaryPromise = api
      .getDashboardSummary(year, month)
      .then((sum) => {
        setSummary(sum);
        if (monthKey) {
          setSelectedMonthKey(monthKey);
          setSelectedMonthName(sum.activeMonthName || monthKey);
        } else if (sum.activeMonthKey) {
          setSelectedMonthKey(sum.activeMonthKey);
          setSelectedMonthName(sum.activeMonthName || sum.activeMonthKey);
        }
      })
      .catch((e) => {
        console.error("Failed to load dashboard summary", e);
      })
      .finally(() => {
        setLoadingSummary(false);
      });

    // 2. Progressive fetch: Monthly Inflow vs Outflow Chart
    const chartPromise = api
      .getMonthlyChart()
      .then((chart) => {
        setMonthlyChart(chart);
      })
      .catch((e) => {
        console.error("Failed to load monthly chart", e);
      })
      .finally(() => {
        setLoadingChart(false);
      });

    // 3. Progressive fetch: Budget limits & summary
    const budgetPromise = api
      .getBudgetSummary(year, month)
      .then((budgetRes) => {
        if (budgetRes) {
          setCategoryBudgets(budgetRes.categories || []);
          setOverallBudget(budgetRes.overallBudget || null);
        } else {
          setCategoryBudgets([]);
          setOverallBudget(null);
        }
      })
      .catch(() => {
        setCategoryBudgets([]);
        setOverallBudget(null);
      });

    try {
      await Promise.allSettled([summaryPromise, chartPromise, budgetPromise, txPromise]);
    } finally {
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

  // Compute category breakdown entries
  const categoryEntries = summary?.categoryBreakdown
    ? Object.entries(summary.categoryBreakdown).sort((a, b) => b[1] - a[1])
    : [];
  const totalCategoryExpenses = summary?.totalExpensesThisMonth || 1;
  const visibleCategories = showAllCategories ? categoryEntries : categoryEntries.slice(0, 4);

  return (
    <>
      {/* Top Hairline Progress Bar during Background Refreshes & Filtering */}
      {isFiltering && <TopProgressBar />}

      {/* ========================================================= */}
      {/* 1. DEDICATED MOBILE DASHBOARD (< md)                      */}
      {/* ========================================================= */}
      <MobileDashboard
        summary={summary}
        monthlyChart={monthlyChart}
        categoryBudgets={categoryBudgets}
        overallBudget={overallBudget}
        selectedMonthKey={selectedMonthKey}
        selectedMonthName={selectedMonthName}
        chartPeriod={chartPeriod}
        onPeriodChange={handlePeriodChange}
        onPeriodStatsChange={setActiveToggleStats}
        onSelectMonth={handleSelectMonth}
        onResetMonth={handleResetMonth}
        onOpenBudgetModal={() => setBudgetModalOpen(true)}
        onOpenCsvModal={() => setCsvModalOpen(true)}
        onOpenTransactionModal={() => setTransactionModalOpen(true)}
        onDeleteTransaction={async (id) => {
          try {
            await api.deleteTransaction(id);
            loadData();
          } catch (e) {
            console.error("Failed to delete transaction", e);
          }
        }}
      />

      {/* ========================================================= */}
      {/* 2. DESKTOP DASHBOARD (md+) - 100% UNTOUCHED AND PRESERVED */}
      {/* ========================================================= */}
      <div className="hidden md:block space-y-5 sm:space-y-6 pb-32 sm:pb-24">

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

        {/* Compact, refined action buttons (Responsive 3-col grid on mobile, flex on desktop) */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="btn-secondary h-8.5 sm:h-9 px-2 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#5228E0] shrink-0" />
            <span>Import CSV</span>
          </button>
          <Link
            href="/calendar"
            className="btn-secondary h-8.5 sm:h-9 px-2 sm:px-3.5 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5 text-[#5228E0] shrink-0" />
            <span>Calendar</span>
          </Link>
          <Link
            href="/transactions?action=new"
            className="btn-primary h-8.5 sm:h-9 px-2.5 sm:px-4 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="text-white font-semibold">New Entry</span>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. STATS OVERVIEW: HORIZONTAL FINANCIAL SUMMARY RIBBON     */}
      {/* ========================================================= */}
      <div
        className={`transition-opacity duration-300 ${
          isFiltering ? "opacity-60" : "opacity-100"
        }`}
      >
        {summary ? (
          <HorizontalMetricsBar
            totalExpenses={activeToggleStats ? activeToggleStats.expenses : summary.totalExpensesThisMonth || 0}
            totalIncome={activeToggleStats ? activeToggleStats.income : summary.totalIncomeThisMonth || 0}
            netSavings={activeToggleStats ? activeToggleStats.savings : summary.netSavingsThisMonth || 0}
            totalRecords={
              chartPeriod === "YEARLY" && activeToggleStats?.count !== undefined
                ? activeToggleStats.count
                : summary.totalTransactionsCount || 0
            }
            expensesTitle={
              chartPeriod === "YEARLY"
                ? "Annual Expenses"
                : chartPeriod === "WEEKLY"
                ? "Weekly Expenses"
                : "Total Expenses"
            }
            incomeTitle={
              chartPeriod === "YEARLY"
                ? "Annual Income"
                : chartPeriod === "WEEKLY"
                ? "Weekly Income"
                : "Total Income"
            }
            recordsTitle={chartPeriod === "YEARLY" ? "Annual Records" : "Total Records"}
          />
        ) : (
          <HorizontalMetricsBarSkeleton />
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. CHART & CATEGORY BREAKDOWN GRID                        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Chart Column (2 Cols) */}
        <div className="lg:col-span-2">
          {monthlyChart ? (
            <ExpenseChart
              data={monthlyChart.points || []}
              activeMonthKey={selectedMonthKey}
              activeMonthName={selectedMonthName}
              period={chartPeriod}
              onPeriodChange={handlePeriodChange}
              onPeriodStatsChange={setActiveToggleStats}
              onSelectMonth={handleSelectMonth}
              onResetMonth={handleResetMonth}
            />
          ) : (
            <ChartSkeleton />
          )}
        </div>

        {/* ========================================================= */}
        {/* CATEGORY BREAKDOWN CARD: Interactive Donut + Category Analytics */}
        {/* ========================================================= */}
        {summary ? (
          <DesktopExpenseByCategory
            categoryBreakdown={summary.categoryBreakdown}
            totalExpenses={summary.totalExpensesThisMonth || 0}
            activeMonthName={selectedMonthName || summary.activeMonthName}
            activeYear={activeYear}
            activeMonth={activeMonth}
            categoryBudgets={categoryBudgets}
            overallBudget={overallBudget}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory((prev) => (prev === cat ? null : cat));
              if (cat) {
                const el = document.getElementById("recent-transactions-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            onOpenBudgetModal={() => setBudgetModalOpen(true)}
            transactions={monthTransactions}
          />
        ) : (
          <CategoryBreakdownSkeleton />
        )}
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
              <h4 className="text-sm font-bold text-slate-900">Cashflow Calendar</h4>
              <p className="text-xs text-slate-500">
                Daily distribution & multi-day overview
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
                Lent balances, debts & installment schedules
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

      {/* Recent Activity List with Section Anchor & Category Filtering */}
      <div id="recent-transactions-section">
        {summary ? (
          <RecentTransactions
            transactions={monthTransactions.length > 0 ? monthTransactions : (summary.recentTransactions || [])}
            monthName={selectedMonthName || summary.activeMonthName}
            selectedCategory={selectedCategory}
            onClearCategory={() => setSelectedCategory(null)}
            activeYear={activeYear}
            activeMonth={activeMonth}
          />
        ) : (
          <RecentTransactionsSkeleton />
        )}
      </div>
    </div>

    {/* CSV Import & Verification Modal */}
    <CsvImportModal
      isOpen={csvModalOpen}
      onClose={() => setCsvModalOpen(false)}
      onSuccess={() => {
        loadData();
      }}
    />

    {/* Add / Edit Transaction Modal */}
    <TransactionModal
      isOpen={transactionModalOpen}
      onClose={() => setTransactionModalOpen(false)}
      onSubmit={async (data) => {
        try {
          await api.createTransaction(data);
          await loadData();
        } catch (e) {
          console.error("Failed to create transaction", e);
          throw e;
        }
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
  </>
);
}
