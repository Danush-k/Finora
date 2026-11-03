"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  TrendingDown,
  PieChart as PieChartIcon,
  Layers,
  Calendar,
  Clock,
  Flame,
  Search,
  SlidersHorizontal,
  Download,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Filter,
  DollarSign,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { api } from "@/lib/api";
import { DashboardSummary, MonthlyChartData, Transaction } from "@/types";
import { getCategoryTheme } from "@/lib/category-theme";
import { categoryToSlug } from "@/lib/category-slugs";
import { formatCurrency, cn } from "@/lib/utils";

type SortOption = "highest" | "lowest" | "alpha" | "count";

interface CategoryRowData {
  category: string;
  slug: string;
  totalSpent: number;
  percentage: number;
  transactionCount: number;
}

export default function ExpenseAnalyticsView() {
  const router = useRouter();

  // Selected date range state
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedMonthName, setSelectedMonthName] = useState<string>("Current Period");

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("highest");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Load Data
  const loadData = async (yr: number, mo: number) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard summary for the selected period
      const summaryData = await api.getDashboardSummary(yr, mo);
      setSummary(summaryData);

      if (summaryData.activeMonthName) {
        setSelectedMonthName(summaryData.activeMonthName);
      }

      // Format start and end date for fetching transactions in the month
      const startStr = `${yr}-${String(mo).padStart(2, "0")}-01`;
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const endStr = `${yr}-${String(mo).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      // Fetch expense transactions in this month to calculate exact counts per category
      const txnsRes = await api.getTransactions({
        type: "EXPENSE",
        startDate: startStr,
        endDate: endStr,
        page: 0,
        size: 500,
      });

      setAllTransactions(txnsRes.content || []);
    } catch (err: any) {
      console.error("Failed to load expense analytics:", err);
      setError(err?.message || "Failed to load category analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  // Compute category metrics
  const categoryData = useMemo<CategoryRowData[]>(() => {
    if (!summary?.categoryBreakdown) return [];

    const breakdown = summary.categoryBreakdown;
    const totalExpenses = summary.totalExpensesThisMonth || 1;

    // Count transactions per category from fetched transactions
    const countsMap = new Map<string, number>();
    for (const t of allTransactions) {
      if (t.transactionType === "EXPENSE" && t.category) {
        const catKey = t.category.trim();
        countsMap.set(catKey, (countsMap.get(catKey) || 0) + 1);
      }
    }

    const rows: CategoryRowData[] = Object.entries(breakdown).map(([cat, amt]) => {
      const pct = (amt / totalExpenses) * 100;
      const count = countsMap.get(cat) || countsMap.get(cat.toUpperCase()) || 1;
      return {
        category: cat,
        slug: categoryToSlug(cat),
        totalSpent: amt,
        percentage: Math.round(pct * 10) / 10,
        transactionCount: count,
      };
    });

    return rows;
  }, [summary, allTransactions]);

  // Filtered & Sorted Category Data
  const processedCategories = useMemo(() => {
    let result = [...categoryData];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.category.toLowerCase().includes(q));
    }

    // Category pill filter
    if (selectedCategoryFilter !== "ALL") {
      result = result.filter((c) => c.category === selectedCategoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "highest") return b.totalSpent - a.totalSpent;
      if (sortBy === "lowest") return a.totalSpent - b.totalSpent;
      if (sortBy === "alpha") return a.category.localeCompare(b.category);
      if (sortBy === "count") return b.transactionCount - a.transactionCount;
      return 0;
    });

    return result;
  }, [categoryData, searchQuery, selectedCategoryFilter, sortBy]);

  // Summary Metrics
  const totalExpenses = summary?.totalExpensesThisMonth || 0;
  const activeCategoriesCount = categoryData.length;
  const highestCategory = useMemo(() => {
    if (categoryData.length === 0) return null;
    return [...categoryData].sort((a, b) => b.totalSpent - a.totalSpent)[0];
  }, [categoryData]);

  const daysInReportingMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const averageDailySpend = totalExpenses > 0 ? totalExpenses / daysInReportingMonth : 0;

  // Chart dataset for Donut Chart
  const chartData = useMemo(() => {
    return categoryData.map((c) => {
      const theme = getCategoryTheme(c.category);
      return {
        name: c.category,
        value: c.totalSpent,
        percentage: c.percentage,
        color: theme.hexColor,
        slug: c.slug,
      };
    });
  }, [categoryData]);

  // Export to CSV
  const handleExportCSV = () => {
    if (categoryData.length === 0) return;
    const header = "Category,Total Spent (INR),Percentage of Expenses,Transaction Count\n";
    const rows = categoryData
      .map(
        (c) =>
          `"${c.category}",${c.totalSpent.toFixed(2)},${c.percentage}%,${c.transactionCount}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finora-expense-categories-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-28 select-none">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & BREADCRUMB NAVIGATION                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {/* Back to Dashboard Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#6C3BFF] hover:text-[#5228E0] hover:underline mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-50 text-[#6C3BFF] border border-purple-100 shadow-2xs">
              <PieChartIcon className="w-6 h-6" />
            </span>
            <span>Expense Analytics</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Understand your spending patterns and manage your expenses effectively.
          </p>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {/* Month Stepper */}
          <div className="flex items-center bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-bold text-slate-900 whitespace-nowrap">
              {selectedMonthName} {selectedYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Reset Filter Button */}
          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            title="Reset to current month"
            className="btn-secondary h-9 px-3 rounded-2xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Current Month</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary h-9 px-3.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-purple-300"
          >
            <Download className="w-3.5 h-3.5 text-[#5228E0]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP SUMMARY METRIC CARDS (4 CARDS: 4x1 Desktop, 2x2 Mobile)            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Expenses */}
        <div className="rounded-3xl bg-white border border-rose-100/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Total Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-28 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                formatCurrency(totalExpenses)
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Across all categories this month
            </p>
          </div>
        </div>

        {/* Card 2: Total Active Categories */}
        <div className="rounded-3xl bg-white border border-indigo-100/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Total Categories</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-16 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                `${activeCategoriesCount} Active`
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Categories with recorded spend
            </p>
          </div>
        </div>

        {/* Card 3: Highest Spending Category */}
        <div className="rounded-3xl bg-white border border-purple-100/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Highest Category</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {loading ? (
                <div className="h-7 w-24 bg-slate-100 rounded-md animate-pulse" />
              ) : highestCategory ? (
                highestCategory.category
              ) : (
                "None"
              )}
            </div>
            <p className="text-[11px] text-purple-600 font-bold mt-0.5">
              {highestCategory
                ? `${formatCurrency(highestCategory.totalSpent)} (${highestCategory.percentage}%)`
                : "No expenses recorded"}
            </p>
          </div>
        </div>

        {/* Card 4: Average Daily Spending */}
        <div className="rounded-3xl bg-white border border-emerald-100/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Daily Average</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-20 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                formatCurrency(averageDailySpend)
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Over {daysInReportingMonth} calendar days
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL ANALYTICS: DONUT CHART + DISTRIBUTION PREVIEW                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Large Donut Chart (Left 1 Col / Mobile Top) */}
        <div className="lg:col-span-1 rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Expense Distribution
              </h3>
              <span className="text-[10px] font-bold text-[#6C3BFF] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                100% Breakdown
              </span>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="relative h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-2xl bg-slate-900/95 backdrop-blur-md text-white p-3 shadow-xl border border-white/10 text-xs select-none">
                              <p className="font-bold text-white mb-1 flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: data.color }}
                                />
                                {data.name}
                              </p>
                              <p className="text-slate-300 font-semibold">
                                Amount: <strong className="text-white">{formatCurrency(data.value)}</strong>
                              </p>
                              <p className="text-purple-300 font-bold mt-0.5">
                                Share: {data.percentage}% of expenses
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 italic">
                                Click to view transactions →
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={100}
                      paddingAngle={3}
                      cursor="pointer"
                      onClick={(entry: any) => {
                        if (entry?.slug) {
                          router.push(`/dashboard/expenses/categories/${entry.slug}`);
                        }
                      }}
                    >
                      {chartData.map((entry, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={entry.color}
                          stroke="#ffffff"
                          strokeWidth={2}
                          className="hover:opacity-85 transition-opacity"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge showing Total Expenses */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Spent
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight tabular-nums">
                    {formatCurrency(totalExpenses)}
                  </span>
                  <span className="text-[9px] text-purple-600 font-bold mt-0.5">
                    {activeCategoriesCount} Categories
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                <PieChartIcon className="w-8 h-8 text-slate-300 mb-2" />
                <span>No expense data recorded.</span>
              </div>
            )}
          </div>

          {/* Quick Legend Chips */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            {chartData.slice(0, 5).map((item) => (
              <Link
                key={item.name}
                href={`/dashboard/expenses/categories/${item.slug}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 hover:bg-purple-50 text-[11px] font-bold text-slate-700 hover:text-purple-700 transition-colors cursor-pointer border border-slate-100"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
                <span className="text-slate-400 font-normal">({item.percentage}%)</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Filter Toolbar & Category Breakdown (Right 2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Expense Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  See how your spending is distributed across different categories.
                </p>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <span className="text-xs font-semibold text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
                >
                  <option value="highest">Highest Spending</option>
                  <option value="lowest">Lowest Spending</option>
                  <option value="alpha">Alphabetical (A-Z)</option>
                  <option value="count">Transaction Count</option>
                </select>
              </div>
            </div>

            {/* Filter Search Input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search expense category (e.g. Shopping, Food & Dining, Transfer)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Category Rows Table / List */}
            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : processedCategories.length > 0 ? (
              <div className="divide-y divide-slate-100 overflow-hidden">
                {processedCategories.map((item) => {
                  const theme = getCategoryTheme(item.category);
                  const CategoryIcon = theme.icon;

                  return (
                    <Link
                      key={item.category}
                      href={`/dashboard/expenses/categories/${item.slug}`}
                      className="py-3 px-2 rounded-2xl hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4 group cursor-pointer"
                    >
                      {/* Left: Icon & Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50 shadow-2xs group-hover:scale-105 transition-transform",
                            theme.bgLight,
                            theme.iconClass
                          )}
                        >
                          <CategoryIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#6C3BFF] transition-colors truncate">
                            {item.category}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {item.transactionCount} {item.transactionCount === 1 ? "transaction" : "transactions"}
                          </p>
                        </div>
                      </div>

                      {/* Center: Progress Bar (Desktop only) */}
                      <div className="hidden sm:flex flex-1 max-w-xs items-center gap-3">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500 bg-gradient-to-r", theme.gradient)}
                            style={{ width: `${Math.max(5, item.percentage)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500 w-12 text-right">
                          {item.percentage}%
                        </span>
                      </div>

                      {/* Right: Amount & Arrow */}
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <p className="text-xs sm:text-sm font-black text-slate-900 tabular-nums">
                            {formatCurrency(item.totalSpent)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold sm:hidden">
                            {item.percentage}% of expenses
                          </p>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-purple-100/70 group-hover:text-[#6C3BFF] flex items-center justify-center transition-colors">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#6C3BFF] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                <p className="font-bold text-slate-600 mb-1">No expenses found</p>
                <p>Try clearing your search query or selecting a different month.</p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-3 px-3 py-1.5 rounded-xl bg-purple-50 text-[#6C3BFF] text-xs font-bold hover:bg-purple-100 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Card Navigation Guidance */}
          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Click any category row to inspect full transaction history &amp; trends.</span>
            <span className="text-[#6C3BFF] font-bold">
              Showing {processedCategories.length} of {categoryData.length} categories
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
