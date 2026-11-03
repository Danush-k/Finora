"use client";

import React, { useState, useMemo } from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import CategoryBadge from "@/components/common/CategoryBadge";
import { categoryToSlug, matchesCategory } from "@/lib/category-slugs";

interface RecentTransactionsProps {
  transactions: Transaction[];
  monthName?: string;
  selectedCategory?: string | null;
  onClearCategory?: () => void;
  activeYear?: number;
  activeMonth?: number;
}

export default function RecentTransactions({
  transactions,
  monthName,
  selectedCategory,
  onClearCategory,
  activeYear = 2026,
  activeMonth = 11,
}: RecentTransactionsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter transactions by selected category and search query
  const filteredTransactions = useMemo(() => {
    let list = [...(transactions || [])];

    if (selectedCategory) {
      list = list.filter((t) => matchesCategory(t.category, selectedCategory));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.merchant && t.merchant.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.accountNumber && t.accountNumber.toLowerCase().includes(q)) ||
          (t.bank && t.bank.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortOrder === "date-desc") return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      if (sortOrder === "date-asc") return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      if (sortOrder === "amount-desc") return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      if (sortOrder === "amount-asc") return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      return 0;
    });

    return list;
  }, [transactions, selectedCategory, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  return (
    <div className="w-full rounded-2xl liquid-glass p-5 border border-slate-200/80">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-black text-slate-900 tracking-tight">
              {selectedCategory ? (
                <span>Transactions in <span className="text-[#6C3BFF]">{selectedCategory}</span></span>
              ) : (
                <span>Recent Activity</span>
              )}
              {monthName && <span className="text-indigo-600 font-extrabold ml-1.5">• {monthName}</span>}
            </h4>

            {selectedCategory && onClearCategory && (
              <button
                type="button"
                onClick={onClearCategory}
                className="px-2 py-0.5 rounded-lg bg-purple-50 text-[#6C3BFF] text-[11px] font-bold border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
                title="Show all categories"
              >
                <X className="w-3 h-3" />
                <span>Show All</span>
              </button>
            )}

            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? "record" : "records"}
            </span>
          </div>

          {selectedCategory && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Filtered exclusively for {selectedCategory} transactions in {monthName || "the selected period"}.
            </p>
          )}
        </div>

        {/* Controls: Search, Sort, or View All */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto w-full sm:w-auto">
          {selectedCategory ? (
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search in category..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-purple-500 transition-colors"
                />
              </div>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer shadow-2xs"
              >
                <option value="date-desc">Newest</option>
                <option value="date-asc">Oldest</option>
                <option value="amount-desc">Highest</option>
                <option value="amount-asc">Lowest</option>
              </select>

              <Link
                href={`/dashboard/expenses/categories/${categoryToSlug(selectedCategory)}?year=${activeYear}&month=${activeMonth}`}
                className="btn-secondary h-8 px-2.5 rounded-xl text-[11px] font-bold text-[#6C3BFF] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Full Page</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <Link
              href="/transactions"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors ml-auto"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {paginatedTransactions && paginatedTransactions.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {paginatedTransactions.map((txn) => {
            const isExpense = txn.transactionType === "EXPENSE";

            return (
              <div key={txn.id} className="transition-colors hover:bg-slate-50/60 rounded-xl">
                {/* 1. MOBILE 2-LEVEL COMPACT FINTECH ROW (< sm) */}
                <div className="sm:hidden py-2.5 px-2">
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

                {/* 2. DESKTOP SINGLE-LINE ROW (sm: and above) */}
                <div className="hidden sm:flex items-center justify-between py-3 px-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
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
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 tracking-tight truncate">
                        {txn.merchant || txn.description || "Transaction"}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <CategoryBadge category={txn.category} />
                        <span>·</span>
                        <span className="font-medium text-slate-600 truncate max-w-[120px]">
                          {txn.bank} {txn.accountNumber}
                        </span>
                        <span>·</span>
                        <span>{formatDate(txn.transactionDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-extrabold tracking-tight tabular-nums ${
                        isExpense ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(txn.amount)}
                    </span>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mt-0.5">
                      {txn.paymentMethod || "UPI"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls when filtered */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-2 text-xs">
              <span className="text-slate-400 text-[11px]">
                Showing {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{" "}
                {filteredTransactions.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-bold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-10 text-center text-xs text-slate-400">
          <AlertCircle className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-600 mb-0.5">
            {selectedCategory
              ? `No transactions found in this category for the selected period.`
              : "No transactions found yet. Trigger a sync or add your first expense!"}
          </p>
          {selectedCategory && (
            <button
              type="button"
              onClick={onClearCategory}
              className="mt-2 text-xs font-bold text-[#6C3BFF] hover:underline cursor-pointer"
            >
              Clear category filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
