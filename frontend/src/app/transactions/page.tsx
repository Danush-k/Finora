"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Transaction, TransactionRequest } from "@/types";
import TransactionTable from "@/components/transactions/TransactionTable";
import TransactionModal from "@/components/transactions/TransactionModal";
import CsvImportModal from "@/components/transactions/CsvImportModal";
import {
  Search,
  Filter,
  PlusCircle,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CATEGORIES as ALL_CATEGORIES } from "@/lib/constants";
import { TransactionsSkeleton } from "@/components/common/LoadingSkeletons";

const CATEGORIES = ["ALL", ...ALL_CATEGORIES];

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
  const [csvModalOpen, setCsvModalOpen] = useState(false);
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

    const handleSync = () => {
      loadTransactions();
    };
    window.addEventListener("finora-sync-completed", handleSync);
    return () => window.removeEventListener("finora-sync-completed", handleSync);
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

  if (loading && transactions.length === 0) {
    return <TransactionsSkeleton />;
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search, filter, and manage all your extracted bank activities
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-[#5228E0]" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={() => {
              setEditingTxn(null);
              setModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span className="text-white font-semibold">Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl liquid-glass p-4 border border-slate-200/80 space-y-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by merchant, description, reference number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs font-medium"
            />
          </div>
          <button
            type="submit"
            className="btn-secondary px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Type Filter Pills with Smooth Sliding Indicator */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 p-1 bg-slate-100/90 border border-slate-200/70 rounded-2xl relative">
            {["ALL", "EXPENSE", "INCOME", "REFUND", "TRANSFER"].map((t) => {
              const isSelected = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTypeFilter(t);
                    setPage(0);
                  }}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors select-none cursor-pointer outline-none",
                    isSelected ? "text-white" : "text-[#475569] hover:text-[#5228E0]"
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="txn-filter-active-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
                      className="absolute inset-0 rounded-xl z-0 pointer-events-none"
                    >
                      <div
                        className="w-full h-full rounded-xl btn-primary overflow-hidden"
                        style={{
                          backgroundColor: "#6C3BFF",
                          background: "linear-gradient(135deg, #8F6BFF 0%, #7547F5 45%, #5228E0 100%)",
                          boxShadow: "0 4px 12px rgba(108,59,255,0.22), 0 8px 18px rgba(82,40,224,0.12), inset 0 1px 0 rgba(255,255,255,0.40)",
                          border: "1px solid rgba(255,255,255,0.32)",
                        }}
                      />
                    </motion.div>
                  )}
                  <span className={cn("relative z-10", isSelected ? "text-white font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]" : "text-[#475569] hover:text-[#5228E0]")}>{t}</span>
                </button>
              );
            })}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-semibold">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-medium focus:outline-none focus:border-indigo-500"
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
        loading={loading}
        onEdit={(txn) => {
          setEditingTxn(txn);
          setModalOpen(true);
        }}
        onDelete={handleDelete}
      />


      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500">
          <span>
            Showing {transactions.length} of {totalElements} transactions
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-800 font-bold">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors cursor-pointer"
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

      {/* CSV Import & Verification Modal */}
      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={() => {
          loadTransactions();
        }}
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
