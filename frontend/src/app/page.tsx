"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardSummary, MonthlyChartData } from "@/types";
import MetricCard from "@/components/dashboard/MetricCard";
import ExpenseChart from "@/components/dashboard/ExpenseChart";
import MonthlyCalendarView from "@/components/dashboard/MonthlyCalendarView";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  ReceiptText,
  PieChart,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyChart, setMonthlyChart] = useState<MonthlyChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sum, chart] = await Promise.all([
        api.getDashboardSummary(),
        api.getMonthlyChart(),
      ]);
      setSummary(sum);
      setMonthlyChart(chart);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Quick Add */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Financial Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time automated transaction tracking from HDFC alerts
          </p>
        </div>

        <Link
          href="/transactions?action=new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Transaction</span>
        </Link>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Expenses"
          amount={summary?.totalExpensesThisMonth || 0}
          icon={TrendingDown}
          variant="expense"
          count={summary?.expensesCountThisMonth}
          subtitle="This Month"
        />
        <MetricCard
          title="Total Income"
          amount={summary?.totalIncomeThisMonth || 0}
          icon={TrendingUp}
          variant="income"
          count={summary?.incomeCountThisMonth}
          subtitle="This Month"
        />
        <MetricCard
          title="Net Savings"
          amount={summary?.netSavingsThisMonth || 0}
          icon={Wallet}
          variant="savings"
          subtitle="Inflow - Outflow"
        />
        <MetricCard
          title="Total Records"
          amount={summary?.totalTransactionsCount || 0}
          icon={ReceiptText}
          variant="neutral"
          subtitle="All Time"
        />
      </div>

      {/* Monthly Chart & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ExpenseChart data={monthlyChart?.points || []} />
        </div>

        {/* Category Breakdown Card */}
        <div className="rounded-2xl liquid-glass p-5 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <PieChart className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
                  Expense by Category
                </h4>
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
                          <span className="text-slate-300 font-medium">{cat}</span>
                          <span className="text-slate-400 font-semibold">
                            {formatCurrency(amt)}{" "}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-rose-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No expense categories recorded this month.
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Automated classification active</span>
            <span className="text-indigo-400 font-medium">HDFC Smart Rules</span>
          </div>
        </div>
      </div>

      {/* Monthly Calendar View (User Requested) */}
      <MonthlyCalendarView />

      {/* Recent Transactions List */}
      <RecentTransactions transactions={summary?.recentTransactions || []} />
    </div>
  );
}
