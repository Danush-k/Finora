"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import {
  DebtLentRecord,
  DebtLentRequest,
  DebtLentStatus,
  DebtLentSummary,
  DebtLentType,
} from "@/types";
import DebtLentCard from "@/components/debt-lent/DebtLentCard";
import DebtLentModal from "@/components/debt-lent/DebtLentModal";
import InstallmentChecklistDrawer from "@/components/debt-lent/InstallmentChecklistDrawer";
import { formatCurrency, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DebtLentSkeleton } from "@/components/common/LoadingSkeletons";
import {
  PlusCircle,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  AlertTriangle,
  Search,
  X,
  CheckCircle2,
  Clock,
  Wallet,
  Users,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/lib/toast-context";

export default function DebtLentPage() {
  const { toast } = useToast();
  const [recordsCache, setRecordsCache] = useState<{ LENT: DebtLentRecord[]; DEBT: DebtLentRecord[] }>(() => ({
    LENT: api.getCachedDebtLentRecords("LENT") || [],
    DEBT: api.getCachedDebtLentRecords("DEBT") || [],
  }));
  const [summary, setSummary] = useState<DebtLentSummary | null>(() => api.getCachedDebtLentSummary() || null);
  const [initialLoading, setInitialLoading] = useState(() => {
    return !api.getCachedDebtLentRecords("LENT") && !api.getCachedDebtLentRecords("DEBT");
  });
  const [isFetching, setIsFetching] = useState(false);

  // Active top-level mode: "LENT" (Receivables) vs "DEBT" (Payables)
  const [activeTab, setActiveTab] = useState<"LENT" | "DEBT">("LENT");
  const [statusFilter, setStatusFilter] = useState<DebtLentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Active records computed in-memory for instant, zero-flicker tab switching
  const activeRecords = useMemo(() => {
    const raw = recordsCache[activeTab] || [];
    return raw.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = r.counterpartyName?.toLowerCase().includes(q);
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchAmt = r.principalAmount?.toString().includes(q);
        return matchName || matchDesc || matchAmt;
      }
      return true;
    });
  }, [recordsCache, activeTab, statusFilter, search]);

  // Dynamic live suggestions from counterparties
  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const raw = recordsCache[activeTab] || [];
    const names = Array.from(new Set(raw.map((r) => r.counterpartyName).filter(Boolean)));
    return names.filter((n) => n.toLowerCase().includes(q)).slice(0, 5);
  }, [search, recordsCache, activeTab]);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DebtLentRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DebtLentRecord | null>(null);

  // Concurrently refresh both Lent and Debt datasets so switching between them is 100% instant
  const refreshData = useCallback(async () => {
    try {
      setIsFetching(true);
      const [lentList, debtList, sum] = await Promise.all([
        api.getDebtLentRecords("LENT"),
        api.getDebtLentRecords("DEBT"),
        api.getDebtLentSummary(),
      ]);
      setRecordsCache({ LENT: lentList, DEBT: debtList });
      setSummary(sum);

      if (selectedRecord) {
        const all = [...lentList, ...debtList];
        const updated = all.find((r) => r.id === selectedRecord.id);
        if (updated) setSelectedRecord(updated);
      }
    } catch (e) {
      console.error("Failed to load debt & lent records", e);
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  }, [selectedRecord]);

  // Primary loader on mount
  useEffect(() => {
    refreshData();
  }, []);

  // Support direct deep link: /debt-lent?tab=<type>&recordId=<id>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("recordId");
    const targetTab = params.get("tab") as "LENT" | "DEBT" | null;

    if (targetTab && (targetTab === "LENT" || targetTab === "DEBT")) {
      setActiveTab(targetTab);
    }

    if (!targetId) return;

    api.getDebtLentById(targetId)
      .then((rec) => {
        if (rec) {
          setActiveTab(rec.type);
          setSelectedRecord(rec);
        }
      })
      .catch((e) => {
        console.error("Could not fetch recordId from URL", e);
      });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
  };

  const handleCreateOrUpdate = async (data: DebtLentRequest) => {
    try {
      if (editingRecord) {
        await api.updateDebtLentRecord(editingRecord.id, data);
        toast.success("Record Updated", `${data.counterpartyName} (${formatCurrency(data.principalAmount)})`);
      } else {
        await api.createDebtLentRecord(data);
        toast.success("Record Created", `${data.type === "LENT" ? "Money Lent to" : "Debt from"} ${data.counterpartyName}`);
      }
      await refreshData();
    } catch (err: any) {
      toast.error("Operation Failed", err.message || "Failed to save record");
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDebtLentRecord(id);
      setSelectedRecord(null);
      toast.info("Record Deleted", "Debt & Lent record removed successfully.");
      await refreshData();
    } catch (e: any) {
      toast.error("Delete Failed", e.message || "Failed to delete record");
      console.error("Failed to delete record", e);
    }
  };

  const isLentTab = activeTab === "LENT";



  return (
    <div className="space-y-6 pb-28">
      {/* Top Main Segregation Selector */}
      <div className="p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl bg-slate-100/90 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 flex-1 sm:max-w-xl relative">
          {/* Lent Tab Button */}
          <button
            onClick={() => {
              setActiveTab("LENT");
              setStatusFilter("ALL");
            }}
            className={cn(
              "relative flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-colors duration-200 cursor-pointer select-none outline-none",
              isLentTab ? "text-emerald-900" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {isLentTab && (
              <motion.div
                layoutId="debt-lent-main-tab-pill"
                transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.8 }}
                className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-emerald-100 ring-2 ring-emerald-500/20 z-0"
              />
            )}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isLentTab ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <div className="text-left">
                  <span className="block leading-none text-xs sm:text-sm font-black">Money Lent</span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 hidden xs:block mt-0.5">
                    Receivables
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  isLentTab
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {summary?.lentActiveCount || 0}
              </span>
            </div>
          </button>

          {/* Debt Tab Button */}
          <button
            onClick={() => {
              setActiveTab("DEBT");
              setStatusFilter("ALL");
            }}
            className={cn(
              "relative flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-colors duration-200 cursor-pointer select-none outline-none",
              !isLentTab ? "text-amber-900" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {!isLentTab && (
              <motion.div
                layoutId="debt-lent-main-tab-pill"
                transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.8 }}
                className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white shadow-sm border border-amber-100 ring-2 ring-amber-500/20 z-0"
              />
            )}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    !isLentTab ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <div className="text-left">
                  <span className="block leading-none text-xs sm:text-sm font-black">Debt</span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 hidden xs:block mt-0.5">
                    Payables
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] sm:text-[11px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  !isLentTab
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {summary?.debtActiveCount || 0}
              </span>
            </div>
          </button>
        </div>

        {/* Global Net Balance Snippet */}
        <div className="flex items-center justify-between sm:justify-end px-3 py-1 sm:border-l sm:border-slate-200 text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block sm:hidden">
            Net Balance
          </span>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
              Net Balance
            </span>
            <span
              className={`text-xs sm:text-sm font-extrabold tabular-nums ${
                (summary?.netStanding || 0) >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {(summary?.netStanding || 0) >= 0 ? "+" : ""}
              {formatCurrency(summary?.netStanding || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Mode Header with Dedicated Actions */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
              {isLentTab ? "Money Lent" : "Debt & Borrowing"}
            </h1>
            <span
              className={`text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                isLentTab
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {isLentTab ? "Receivables" : "Payables"}
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
            {isLentTab
              ? "Track loans given to friends & family, upcoming repayments, and interest checklists"
              : "Track personal borrowings, loans taken, repayment milestones, and interest schedules"}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRecord(null);
            setModalOpen(true);
          }}
          className="btn-primary flex items-center gap-1.5 h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-white text-xs font-bold cursor-pointer shrink-0 shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5 text-white" />
          <span className="text-white font-bold">{isLentTab ? "+ Log Lent" : "+ Log Debt"}</span>
        </button>
      </div>

      {/* DEDICATED METRIC CARDS: STABLE SHARED LAYOUT (Zero unmounting / Zero layout shifts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Remaining */}
        <div
          className={cn(
            "p-3 sm:p-5 rounded-2xl liquid-glass shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2 transition-all duration-200",
            isLentTab
              ? "border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 via-white to-transparent"
              : "border-amber-200/90 bg-gradient-to-br from-amber-50/40 via-white to-transparent"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isLentTab ? "Remaining" : "Remaining Debt"}
            </span>
            <div
              className={cn(
                "w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors duration-200",
                isLentTab
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                  : "bg-amber-50 border border-amber-200 text-amber-600"
              )}
            >
              {isLentTab ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div>
            <p
              className={cn(
                "text-base sm:text-2xl font-black tabular-nums transition-colors duration-200",
                isLentTab ? "text-emerald-700" : "text-amber-700"
              )}
            >
              {formatCurrency(isLentTab ? summary?.totalLentRemaining || 0 : summary?.totalDebtRemaining || 0)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
              {isLentTab ? "Owed to you" : "Liability to settle"}
            </p>
          </div>
        </div>

        {/* Card 2: Total Principal */}
        <div className="p-3 sm:p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isLentTab ? "Total Lent" : "Total Borrowed"}
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-base sm:text-2xl font-black text-slate-900 tabular-nums">
              {formatCurrency(isLentTab ? summary?.totalLentPrincipal || 0 : summary?.totalDebtPrincipal || 0)}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
              {isLentTab ? "Principal lent" : "Principal borrowed"}
            </p>
          </div>
        </div>

        {/* Card 3: Recovered / Repaid */}
        <div className="p-3 sm:p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isLentTab ? "Recovered" : "Repaid"}
            </span>
            <div
              className={cn(
                "w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors duration-200",
                isLentTab
                  ? "bg-teal-50 border border-teal-100 text-teal-600"
                  : "bg-emerald-50 border border-emerald-100 text-emerald-600"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-base sm:text-2xl font-black text-slate-900 tabular-nums">
              {formatCurrency(isLentTab ? summary?.totalLentRecovered || 0 : summary?.totalDebtRepaid || 0)}
            </p>
            <p className={cn("text-[10px] sm:text-[11px] font-bold mt-0.5 truncate", isLentTab ? "text-teal-600" : "text-emerald-600")}>
              {isLentTab
                ? summary && summary.totalLentPrincipal > 0
                  ? `${Math.round((summary.totalLentRecovered / summary.totalLentPrincipal) * 100)}% recovered`
                  : "0% recovered"
                : summary && summary.totalDebtPrincipal > 0
                ? `${Math.round((summary.totalDebtRepaid / summary.totalDebtPrincipal) * 100)}% cleared`
                : "0% cleared"}
            </p>
          </div>
        </div>

        {/* Card 4: Active Borrowers / Lenders */}
        <div className="p-3 sm:p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isLentTab ? "Borrowers" : "Lenders"}
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <p className="text-base sm:text-2xl font-black text-slate-900 tabular-nums">
              {isLentTab ? summary?.lentActiveCount || 0 : summary?.debtActiveCount || 0}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
              {isLentTab ? "Active borrowers" : "Active lenders"}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Dynamic Autocomplete & Sliding Indicator */}
      <div className="rounded-2xl liquid-glass p-3 sm:p-4 border border-slate-200/80 space-y-2.5 sm:space-y-3 shadow-xs relative">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 relative">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                isLentTab
                  ? "Search borrower, note, or amount..."
                  : "Search lender, note, or amount..."
              }
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              className="w-full pl-8 sm:pl-9 pr-8 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setShowSuggestions(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dynamic Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl overflow-hidden py-1.5"
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Suggested Counterparties
                  </div>
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onMouseDown={() => {
                        setSearch(name);
                        setShowSuggestions(false);
                      }}
                      className="w-full px-3.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 flex items-center justify-between cursor-pointer"
                    >
                      <span>{name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">Click to filter</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="submit"
            className="btn-secondary px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Status Sub-filter pills with Smooth Sliding Indicator (Green for Lent, Orange for Debt) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full xs:w-auto py-0.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 relative">
            {(["ALL", "ACTIVE", "PARTIALLY_SETTLED", "SETTLED", "OVERDUE"] as const).map(
              (s) => {
                const isSelected = statusFilter === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "relative px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 outline-none select-none z-10",
                      isSelected ? "text-white" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="debt-lent-status-slider-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
                        className="absolute inset-0 rounded-lg pointer-events-none -z-10"
                        style={{
                          background: isLentTab
                            ? "linear-gradient(135deg, #34D399 0%, #10B981 50%, #059669 100%)"
                            : "linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)",
                          boxShadow: isLentTab
                            ? "0 2px 8px rgba(16,185,129,0.35)"
                            : "0 2px 8px rgba(249,115,22,0.35)",
                        }}
                      />
                    )}
                    <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]">
                      {s === "PARTIALLY_SETTLED" ? "Partial" : s.replace("_", " ")}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          <span className="text-[10px] sm:text-[11px] text-slate-400 shrink-0 self-end xs:self-center">
            {activeRecords.length} {isLentTab ? "lent record(s)" : "debt record(s)"}
          </span>
        </div>
      </div>

      {/* Grid of Records with Smooth Apple State Transitions (Zero Layout Shift) */}
      {initialLoading && activeRecords.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="min-h-[220px] rounded-3xl liquid-glass border border-slate-200/80 p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-slate-200/80 rounded-md" />
                <div className="h-5 w-16 bg-slate-200/60 rounded-full" />
              </div>
              <div className="h-7 w-36 bg-slate-200/80 rounded-lg" />
              <div className="h-3 w-full bg-slate-200/60 rounded-full" />
              <div className="pt-2 flex justify-between">
                <div className="h-3.5 w-20 bg-slate-200/60 rounded-md" />
                <div className="h-3.5 w-20 bg-slate-200/60 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : activeRecords.length === 0 ? (
        <div className="py-16 rounded-3xl liquid-glass border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-3 p-6">
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              isLentTab
                ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                : "bg-amber-50 border border-amber-200 text-amber-600"
            )}
          >
            {isLentTab ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="text-base font-extrabold text-slate-900">
              {isLentTab ? "No Money Lent Records" : "No Debt Records Found"}
            </h4>
            <p className="text-xs text-slate-500">
              {isLentTab
                ? "You haven't logged any money lent to others yet. Add a record to track receivables and installments."
                : "You have no active debts or borrowings recorded. Add a record to track repayments and schedules."}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingRecord(null);
              setModalOpen(true);
            }}
            className={cn(
              "mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer",
              isLentTab
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
            )}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isLentTab ? "Log First Money Lent" : "Log First Debt"}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeRecords.map((record) => (
            <DebtLentCard
              key={record.id}
              record={record}
              onClick={() => setSelectedRecord(record)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <DebtLentModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingRecord}
        defaultType={activeTab}
      />

      {/* Checklist & Repayments Drawer */}
      <InstallmentChecklistDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onRecordUpdated={(updated) => {
          setSelectedRecord(updated);
          refreshData();
        }}
        onDeleteRecord={handleDelete}
      />
    </div>
  );
}
