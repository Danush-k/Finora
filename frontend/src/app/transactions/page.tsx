"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Transaction, TransactionRequest } from "@/types";
import TransactionTable from "@/components/transactions/TransactionTable";
import TransactionModal from "@/components/transactions/TransactionModal";
import {
  Search,
  Filter,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";

const CATEGORIES = [
  "ALL",
  "Food & Dining",
  "Shopping",
  "Groceries",
  "Travel & Fuel",
  "Utilities & Bills",
  "Entertainment",
  "Health & Medical",
  "Investment",
  "Salary & Income",
  "Refund",
  "Transfer",
  "Other",
];

function TransactionsContent() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setEditingTxn(null);
      setModalOpen(true);
    }
  }, [searchParams]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({
        type: typeFilter,
        category: categoryFilter,
        search: search.trim() || undefined,
        page,
        size: 15,
      });
      setTransactions(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [typeFilter, categoryFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadTransactions();
  };

  const handleCreateOrUpdate = async (data: TransactionRequest) => {
    if (editingTxn) {
      await api.updateTransaction(editingTxn.id, data);
    } else {
      await api.createTransaction(data);
    }
    await loadTransactions();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      try {
        await api.deleteTransaction(id);
        await loadTransactions();
      } catch (e) {
        alert("Failed to delete transaction");
      }
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Search, filter, and manage all your extracted bank activities
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTxn(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Manual Entry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl liquid-glass p-4 border border-white/10 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by merchant, description, reference number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "EXPENSE", "INCOME", "REFUND", "TRANSFER"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setPage(0);
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  typeFilter === t
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <TransactionTable
        transactions={transactions}
        onEdit={(txn) => {
          setEditingTxn(txn);
          setModalOpen(true);
        }}
        onDelete={handleDelete}
      />

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400">
          <span>
            Showing {transactions.length} of {totalElements} transactions
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-300 font-medium">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-200 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTxn(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingTxn}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-20 text-center text-xs text-slate-400">
          Loading transactions...
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
