"use client";

import React from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Wallet, ReceiptText } from "lucide-react";
import { motion } from "framer-motion";

interface HorizontalMetricsBarProps {
  totalExpenses: number;
  totalIncome: number;
  netSavings: number;
  totalRecords: number;
  expensesTitle?: string;
  incomeTitle?: string;
  recordsTitle?: string;
}

export default function HorizontalMetricsBar({
  totalExpenses,
  totalIncome,
  netSavings,
  totalRecords,
  expensesTitle = "Total Expenses",
  incomeTitle = "Total Income",
  recordsTitle = "Total Records",
}: HorizontalMetricsBarProps) {
  const metrics = [
    {
      id: "expenses",
      title: expensesTitle,
      amount: totalExpenses,
      isCurrency: true,
      icon: TrendingDown,
      color: "text-rose-600",
      dotBg: "bg-rose-500",
      iconColor: "text-rose-500",
    },
    {
      id: "income",
      title: incomeTitle,
      amount: totalIncome,
      isCurrency: true,
      icon: TrendingUp,
      color: "text-emerald-600",
      dotBg: "bg-emerald-500",
      iconColor: "text-emerald-500",
    },
    {
      id: "savings",
      title: "Net Savings",
      amount: netSavings,
      isCurrency: true,
      icon: Wallet,
      color: netSavings >= 0 ? "text-emerald-600" : "text-rose-600",
      dotBg: netSavings >= 0 ? "bg-emerald-500" : "bg-rose-500",
      iconColor: netSavings >= 0 ? "text-emerald-500" : "text-rose-500",
    },
    {
      id: "records",
      title: recordsTitle,
      amount: totalRecords,
      isCurrency: false,
      icon: ReceiptText,
      color: "text-slate-900",
      dotBg: "bg-indigo-400",
      iconColor: "text-indigo-500",
    },
  ];

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-xs select-none overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200/90">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col justify-center px-4 py-3 sm:px-6 sm:py-3.5 hover:bg-slate-50/60 transition-colors"
            >
              {/* Header: Dot + Icon + Title neatly paired together */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dotBg)} />
                <Icon className={cn("w-3.5 h-3.5 shrink-0", m.iconColor)} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  {m.title}
                </span>
              </div>

              {/* Crisp Numerical Value */}
              <div className="flex items-baseline pl-3">
                <span className={cn("text-base sm:text-xl font-black tracking-tight tabular-nums truncate", m.color)}>
                  {m.isCurrency
                    ? `${m.id === "savings" && m.amount > 0 ? "+" : ""}${formatCurrency(m.amount)}`
                    : `${m.amount.toLocaleString()} txns`}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
