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
      iconColor: "text-rose-500",
    },
    {
      id: "income",
      title: incomeTitle,
      amount: totalIncome,
      isCurrency: true,
      icon: TrendingUp,
      color: "text-emerald-600",
      iconColor: "text-emerald-500",
    },
    {
      id: "savings",
      title: "Net Savings",
      amount: netSavings,
      isCurrency: true,
      icon: Wallet,
      color: netSavings >= 0 ? "text-emerald-600" : "text-rose-600",
      iconColor: netSavings >= 0 ? "text-emerald-500" : "text-rose-500",
    },
    {
      id: "records",
      title: recordsTitle,
      amount: totalRecords,
      isCurrency: false,
      icon: ReceiptText,
      color: "text-slate-900",
      iconColor: "text-indigo-500",
    },
  ];

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-md border border-purple-100 shadow-xs select-none">
      <div className="grid grid-cols-2 lg:grid-cols-4 items-center">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col justify-center px-4 py-3 sm:px-6 sm:py-3.5 hover:bg-purple-50/20 transition-colors"
            >
              {/* Header: Icon + Title neatly paired together (No dots!) */}
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("w-3.5 h-3.5 shrink-0", m.iconColor)} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  {m.title}
                </span>
              </div>

              {/* Crisp Numerical Value */}
              <div className="flex items-baseline">
                <span className={cn("text-base sm:text-xl font-black tracking-tight tabular-nums truncate", m.color)}>
                  {m.isCurrency
                    ? `${m.id === "savings" && m.amount > 0 ? "+" : ""}${formatCurrency(m.amount)}`
                    : `${m.amount.toLocaleString()} txns`}
                </span>
              </div>

              {/* Centered Purple Separation Line in the Middle (Desktop) */}
              {idx < 3 && (
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-7 w-[1.5px] bg-[#6C3BFF]/25 rounded-full pointer-events-none"
                />
              )}

              {/* Centered Purple Separation Line in the Middle (Mobile Column 1) */}
              {(idx === 0 || idx === 2) && (
                <div
                  aria-hidden="true"
                  className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 h-7 w-[1.5px] bg-[#6C3BFF]/25 rounded-full pointer-events-none"
                />
              )}

              {/* Centered Purple Horizontal Divider between Row 1 and 2 (Mobile) */}
              {idx < 2 && (
                <div
                  aria-hidden="true"
                  className="lg:hidden absolute bottom-0 left-4 right-4 h-[1px] bg-[#6C3BFF]/15 pointer-events-none"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
