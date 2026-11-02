"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
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
  X,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CATEGORIES as ALL_CATEGORIES } from "@/lib/constants";
import { TransactionsSkeleton } from "@/components/common/LoadingSkeletons";
import { useToast } from "@/lib/toast-context";
import IntelligentSearchBar from "@/components/transactions/IntelligentSearchBar";
import MobileTransactionsView from "@/components/mobile/MobileTransactionsView";

const CATEGORIES = ["ALL", ...ALL_CATEGORIES];

function TransactionsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [suggestionPool, setSuggestionPool] = useState<Transaction[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Preload a broad pool for instant client-side predictive suggestions
  useEffect(() => {
    api
      .getTransactions({ size: 150 })
      .then((res) => {
        if (res && res.content) {
          setSuggestionPool(res.content);
        }
      })
      .catch((e) => console.error("Failed to preload suggestions pool", e));
  }, []);

  // Sync loaded transactions into suggestions pool
  useEffect(() => {
    if (transactions.length > 0) {
      setSuggestionPool((prev) => {
        const map = new Map<string, Transaction>();
        prev.forEach((t) => map.set(t.id, t));
        transactions.forEach((t) => map.set(t.id, t));
        return Array.from(map.values());
      });
    }
  }, [transactions]);

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

  const loadTransactions = useCallback(
    async (
      currentSearch = search,
      currentType = typeFilter,
      currentCategory = categoryFilter,
      currentPage = page
    ) => {
      try {
        setIsFetching(true);
        const res = await api.getTransactions({
          type: currentType,
          category: currentCategory,
          search: currentSearch.trim() || undefined,
          page: currentPage,
          size: 15,
        });
        setTransactions(res.content || []);
        setTotalPages(res.totalPages || 0);
        setTotalElements(res.totalElements || 0);
      } catch (e) {
        console.error("Failed to load transactions", e);
      } finally {
        setInitialLoading(false);
        setIsFetching(false);
      }
    },
    [search, typeFilter, categoryFilter, page]
  );

  // Primary loader on type, category, or page change
  useEffect(() => {
    loadTransactions(search, typeFilter, categoryFilter, page);

    const handleSync = () => {
      loadTransactions(search, typeFilter, categoryFilter, page);
    };
    window.addEventListener("finora-sync-completed", handleSync);
    return () => window.removeEventListener("finora-sync-completed", handleSync);
  }, [typeFilter, categoryFilter, page]);

  // Debounced live dynamic filtering (skips initial mount to prevent double-load glitch!)
  const isInitialSearchMount = useRef(true);
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }
    // If search was cleared, immediately reload full list
    if (search.trim() === "") {
      setPage(0);
      loadTransactions("", typeFilter, categoryFilter, 0);
      return;
    }
    const timer = setTimeout(() => {
      setPage(0);
      loadTransactions(search, typeFilter, categoryFilter, 0);
    }, 450);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchSubmit = (val: string = search) => {
    setPage(0);
    loadTransactions(val, typeFilter, categoryFilter, 0);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === page || isFetching) return;
    setPage(newPage);
  };

  const handleCreateOrUpdate = async (data: TransactionRequest) => {
    try {
      if (editingTxn) {
        await api.updateTransaction(editingTxn.id, data);
        toast.success("Transaction Updated", `${data.merchant} (${data.transactionType === "EXPENSE" ? "-" : "+"}₹${data.amount})`);
      } else {
        await api.createTransaction(data);
        toast.success("Transaction Added", `${data.merchant} (${data.transactionType === "EXPENSE" ? "-" : "+"}₹${data.amount})`);
      }
      await loadTransactions();
    } catch (err: any) {
      toast.error("Operation Failed", err.message || "Failed to save transaction");
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      try {
        await api.deleteTransaction(id);
        toast.info("Transaction Deleted", "Record removed from ledger.");
        await loadTransactions();
      } catch (e: any) {
        toast.error("Delete Failed", e.message || "Failed to delete transaction");
      }
    }
  };



  return (
    <>
      {/* 1. Mobile-Specific Transaction View (< md) */}
      <MobileTransactionsView
        transactions={transactions}
        isFetching={isFetching}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        typeFilter={typeFilter}
        onTypeFilterChange={(type) => {
          setTypeFilter(type);
          setPage(0);
        }}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={(cat) => {
          setCategoryFilter(cat);
          setPage(0);
        }}
        categories={CATEGORIES}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={handlePageChange}
        onOpenNewModal={() => {
          setEditingTxn(null);
          setModalOpen(true);
        }}
        onOpenCsvModal={() => setCsvModalOpen(true)}
        onEditTransaction={(txn) => {
          setEditingTxn(txn);
          setModalOpen(true);
        }}
        onDeleteTransaction={handleDelete}
        suggestionPool={suggestionPool}
      />

      {/* 2. Desktop Transaction Table (md+) - 100% UNTOUCHED AND PRESERVED */}
      <div className="hidden md:block space-y-6 pb-28">
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

      {/* Filter and Search Bar with Intelligent Predictive Search & Sliding Type Selector */}
      <div className="rounded-2xl liquid-glass p-3 sm:p-4 border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit(search);
          }}
          className="flex gap-2 relative z-30"
        >
          <IntelligentSearchBar
            value={search}
            onChange={setSearch}
            onSearchSubmit={(val) => {
              setSearch(val);
              handleSearchSubmit(val);
            }}
            onSelectMerchant={(merchantName) => {
              setSearch(merchantName);
              handleSearchSubmit(merchantName);
            }}
            onSelectTransaction={(txn) => {
              setEditingTxn(txn);
              setModalOpen(true);
            }}
            allTransactions={suggestionPool}
            placeholder="Search by merchant, note, or amount..."
            className="flex-1"
          />
          <button
            type="submit"
            className="btn-primary px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0 text-white shadow-2xs hover:shadow-xs active:scale-95 transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Type Filter Pills with Color-Coded Sliding Indicator (Orange for Expense, Green for Income, Purple for All) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 p-1 bg-slate-100/90 border border-slate-200/70 rounded-2xl relative">
            {["ALL", "EXPENSE", "INCOME", "REFUND", "TRANSFER"].map((t) => {
              const isSelected = typeFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTypeFilter(t);
                    setPage(0);
                  }}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors select-none cursor-pointer outline-none z-10",
                    isSelected ? "text-white" : "text-[#475569] hover:text-[#5228E0]"
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="txn-filter-active-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                      className="absolute inset-0 rounded-xl -z-10 pointer-events-none"
                    >
                      <div
                        className="w-full h-full rounded-xl overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #8F6BFF 0%, #7547F5 45%, #5228E0 100%)",
                          boxShadow: "0 3px 10px rgba(108, 59, 255, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
                          border: "1px solid rgba(255, 255, 255, 0.28)",
                        }}
                      />
                    </motion.div>
                  )}
                  <span className={cn("relative z-10", isSelected ? "text-white font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]" : "text-[#475569] hover:text-[#5228E0]")}>
                    {t}
                  </span>
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

      {/* Transaction Table with Anchor */}
      <div id="transactions-table-anchor" className="scroll-mt-24">
        <TransactionTable
          transactions={transactions}
          loading={initialLoading}
          isFetching={isFetching}
          onEdit={(txn) => {
            setEditingTxn(txn);
            setModalOpen(true);
          }}
          onDelete={handleDelete}
        />
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700 font-semibold">{transactions.length}</strong> of{" "}
            <strong className="text-slate-700 font-semibold">{totalElements}</strong> transactions
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(0, page - 1))}
              disabled={page === 0 || isFetching}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-800 font-bold tabular-nums">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1 || isFetching}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </div>

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
    </>
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
