"use client";

import React from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Edit2, Trash2, Search } from "lucide-react";
import CategoryBadge from "@/components/common/CategoryBadge";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (txn: Transaction) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  isFetching?: boolean;
}

export default function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  loading = false,
  isFetching = false,
}: TransactionTableProps) {
  // Skeleton loader for initial cold load when no data has ever been loaded
  if (loading && (!transactions || transactions.length === 0)) {
    return (
      <div className="w-full overflow-hidden rounded-2xl liquid-glass border border-slate-200/80 shadow-xs min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Merchant</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Account / Bank</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-3.5 w-20 bg-slate-200/70 rounded-md" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-36 bg-slate-200/80 rounded-md" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-200/60 rounded-full" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-16 bg-slate-200/60 rounded-md" /></td>
                  <td className="py-3.5 px-4"><div className="h-3.5 w-20 bg-slate-200/60 rounded-md" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-4 w-16 bg-slate-200/80 rounded-md ml-auto" /></td>
                  <td className="py-3.5 px-4 text-center"><div className="h-4 w-12 bg-slate-200/60 rounded-md mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Stable empty state that preserves container height and never collapses the page
  if (!transactions || transactions.length === 0) {
    return (
      <div className="w-full min-h-[460px] flex flex-col items-center justify-center py-16 text-center liquid-glass rounded-2xl border border-slate-200/80 shadow-xs relative">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6C3BFF] border border-purple-100 flex items-center justify-center mb-3 shadow-2xs">
          <Search className="w-5 h-5" />
        </div>
        <p className="text-sm font-bold text-slate-800">No transactions found</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm px-4">
          No records match your active search or filters. Try adjusting your query or resetting filters.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl liquid-glass border border-slate-200/80 shadow-xs relative min-h-[460px] transition-all duration-200">
      {/* Table with In-Place Smooth Crossfade (Clean, stable, no intrusive loading lines or popups) */}
      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full text-left text-xs transition-opacity duration-200 ease-out",
            isFetching ? "opacity-55" : "opacity-100"
          )}
        >
          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Merchant</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Account / Bank</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {transactions.map((txn) => {
              const isExpense = txn.transactionType === "EXPENSE";

              return (
                <tr
                  key={txn.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                    {formatDate(txn.transactionDate)}
                  </td>

                  {/* Merchant & Reference */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isExpense
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{txn.merchant}</div>
                        {txn.referenceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Ref: {txn.referenceNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <CategoryBadge category={txn.category} />
                  </td>

                  {/* Transaction Type */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider ${
                        isExpense
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {txn.transactionType}
                    </span>
                  </td>

                  {/* Bank & Account */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <span>{txn.bank}</span>
                      <span className="text-[11px] text-slate-400 font-normal">{txn.accountNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5 font-medium">
                      {txn.paymentMethod}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <span
                      className={`font-extrabold text-sm tracking-tight ${
                        isExpense ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(txn.amount)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(txn)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Edit Transaction"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(txn.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
