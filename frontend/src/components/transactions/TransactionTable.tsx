"use client";

import React from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Edit2, Trash2 } from "lucide-react";

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (txn: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionTable({
  transactions,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="w-full py-16 text-center text-xs text-slate-400 liquid-glass rounded-2xl border border-white/10">
        No transactions match the selected filters.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl liquid-glass border border-white/10 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
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
          <tbody className="divide-y divide-white/5 text-slate-200">
            {transactions.map((txn) => {
              const isExpense = txn.transactionType === "EXPENSE";

              return (
                <tr
                  key={txn.id}
                  className="hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-medium">
                    {formatDate(txn.transactionDate)}
                  </td>

                  {/* Merchant & Reference */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isExpense
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {isExpense ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">{txn.merchant}</div>
                        {txn.referenceNumber && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Ref: {txn.referenceNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                      {txn.category || "Other"}
                    </span>
                  </td>

                  {/* Transaction Type */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${
                        isExpense
                          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {txn.transactionType}
                    </span>
                  </td>

                  {/* Bank & Account */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-slate-200">{txn.bank}</span>
                      <span className="text-[11px] text-slate-500">{txn.accountNumber}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                      {txn.paymentMethod}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <span
                      className={`font-bold text-sm tracking-tight ${
                        isExpense ? "text-rose-400" : "text-emerald-400"
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
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Edit Transaction"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(txn.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
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
