"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardSummary, MonthlyChartData, MonthlyChartPoint } from "@/types";
import MetricCard from "@/components/dashboard/MetricCard";
import ExpenseChart from "@/components/dashboard/ExpenseChart";
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
  Filter,
  X,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import CsvImportModal from "@/components/transactions/CsvImportModal";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyChart, setMonthlyChart] = useState<MonthlyChartData | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedMonthName, setSelectedMonthName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const loadData = async (year?: number, month?: number, monthKey?: string) => {
    try {
      if (year && month) {
        setIsFiltering(true);
      } else {
        setLoading(true);
      }

      const [sum, chart] = await Promise.all([
        api.getDashboardSummary(year, month),
        api.getMonthlyChart(),
      ]);

      setSummary(sum);
      setMonthlyChart(chart);

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
    loadData();
  }, []);

  const handleSelectMonth = (point: MonthlyChartPoint) => {
    if (point.year && point.monthNumber) {
      loadData(point.year, point.monthNumber, point.fullMonth);
    } else if (point.fullMonth) {
      const parts = point.fullMonth.split("-").map(Number);
      if (parts.length === 2) {
        loadData(parts[0], parts[1], point.fullMonth);
      }
    }
  };

  const handleResetMonth = () => {
    setSelectedMonthKey(null);
    setSelectedMonthName(null);
    loadData();
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Financial Overview
            </h1>
            {selectedMonthName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/90 animate-in fade-in duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <span>Showing: <strong>{selectedMonthName}</strong></span>
                <button
                  onClick={handleResetMonth}
                  className="ml-1 text-slate-400 hover:text-indigo-900 cursor-pointer p-0.5 rounded transition-colors"
                  title="Reset filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {selectedMonthName
              ? `Displaying verified expenses, income, and cashflow for ${selectedMonthName}`
              : "Real-time automated transaction tracking from HDFC alerts"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold border border-slate-200/90 shadow-2xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
            <span>Import CSV</span>
          </button>
          <Link
            href="/calendar"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Calendar View</span>
          </Link>
          <Link
            href="/transactions?action=new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Transaction</span>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${isFiltering ? "opacity-60" : "opacity-100"}`}>
        <MetricCard
          title="Total Expenses"
          amount={summary?.totalExpensesThisMonth || 0}
          icon={TrendingDown}
          variant="expense"
          count={summary?.expensesCountThisMonth}
          subtitle={summary?.activeMonthName || "This Month"}
        />
        <MetricCard
          title="Total Income"
          amount={summary?.totalIncomeThisMonth || 0}
          icon={TrendingUp}
          variant="income"
          count={summary?.incomeCountThisMonth}
          subtitle={summary?.activeMonthName || "This Month"}
        />
        <MetricCard
          title="Net Savings"
          amount={summary?.netSavingsThisMonth || 0}
          icon={Wallet}
          variant="savings"
          subtitle={summary?.activeMonthName ? `${summary.activeMonthName} Savings` : "Inflow - Outflow"}
        />
        <MetricCard
          title="Total Records"
          amount={summary?.totalTransactionsCount || 0}
          icon={ReceiptText}
          variant="neutral"
          subtitle="All Time Records"
        />
      </div>

      {/* Monthly Inflow vs Outflow & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ExpenseChart
            data={monthlyChart?.points || []}
            activeMonthKey={selectedMonthKey}
            onSelectMonth={handleSelectMonth}
            onResetMonth={handleResetMonth}
          />
        </div>

        {/* Category Breakdown Card */}
        <div className="rounded-2xl liquid-glass p-5 border border-slate-200/80 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    Expense by Category
                  </h4>
                  {summary?.activeMonthName && (
                    <span className="text-[10px] text-indigo-600 font-bold">
                      {summary.activeMonthName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {summary?.categoryBreakdown && Object.keys(summary.categoryBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(summary.categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([cat, amt]) => {
                    const total = summary.totalExpensesThisMonth || 1;
                    const pct = Math.min(100, Math.round((amt / total) * 100));

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-700 font-semibold">{cat}</span>
                          <span className="text-slate-500 font-bold">
                            {formatCurrency(amt)}{" "}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No expense categories recorded for {summary?.activeMonthName || "this period"}.
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Automated classification active</span>
            <span className="text-indigo-600 font-semibold">HDFC Smart Rules</span>
          </div>
        </div>
      </div>

      {/* Segregated Quick Link to Calendar View */}
      <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Explore Monthly Cashflow Calendar
            </h4>
            <p className="text-xs text-slate-500">
              Inspect your daily transaction distribution, income dates, and expense spikes in the dedicated calendar view.
            </p>
          </div>
        </div>

        <Link
          href="/calendar"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
        >
          <span>Open Calendar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Recent Activity List filtered for active month */}
      <RecentTransactions
        transactions={summary?.recentTransactions || []}
        monthName={summary?.activeMonthName}
      />

      {/* CSV Import & Verification Modal */}
      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
