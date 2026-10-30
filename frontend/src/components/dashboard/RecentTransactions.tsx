"use client";

import React from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ArrowRight } from "lucide-react";
import Link from "next/link";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="w-full rounded-2xl liquid-glass p-5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
            Recent Transactions
          </h4>
          <p className="text-xs text-slate-400">Extracted from HDFC alerts & manual logs</p>
        </div>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {transactions && transactions.length > 0 ? (
        <div className="divide-y divide-white/5">
          {transactions.map((txn) => {
            const isExpense = txn.transactionType === "EXPENSE";

            return (
              <div
                key={txn.id}
                className="flex items-center justify-between py-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isExpense
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {isExpense ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200 tracking-tight">
                      {txn.merchant}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="px-1.5 py-0.2 rounded-md bg-white/5 border border-white/10 text-slate-300">
                        {txn.category || "Other"}
                      </span>
                      <span>·</span>
                      <span>{txn.bank} {txn.accountNumber}</span>
                      <span>·</span>
                      <span>{formatDate(txn.transactionDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-bold tracking-tight ${
                      isExpense ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {isExpense ? "-" : "+"}
                    {formatCurrency(txn.amount)}
                  </span>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                    {txn.paymentMethod}
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
