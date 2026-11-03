"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Building,
  TrendingDown,
  Layers,
  Search,
  ArrowUpDown,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sliders,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { api } from "@/lib/api";
import { Transaction, DashboardSummary } from "@/types";
import { getCategoryTheme } from "@/lib/category-theme";
import { slugToCategory, categoryToSlug, matchesCategory } from "@/lib/category-slugs";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import TransactionModal from "@/components/transactions/TransactionModal";

interface CategoryDetailViewProps {
  categorySlug: string;
}

export default function CategoryDetailView({ categorySlug }: CategoryDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL search params if provided, else fallback to cached summary (Nov 2026)
  const qYear = searchParams.get("year");
  const qMonth = searchParams.get("month");

  // Selected date range state
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

  const [selectedMonthName, setSelectedMonthName] = useState<string>("November");

  // Category name from slug
  const categoryName = useMemo(() => {
    return slugToCategory(categorySlug);
  }, [categorySlug]);

  const theme = useMemo(() => {
    return getCategoryTheme(categoryName);
  }, [categoryName]);

  const CategoryIcon = theme.icon;

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Load Transactions for this category in the selected month
  const loadCategoryTransactions = async (yr: number, mo: number, cat: string) => {
    try {
      setLoading(true);
      setError(null);

      // Format ISO DATE_TIME Instant parameters (e.g. 2026-11-01T00:00:00Z)
      const startStr = `${yr}-${String(mo).padStart(2, "0")}-01T00:00:00Z`;
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const endStr = `${yr}-${String(mo).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}T23:59:59Z`;

      // Set month name
      const dateObj = new Date(yr, mo - 1, 1);
      setSelectedMonthName(dateObj.toLocaleString("en-US", { month: "long" }));

      // 1. Fetch filtered transactions directly from backend
      const res = await api.getTransactions({
        type: "EXPENSE",
        category: cat === "ALL" ? undefined : cat,
        startDate: startStr,
        endDate: endStr,
        page: 0,
        size: 500,
      });

      let items = res?.content || [];

      // 2. Resilient fallback matching across aliases and case differences
      if (items.length === 0 && cat !== "ALL") {
        const allRes = await api.getTransactions({
          type: "EXPENSE",
          startDate: startStr,
          endDate: endStr,
          page: 0,
          size: 500,
        });
        items = (allRes?.content || []).filter((t) => matchesCategory(t.category, cat));
      }

      setTransactions(items);
    } catch (err: any) {
      console.error("Failed to load category transactions:", err);
      // Fallback query without category filter then match client-side
      try {
        const startStr = `${yr}-${String(mo).padStart(2, "0")}-01T00:00:00Z`;
        const daysInMonth = new Date(yr, mo, 0).getDate();
        const endStr = `${yr}-${String(mo).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}T23:59:59Z`;
        const allRes = await api.getTransactions({
          type: "EXPENSE",
          startDate: startStr,
          endDate: endStr,
          page: 0,
          size: 500,
        });
        const items = (allRes?.content || []).filter((t) => matchesCategory(t.category, cat));
        setTransactions(items);
        setError(null);
      } catch (fallbackErr: any) {
        setError(err?.message || "Failed to load transactions.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryTransactions(selectedYear, selectedMonth, categoryName);
  }, [selectedYear, selectedMonth, categoryName]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
    setCurrentPage(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
    setCurrentPage(1);
  };

  // Filtered & Sorted Transactions
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          (t.merchant && t.merchant.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.accountNumber && t.accountNumber.toLowerCase().includes(q)) ||
          (t.bank && t.bank.toLowerCase().includes(q)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortField === "date") {
        const timeA = new Date(a.transactionDate).getTime();
        const timeB = new Date(b.transactionDate).getTime();
        return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
      } else {
        const amtA = Number(a.amount) || 0;
        const amtB = Number(b.amount) || 0;
        return sortOrder === "desc" ? amtB - amtA : amtA - amtB;
      }
    });

    return result;
  }, [transactions, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedTransactions.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedTransactions.slice(start, start + itemsPerPage);
  }, [processedTransactions, currentPage, itemsPerPage]);

  // Summary Metrics for this category
  const totalSpent = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const transactionCount = transactions.length;

  const averageTransaction = useMemo(() => {
    return transactionCount > 0 ? totalSpent / transactionCount : 0;
  }, [totalSpent, transactionCount]);

  const highestTransaction = useMemo(() => {
    if (transactions.length === 0) return 0;
    return Math.max(...transactions.map((t) => Number(t.amount) || 0));
  }, [transactions]);

  // Spending Trend by Week
  const trendData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const weeks = [
      { label: "W1", name: "Week 1 (1–7)", total: 0 },
      { label: "W2", name: "Week 2 (8–14)", total: 0 },
      { label: "W3", name: "Week 3 (15–21)", total: 0 },
      { label: "W4", name: "Week 4 (22–28)", total: 0 },
      { label: "W5", name: "Week 5 (29–end)", total: 0 },
    ];

    for (const t of transactions) {
      const day = new Date(t.transactionDate).getDate();
      const amt = Number(t.amount) || 0;
      if (day <= 7) weeks[0].total += amt;
      else if (day <= 14) weeks[1].total += amt;
      else if (day <= 21) weeks[2].total += amt;
      else if (day <= 28) weeks[3].total += amt;
      else weeks[4].total += amt;
    }

    return weeks;
  }, [transactions, selectedYear, selectedMonth]);

  // CSV Export for this category
  const handleExportCategoryCSV = () => {
    if (transactions.length === 0) return;
    const header = "Date,Merchant,Description,Category,Payment Method,Account,Amount (INR)\n";
    const rows = transactions
      .map(
        (t) =>
          `"${t.transactionDate}","${(t.merchant || "").replace(/"/g, '""')}","${(t.description || "").replace(/"/g, '""')}","${t.category}","${t.paymentMethod || ""}","${t.bank || t.accountNumber || ""}",${t.amount}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finora-${categorySlug}-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-28 select-none">
      {/* ========================================================================= */}
      {/* 1. HEADER & BREADCRUMB NAVIGATION                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {/* Back to Analytics Button */}
          <Link
            href={`/dashboard/expenses/categories?year=${selectedYear}&month=${selectedMonth}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#6C3BFF] hover:text-[#5228E0] hover:underline mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Expense Analytics</span>
          </Link>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/50 shadow-xs",
                theme.bgLight,
                theme.iconClass
              )}
            >
              <CategoryIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {categoryName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Detailed transaction breakdown and spending trend for {selectedMonthName} {selectedYear}
              </p>
            </div>
          </div>
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

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCategoryCSV}
            className="btn-secondary h-9 px-3.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-purple-300"
          >
            <Download className="w-3.5 h-3.5 text-[#5228E0]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Category Quick Navigation Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 shrink-0">Switch Category:</span>
        {CATEGORIES.slice(0, 9).map((cat) => {
          const slug = categoryToSlug(cat);
          const isCurrent = slug === categorySlug;
          const catTheme = getCategoryTheme(cat);
          return (
            <Link
              key={cat}
              href={`/dashboard/expenses/categories/${slug}?year=${selectedYear}&month=${selectedMonth}`}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs border",
                isCurrent
                  ? "bg-[#6C3BFF] text-white border-[#5228E0] shadow-xs"
                  : "bg-white text-slate-700 hover:bg-purple-50 hover:text-[#6C3BFF] border-slate-200/80"
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isCurrent ? "#ffffff" : catTheme.hexColor }}
              />
              <span>{cat}</span>
            </Link>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY METRIC CARDS (4 CARDS: 4x1 Desktop, 2x2 Mobile)                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Spent */}
        <div className="rounded-3xl bg-white border border-purple-100/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Total Spent</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-24 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                formatCurrency(totalSpent)
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Spent in {selectedMonthName}
            </p>
          </div>
        </div>

        {/* Card 2: Transaction Count */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Transactions</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-16 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                `${transactionCount} Txns`
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Recorded bank activities
            </p>
          </div>
        </div>

        {/* Card 3: Average Transaction */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Average Spend</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-20 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                formatCurrency(averageTransaction)
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Per recorded expense
            </p>
          </div>
        </div>

        {/* Card 4: Highest Transaction */}
        <div className="rounded-3xl bg-white border border-rose-100/80 p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Highest Entry</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {loading ? (
                <div className="h-7 w-20 bg-slate-100 rounded-md animate-pulse" />
              ) : (
                formatCurrency(highestTransaction)
              )}
            </div>
            <p className="text-[11px] text-rose-600 font-bold mt-0.5">
              Single largest outflow
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SPENDING TREND CHART                                                   */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Weekly Spending Trend
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cash outflow distribution for {categoryName} across 5 calendar weeks
            </p>
          </div>
          <span className="text-xs font-bold text-[#6C3BFF] bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-100">
            {formatCurrency(totalSpent)} Total
          </span>
        </div>

        <div className="h-44 sm:h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.7)" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl bg-slate-900/95 text-white p-2.5 text-xs shadow-xl border border-white/10 select-none">
                        <p className="font-bold text-white">{d.name}</p>
                        <p className="text-emerald-400 font-bold mt-0.5">
                          Amount: {formatCurrency(d.total)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={38}>
                {trendData.map((entry, idx) => (
                  <Cell
                    key={`bar-${idx}`}
                    fill={theme.hexColor}
                    opacity={entry.total > 0 ? 0.95 : 0.25}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TRANSACTION TABLE / LIST                                               */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Transactions in {categoryName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {processedTransactions.length} recorded entries
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search description, account..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5">
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [
                    "date" | "amount",
                    "asc" | "desc"
                  ];
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table (Desktop) / Cards (Mobile) */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : paginatedTransactions.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTransactions.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => {
                        setEditingTxn(t);
                        setModalOpen(true);
                      }}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3 text-slate-500 font-semibold whitespace-nowrap">
                        {formatDate(t.transactionDate)}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 group-hover:text-[#6C3BFF] transition-colors truncate max-w-xs">
                          {t.merchant || t.description || "Expense Transaction"}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-semibold">
                          {t.paymentMethod || "UPI"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-medium truncate max-w-[120px]">
                        {t.bank || t.accountNumber || "HDFC Bank"}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 tabular-nums">
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {paginatedTransactions.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setEditingTxn(t);
                    setModalOpen(true);
                  }}
                  className="py-3 px-1 active:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {t.merchant || t.description || "Expense Transaction"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(t.transactionDate)} • {t.paymentMethod || "UPI"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-slate-900 text-xs tabular-nums block">
                      {formatCurrency(t.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[90px] block">
                      {t.bank || t.accountNumber || "HDFC Bank"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-medium text-[11px]">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, processedTransactions.length)} of{" "}
                  {processedTransactions.length}
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
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
            <p className="font-bold text-slate-700 mb-1">No transactions found</p>
            <p>No expense records found for {categoryName} in this period.</p>
          </div>
        )}
      </div>

      {/* Edit / View Modal */}
      {modalOpen && editingTxn && (
        <TransactionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          initialData={editingTxn}
          onSubmit={async (data) => {
            try {
              await api.updateTransaction(editingTxn.id, data);
              await loadCategoryTransactions(selectedYear, selectedMonth, categoryName);
              setModalOpen(false);
            } catch (e) {
              console.error(e);
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}
