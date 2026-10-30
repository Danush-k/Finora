"use client";

import React from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, ArrowRight } from "lucide-react";
import Link from "next/link";

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
              <div
                key={txn.id}
                className="flex items-center justify-between py-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
              >
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
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                        {txn.category || "Other"}
                      </span>
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
