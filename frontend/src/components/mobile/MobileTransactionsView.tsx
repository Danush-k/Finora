"use client";

import React, { useState } from "react";
import {
  Search,
  PlusCircle,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  X,
  Tag,
} from "lucide-react";
import { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import IntelligentSearchBar from "@/components/transactions/IntelligentSearchBar";
import MobileTransactionSheet from "./MobileTransactionSheet";

interface MobileTransactionsViewProps {
  transactions: Transaction[];
  isFetching: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (val: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  categories: string[];
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (newPage: number) => void;
  onOpenNewModal: () => void;
  onOpenCsvModal: () => void;
  onEditTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  suggestionPool: Transaction[];
}

export default function MobileTransactionsView({
  transactions,
  isFetching,
  search,
  onSearchChange,
  onSearchSubmit,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  page,
  totalPages,
  totalElements,
  onPageChange,
  onOpenNewModal,
  onOpenCsvModal,
  onEditTransaction,
  onDeleteTransaction,
  suggestionPool,
}: MobileTransactionsViewProps) {
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const hasActiveFilters = typeFilter !== "ALL" || categoryFilter !== "ALL" || search.trim().length > 0;

  const handleResetFilters = () => {
    onSearchChange("");
    onSearchSubmit("");
    onTypeFilterChange("ALL");
    onCategoryFilterChange("ALL");
  };

  return (
    <div className="space-y-3.5 pb-28 md:hidden">
      {/* ========================================================= */}
      {/* 1. MOBILE HEADER: Compact Title & Primary Actions         */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
            Transactions
          </h2>
          <p className="text-[11px] font-semibold text-slate-500">
            {totalElements} {totalElements === 1 ? "record" : "records"} recorded
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCsvModal}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            title="Import CSV"
          >
            <UploadCloud className="w-4 h-4 text-[#5228E0]" />
          </button>
          <button
            type="button"
            onClick={onOpenNewModal}
            className="btn-primary flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white shadow-2xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SEARCH & CONTEXTUAL SUGGESTIONS                        */}
      {/* ========================================================= */}
      <div className="relative z-30">
        <IntelligentSearchBar
          value={search}
          onChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          onSelectMerchant={(merchant) => {
            onSearchChange(merchant);
            onSearchSubmit(merchant);
          }}
          onSelectTransaction={(txn) => {
            setSelectedTxn(txn);
          }}
          allTransactions={suggestionPool}
          placeholder="Search merchant, category, ref..."
          className="w-full"
        />
      </div>

      {/* ========================================================= */}
      {/* 3. HORIZONTAL FILTER STRIP: Types & Category Chips        */}
      {/* ========================================================= */}
      <div className="space-y-2">
        {/* Type pills with smooth horizontal swipe */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-3.5 px-3.5">
          {["ALL", "EXPENSE", "INCOME", "REFUND", "TRANSFER"].map((type) => {
            const isSelected = typeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onTypeFilterChange(type)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#6C3BFF] text-white shadow-2xs shadow-purple-500/25"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Category selector & Reset Filter chip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-xl bg-white border border-slate-200/90 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#6C3BFF] shadow-2xs truncate"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MOBILE TRANSACTION CARDS LIST                          */}
      {/* ========================================================= */}
      <div
        className={`transition-opacity duration-200 ${
          isFetching ? "opacity-55" : "opacity-100"
        }`}
      >
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((txn) => {
              const isExpense = txn.transactionType === "EXPENSE";
              const formattedDate = txn.transactionDate
                ? new Date(txn.transactionDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })
                : "";

              return (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTxn(txn)}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Direction Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
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

                    {/* Merchant & Context */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {txn.merchant}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 truncate">
                        <span className="font-medium text-slate-600">{txn.category}</span>
                        <span className="text-slate-300">·</span>
                        <span>{formattedDate}</span>
                        {txn.paymentMethod && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="uppercase font-semibold tracking-wider text-slate-500">
                              {txn.paymentMethod}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-black tabular-nums block ${
                        isExpense ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 px-4 rounded-3xl bg-white border border-slate-200/80 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6C3BFF] border border-purple-100 flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">No transactions found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              No records match your active search or filters. Try adjusting your query.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-secondary mt-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. MOBILE PAGINATION: Touch-Friendly Controls             */}
      {/* ========================================================= */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs select-none">
          <button
            type="button"
            disabled={page === 0 || isFetching}
            onClick={() => onPageChange(Math.max(0, page - 1))}
            className="btn-secondary h-9 px-3 rounded-xl flex items-center gap-1 text-xs font-semibold cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          <span className="text-[11px] font-bold text-slate-600">
            Page {page + 1} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages - 1 || isFetching}
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            className="btn-secondary h-9 px-3 rounded-xl flex items-center gap-1 text-xs font-semibold cursor-pointer disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Transaction Bottom Sheet */}
      <MobileTransactionSheet
        transaction={selectedTxn}
        isOpen={!!selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onEdit={(txn) => {
          onEditTransaction(txn);
        }}
        onDelete={(id) => {
          onDeleteTransaction(id);
        }}
      />
    </div>
  );
}
