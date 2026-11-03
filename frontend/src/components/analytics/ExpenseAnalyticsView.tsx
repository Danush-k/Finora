"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  X,
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
import { categoryToSlug, matchesCategory } from "@/lib/category-slugs";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

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
  const searchParams = useSearchParams();

  const qYear = searchParams.get("year");
  const qMonth = searchParams.get("month");

  // Selected date range state - defaults to Nov 2026 or URL params
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (qYear) return parseInt(qYear, 10);
    const cached = api.getCachedDashboardSummary();
    if (cached?.activeMonthKey) return parseInt(cached.activeMonthKey.split("-")[0], 10);
    return 2026;
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (qMonth) return parseInt(qMonth, 10);
    const cached = api.getCachedDashboardSummary();
    if (cached?.activeMonthKey) return parseInt(cached.activeMonthKey.split("-")[1], 10);
    return 11;
  });

  const [selectedMonthName, setSelectedMonthName] = useState<string>("November 2026");

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Category selection & Filter states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("highest");
  const [txnSearch, setTxnSearch] = useState<string>("");
  const [txnSort, setTxnSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

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

      // Format ISO Instant date parameters for Spring Boot
      const startStr = `${yr}-${String(mo).padStart(2, "0")}-01T00:00:00Z`;
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const endStr = `${yr}-${String(mo).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}T23:59:59Z`;

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
    setCurrentPage(1);
    setSelectedCategory(null);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
    setCurrentPage(1);
    setSelectedCategory(null);
  };

  const handleResetToCurrentMonth = () => {
    const cached = api.getCachedDashboardSummary();
    if (cached?.activeMonthKey) {
      setSelectedYear(parseInt(cached.activeMonthKey.split("-")[0], 10));
      setSelectedMonth(parseInt(cached.activeMonthKey.split("-")[1], 10));
    } else {
      setSelectedYear(2026);
      setSelectedMonth(11);
    }
    setCurrentPage(1);
    setSelectedCategory(null);
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
      let count = countsMap.get(cat) || countsMap.get(cat.toUpperCase());
      if (count === undefined) {
        count = allTransactions.filter((t) => matchesCategory(t.category, cat)).length || 1;
      }
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

    // Sort
    result.sort((a, b) => {
      if (sortBy === "highest") return b.totalSpent - a.totalSpent;
      if (sortBy === "lowest") return a.totalSpent - b.totalSpent;
      if (sortBy === "alpha") return a.category.localeCompare(b.category);
      if (sortBy === "count") return b.transactionCount - a.transactionCount;
      return 0;
    });

    return result;
  }, [categoryData, searchQuery, sortBy]);

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

  // Filtered transactions for the dedicated bottom breakdown
  const categoryTransactions = useMemo(() => {
    let list = [...allTransactions];
    if (selectedCategory) {
      list = list.filter((t) => matchesCategory(t.category, selectedCategory));
    }
    if (txnSearch.trim()) {
      const q = txnSearch.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.merchant && t.merchant.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.accountNumber && t.accountNumber.toLowerCase().includes(q)) ||
          (t.bank && t.bank.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (txnSort === "date-desc") return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      if (txnSort === "date-asc") return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      if (txnSort === "amount-desc") return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      if (txnSort === "amount-asc") return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      return 0;
    });
    return list;
  }, [allTransactions, selectedCategory, txnSearch, txnSort]);

  const totalTxnPages = Math.max(1, Math.ceil(categoryTransactions.length / itemsPerPage));
  const paginatedCategoryTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return categoryTransactions.slice(start, start + itemsPerPage);
  }, [categoryTransactions, currentPage, itemsPerPage]);

  // Export to CSV
  const handleExportCSV = () => {
    if (categoryData.length === 0) return;
    const header = "Category,Total Spent (INR),Percentage of Expenses,Transaction Count\n";
    const rows = categoryData
      .map(
        (c) =>
          `"${c.category}",${c.totalSpent},${c.percentage}%,${c.transactionCount}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finora-expense-analytics-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-28 select-none">
      {/* ========================================================================= */}
      {/* 1. HEADER & GLOBAL CONTROLS                                               */}
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

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Expense Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Understand where your money goes and manage category allocations.
          </p>
        </div>

        {/* Date Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
          {/* Month Selector Stepper */}
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
              {selectedMonthName}
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
            title="Reset to Active Period"
            className="btn-secondary h-9 px-3 rounded-2xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3 h-3 text-[#5228E0]" />
            <span className="hidden sm:inline">Active</span>
          </button>

          {/* Export Report Button */}
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
      {/* 2. TOP SUMMARY SECTION (4 KEY METRIC CARDS)                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Expenses */}
        <div className="rounded-3xl bg-white border border-purple-100/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Total Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-24 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                formatCurrency(totalExpenses)
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Outflow in {selectedMonthName}
            </p>
          </div>
        </div>

        {/* Card 2: Total Active Categories */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Active Categories</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-16 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                `${activeCategoriesCount} Categories`
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              With recorded expenses
            </p>
          </div>
        </div>

        {/* Card 3: Highest Spending Category */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Highest Category</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              {loading ? (
                <div className="h-7 w-28 bg-slate-100 rounded-md animate-pulse" />
              ) : highestCategory ? (
                highestCategory.category
              ) : (
                "None"
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {highestCategory
                ? `${formatCurrency(highestCategory.totalSpent)} (${highestCategory.percentage}%)`
                : "No data"}
            </p>
          </div>
        </div>

        {/* Card 4: Average Daily Spending */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Daily Average</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
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
              Across {daysInReportingMonth} calendar days
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL DISTRIBUTION (DONUT CHART) + CATEGORY BREAKDOWN LIST             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Interactive Donut Chart (Left 1 Col) */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Distribution
              </h3>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-[11px] font-bold text-[#6C3BFF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Filter</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Click any slice to filter transactions below.
            </p>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-purple-100 border-t-[#6C3BFF] animate-spin" />
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
                            <div className="rounded-2xl bg-slate-900/95 backdrop-blur-md text-white p-3 text-xs shadow-xl border border-white/10 select-none">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                <span className="font-extrabold text-white">{data.name}</span>
                              </div>
                              <p className="text-emerald-400 font-extrabold text-sm tabular-nums">
                                {formatCurrency(data.value)}
                              </p>
                              <p className="text-purple-300 font-bold mt-0.5">
                                Share: {data.percentage}% of expenses
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 italic">
                                Click to filter below →
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
                        if (entry?.name) {
                          setSelectedCategory((prev) => (prev === entry.name ? null : entry.name));
                          setCurrentPage(1);
                        }
                      }}
                    >
                      {chartData.map((entry, idx) => {
                        const isSelected = selectedCategory === entry.name;
                        const hasSelection = Boolean(selectedCategory);
                        return (
                          <Cell
                            key={`cell-${idx}`}
                            fill={entry.color}
                            stroke={isSelected ? "#230348" : "#ffffff"}
                            strokeWidth={isSelected ? 3 : 2}
                            opacity={hasSelection && !isSelected ? 0.35 : 1}
                            className="transition-all duration-200"
                          />
                        );
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge showing Total Expenses */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedCategory ? "Selected Category" : "Total Outflow"}
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight tabular-nums truncate max-w-[150px]">
                    {selectedCategory
                      ? formatCurrency(chartData.find((c) => c.name === selectedCategory)?.value || 0)
                      : formatCurrency(totalExpenses)}
                  </span>
                  <span className="text-[9px] text-[#6C3BFF] font-bold mt-0.5">
                    {selectedCategory || `${activeCategoriesCount} Categories`}
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
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
            {chartData.slice(0, 6).map((item) => {
              const isSelected = selectedCategory === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory((prev) => (prev === item.name ? null : item.name));
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border",
                    isSelected
                      ? "bg-[#6C3BFF] text-white border-[#5228E0] shadow-xs"
                      : "bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border-slate-100"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? "#ffffff" : item.color }}
                  />
                  <span>{item.name}</span>
                  <span className={isSelected ? "text-purple-200" : "text-slate-400 font-normal"}>
                    ({item.percentage}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Toolbar & Category Breakdown (Right 2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Expense Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any category to filter and view its transactions below.
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
            <div className="relative mb-3">
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
                  const isSelected = selectedCategory === item.category;

                  return (
                    <div
                      key={item.category}
                      onClick={() => {
                        setSelectedCategory((prev) => (prev === item.category ? null : item.category));
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "py-3 px-3 rounded-2xl transition-all flex items-center justify-between gap-4 cursor-pointer",
                        isSelected
                          ? "bg-purple-50/90 border border-purple-200/90 shadow-2xs"
                          : "hover:bg-slate-50/80 border border-transparent"
                      )}
                    >
                      {/* Left: Icon & Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-slate-200/50 shadow-2xs transition-transform",
                            theme.bgLight,
                            theme.iconClass
                          )}
                        >
                          <CategoryIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-xs sm:text-sm font-extrabold transition-colors truncate",
                              isSelected ? "text-[#6C3BFF]" : "text-slate-900"
                            )}
                          >
                            {item.category}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {item.transactionCount}{" "}
                            {item.transactionCount === 1 ? "transaction" : "transactions"}
                          </p>
                        </div>
                      </div>

                      {/* Center: Progress Bar (Desktop only) */}
                      <div className="hidden sm:flex flex-1 max-w-xs items-center gap-3">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
                              theme.gradient
                            )}
                            style={{ width: `${Math.max(5, item.percentage)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500 w-12 text-right">
                          {item.percentage}%
                        </span>
                      </div>

                      {/* Right: Amount & Deep-dive link */}
                      <div className="text-right shrink-0 flex items-center gap-2.5">
                        <div>
                          <p className="text-xs sm:text-sm font-black text-slate-900 tabular-nums">
                            {formatCurrency(item.totalSpent)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold sm:hidden">
                            {item.percentage}% of expenses
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/expenses/categories/${item.slug}?year=${selectedYear}&month=${selectedMonth}`}
                          title={`Open ${item.category} full details page`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-[#6C3BFF] hover:text-white flex items-center justify-center text-slate-400 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                <p className="font-bold text-slate-600 mb-1">No expenses found</p>
                <p>Try clearing your search query or selecting a different month.</p>
              </div>
            )}
          </div>

          {/* Footer Card Navigation Guidance */}
          <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {selectedCategory
                ? `Showing transactions filtered for ${selectedCategory}`
                : "Click any category above to filter the transaction list below."}
            </span>
            <span className="text-[#6C3BFF] font-bold">
              {processedCategories.length} Categories
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DEDICATED TRANSACTION DETAILS (SYNCHRONIZED WITH SELECTED CATEGORY)      */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {selectedCategory
                  ? `Transactions in ${selectedCategory}`
                  : `All Recorded Expenses (${selectedMonthName})`}
              </h3>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="px-2 py-0.5 rounded-lg bg-purple-50 text-[#6C3BFF] text-[11px] font-bold border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Filter</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {categoryTransactions.length} recorded entries
              {selectedCategory && (
                <Link
                  href={`/dashboard/expenses/categories/${categoryToSlug(selectedCategory)}?year=${selectedYear}&month=${selectedMonth}`}
                  className="ml-2 font-bold text-[#6C3BFF] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Deep-Dive Page</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search merchant, description, account..."
                value={txnSearch}
                onChange={(e) => {
                  setTxnSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 transition-colors"
              />
            </div>

            <select
              value={txnSort}
              onChange={(e) => setTxnSort(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Transactions Table / Cards */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : paginatedCategoryTransactions.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCategoryTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-3 text-slate-500 font-semibold whitespace-nowrap">
                        {formatDate(t.transactionDate)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 group-hover:text-[#6C3BFF] transition-colors truncate max-w-xs">
                          {t.merchant || t.description || "Expense Transaction"}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {t.category || "Other"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold">
                          {t.paymentMethod || "UPI"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium truncate max-w-[120px]">
                        {t.bank || t.accountNumber || "HDFC Bank"}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-rose-600 tabular-nums">
                        -{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {paginatedCategoryTransactions.map((t) => (
                <div key={t.id} className="py-3 px-1 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {t.merchant || t.description || "Expense Transaction"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(t.transactionDate)} • {t.category || "Expense"} • {t.paymentMethod || "UPI"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-rose-600 text-xs tabular-nums block">
                      -{formatCurrency(t.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[90px] block">
                      {t.bank || t.accountNumber || "HDFC Bank"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalTxnPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-medium text-[11px]">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, categoryTransactions.length)} of{" "}
                  {categoryTransactions.length}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2 text-xs font-bold text-slate-700">
                    Page {currentPage} of {totalTxnPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalTxnPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalTxnPages, p + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">
              No transactions found in this category for the selected period.
            </p>
            <p className="text-slate-400 mt-1">
              Try selecting a different category or switching the month filter above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}