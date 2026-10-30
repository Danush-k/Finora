"use client";

import React, { useEffect, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
import {
  PlusCircle,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Wallet,
  Users,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

export default function DebtLentPage() {
  const [records, setRecords] = useState<DebtLentRecord[]>([]);
  const [summary, setSummary] = useState<DebtLentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Active top-level mode: "LENT" (Receivables) vs "DEBT" (Payables)
  const [activeTab, setActiveTab] = useState<"LENT" | "DEBT">("LENT");
  const [statusFilter, setStatusFilter] = useState<DebtLentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DebtLentRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DebtLentRecord | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recList, sum] = await Promise.all([
        api.getDebtLentRecords(
          activeTab,
          statusFilter === "ALL" ? undefined : statusFilter,
          search.trim() || undefined
        ),
        api.getDebtLentSummary(),
      ]);
      setRecords(recList);
      setSummary(sum);

      // Keep drawer updated if active
      if (selectedRecord) {
        const updated = recList.find((r) => r.id === selectedRecord.id);
        if (updated) setSelectedRecord(updated);
      }
    } catch (e) {
      console.error("Failed to load debt & lent records", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  // Support direct deep link: /debt-lent?recordId=<id>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("recordId");
    if (!targetId) return;

    api.getDebtLentById(targetId)
      .then((rec) => {
        if (rec) {
          if (rec.type !== activeTab) {
            setActiveTab(rec.type);
          }
          setSelectedRecord(rec);
        }
      })
      .catch((e) => {
        console.error("Could not fetch recordId from URL", e);
      });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateOrUpdate = async (data: DebtLentRequest) => {
    if (editingRecord) {
      await api.updateDebtLentRecord(editingRecord.id, data);
    } else {
      await api.createDebtLentRecord(data);
    }
    await loadData();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDebtLentRecord(id);
      setSelectedRecord(null);
      await loadData();
    } catch (e) {
      console.error("Failed to delete record", e);
    }
  };

  const isLentTab = activeTab === "LENT";

  return (
    <div className="space-y-6 pb-28">
      {/* Top Main Segregation Selector */}
      <div className="p-1.5 rounded-3xl bg-slate-100/90 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 flex-1 sm:max-w-xl">
          {/* Lent Tab Button */}
          <button
            onClick={() => {
              setActiveTab("LENT");
              setStatusFilter("ALL");
            }}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              isLentTab
                ? "bg-white text-emerald-800 shadow-sm border border-emerald-100 ring-2 ring-emerald-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                isLentTab ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block leading-none">Money Lent</span>
              <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                Receivables • Owed to you
              </span>
            </div>
            <span
              className={`ml-auto text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                isLentTab
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {summary?.lentActiveCount || 0}
            </span>
          </button>

          {/* Debt Tab Button */}
          <button
            onClick={() => {
              setActiveTab("DEBT");
              setStatusFilter("ALL");
            }}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              !isLentTab
                ? "bg-white text-amber-800 shadow-sm border border-amber-100 ring-2 ring-amber-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                !isLentTab ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block leading-none">Debt</span>
              <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                Payables • You owe
              </span>
            </div>
            <span
              className={`ml-auto text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                !isLentTab
                  ? "bg-amber-100 text-amber-800"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {summary?.debtActiveCount || 0}
            </span>
          </button>
        </div>

        {/* Global Net Balance Snippet */}
        <div className="flex items-center justify-end px-3 py-1 sm:border-l sm:border-slate-200 text-right">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {isLentTab ? "Money Lent Tracker" : "Debt & Borrowing Tracker"}
            </h1>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isLentTab
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {isLentTab ? "Receivables (Inflow)" : "Payables (Outflow)"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
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
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer ${
            isLentTab
              ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25"
              : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/25"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isLentTab ? "Log Money Lent" : "Log New Debt"}</span>
        </button>
      </div>

      {/* DEDICATED METRIC CARDS FOR THE ACTIVE MODE */}
      {isLentTab ? (
        /* LENT METRICS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl liquid-glass border border-emerald-100 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Remaining to Receive</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 tabular-nums">
                {formatCurrency(summary?.totalLentRemaining || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Outstanding balance owed to you
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Money Lent</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(summary?.totalLentPrincipal || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cumulative principal lent out
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Recovered So Far</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(summary?.totalLentRecovered || 0)}
              </p>
              <p className="text-[11px] text-teal-600 font-semibold mt-0.5">
                {summary && summary.totalLentPrincipal > 0
                  ? `${Math.round(
                      (summary.totalLentRecovered / summary.totalLentPrincipal) * 100
                    )}% recovered`
                  : "0% recovered"}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Active Borrowers</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                {summary?.lentActiveCount || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                People currently holding your money
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* DEBT METRICS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl liquid-glass border border-amber-100 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Remaining to Repay</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-700 tabular-nums">
                {formatCurrency(summary?.totalDebtRemaining || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Your outstanding liability to settle
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Borrowed</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(summary?.totalDebtPrincipal || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Cumulative principal borrowed
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Repaid So Far</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatCurrency(summary?.totalDebtRepaid || 0)}
              </p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                {summary && summary.totalDebtPrincipal > 0
                  ? `${Math.round(
                      (summary.totalDebtRepaid / summary.totalDebtPrincipal) * 100
                    )}% cleared`
                  : "0% cleared"}
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Active Lenders</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
                {summary?.debtActiveCount || 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Entities / lenders you owe money to
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-2xl liquid-glass p-4 border border-slate-200/80 space-y-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                isLentTab
                  ? "Search borrower name, note, or amount..."
                  : "Search lender name, note, or amount..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 overflow-x-auto">
          {/* Status Sub-filter pills */}
          <div className="flex items-center gap-1.5">
            {(["ALL", "ACTIVE", "PARTIALLY_SETTLED", "SETTLED", "OVERDUE"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === s
                      ? isLentTab
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-amber-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              )
            )}
          </div>

          <span className="text-[11px] text-slate-400 shrink-0">
            Showing {records.length} {isLentTab ? "lent record(s)" : "debt record(s)"}
          </span>
        </div>
      </div>

      {/* Grid of Records */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-400">
          Loading {isLentTab ? "money lent" : "debt"} records...
        </div>
      ) : records.length === 0 ? (
        <div className="py-16 rounded-3xl liquid-glass border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-3 p-6">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isLentTab
                ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                : "bg-amber-50 border border-amber-200 text-amber-600"
            }`}
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
            className={`mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer ${
              isLentTab
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isLentTab ? "Log First Money Lent" : "Log First Debt"}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {records.map((record) => (
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
          loadData();
        }}
        onDeleteRecord={handleDelete}
      />
    </div>
  );
}
