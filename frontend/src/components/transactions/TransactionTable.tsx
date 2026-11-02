"use client";

import React from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Edit2, Trash2 } from "lucide-react";
import CategoryBadge from "@/components/common/CategoryBadge";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (txn: Transaction) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export default function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  loading = false,
}: TransactionTableProps) {
  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-2xl liquid-glass border border-slate-200/80 shadow-xs animate-fadeIn">
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
              {[...Array(6)].map((_, i) => (
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

  if (!transactions || transactions.length === 0) {
    return (
      <div className="w-full py-16 text-center text-xs text-slate-400 liquid-glass rounded-2xl border border-slate-200/80">
        No transactions match the selected filters.
      </div>
    );
  }


  return (
    <div className="w-full overflow-hidden rounded-2xl liquid-glass border border-slate-200/80 shadow-xs">
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
