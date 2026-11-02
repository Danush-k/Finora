"use client";

import React from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import CategoryBadge from "@/components/common/CategoryBadge";

interface RecentTransactionsProps {
  transactions: Transaction[];
  monthName?: string;
}

export default function RecentTransactions({ transactions, monthName }: RecentTransactionsProps) {
  return (
    <div className="w-full rounded-2xl liquid-glass p-5 border border-slate-200/80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">
            Recent Activity {monthName && <span className="text-indigo-600 font-extrabold">• {monthName}</span>}
          </h4>
          <p className="text-xs text-slate-500">
            {monthName ? `Filtered activity recorded for ${monthName}` : "Live feed from HDFC alerts & manual entries"}
          </p>
        </div>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {transactions && transactions.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {transactions.map((txn) => {
            const isExpense = txn.transactionType === "EXPENSE";

            return (
              <div key={txn.id} className="transition-colors hover:bg-slate-50/60 rounded-xl">
                {/* 1. MOBILE 2-LEVEL COMPACT FINTECH ROW (< sm) */}
                <div className="sm:hidden py-2.5 px-2">
                  {/* Row 1: Direction Icon + Merchant Name (Left) | Amount (Right) */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          isExpense
                            ? "bg-rose-50 text-rose-600 border-rose-100/90"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100/90"
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 tracking-tight truncate">
                        {txn.merchant}
                      </h5>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-black tracking-tight tabular-nums ${
                          isExpense ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {isExpense ? "-" : "+"}
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Secondary metadata cleanly aligned beneath */}
                  <div className="flex items-center justify-between gap-2 mt-1.5 pl-[38px] text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <CategoryBadge category={txn.category} className="scale-80 origin-left" />
                      {txn.bank && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="font-medium text-slate-600 truncate max-w-[85px]">
                            {txn.bank} {txn.accountNumber ? `··${txn.accountNumber.slice(-4)}` : ""}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                      <span>{formatDate(txn.transactionDate)}</span>
                      {txn.paymentMethod && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="uppercase font-semibold tracking-wider text-[9px] bg-slate-100 px-1 py-0.2 rounded">
                            {txn.paymentMethod}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. DESKTOP SINGLE-LINE ROW (sm: and above - Completely Untouched!) */}
                <div className="hidden sm:flex items-center justify-between py-3 px-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isExpense
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}
                    >
                      {isExpense ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 tracking-tight">
                        {txn.merchant}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <CategoryBadge category={txn.category} />
                        <span>·</span>
                        <span className="font-medium text-slate-600">{txn.bank} {txn.accountNumber}</span>
                        <span>·</span>
                        <span>{formatDate(txn.transactionDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-extrabold tracking-tight ${
                        isExpense ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(txn.amount)}
                    </span>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mt-0.5">
                      {txn.paymentMethod}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-slate-400">
          No transactions found yet. Trigger a sync or add your first expense!
        </div>
      )}
    </div>
  );
}
