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
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";

export default function DebtLentPage() {
  const [records, setRecords] = useState<DebtLentRecord[]>([]);
  const [summary, setSummary] = useState<DebtLentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<DebtLentType | "ALL">("ALL");
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
          typeFilter === "ALL" ? undefined : typeFilter,
          statusFilter === "ALL" ? undefined : statusFilter,
          search.trim() || undefined
        ),
        api.getDebtLentSummary(),
      ]);
      setRecords(recList);
      setSummary(sum);

      // If drawer is open, keep selectedRecord updated
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
  }, [typeFilter, statusFilter]);

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

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Debt & Lent Tracker
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
              Receivables & Payables
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track money lent to friends, personal debts, interest calculations, and installment checklists
          </p>
        </div>

        <button
          onClick={() => {
            setEditingRecord(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Entry</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Money Lent (Receivables) */}
        <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Money Lent (Receivables)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(summary?.totalLentRemaining || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Owed to you • {formatCurrency(summary?.totalLentRecovered || 0)} recovered
            </p>
          </div>
        </div>

        {/* Debt (Payables) */}
        <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Debt (Payables)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(summary?.totalDebtRemaining || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              You owe • {formatCurrency(summary?.totalDebtRepaid || 0)} repaid
            </p>
          </div>
        </div>

        {/* Net Standing */}
        <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Net Standing</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p
              className={`text-xl sm:text-2xl font-extrabold tabular-nums ${
                (summary?.netStanding || 0) >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {(summary?.netStanding || 0) >= 0 ? "+" : ""}
              {formatCurrency(summary?.netStanding || 0)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {(summary?.netStanding || 0) >= 0
                ? "Net Creditor (More owed to you)"
                : "Net Debtor (You owe more)"}
            </p>
          </div>
        </div>

        {/* Overdue / Actions */}
        <div className="p-5 rounded-2xl liquid-glass border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Overdue Milestones</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                (summary?.overdueCount || 0) > 0
                  ? "bg-rose-50 border border-rose-200 text-rose-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
              {summary?.overdueCount || 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {(summary?.overdueCount || 0) > 0 ? "Checklists past due date" : "All payments on schedule"}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl liquid-glass p-4 border border-slate-200/80 space-y-3 shadow-xs">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by person name, entity, or description..."
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Main Segmented Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/60">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setTypeFilter("LENT")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === "LENT"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>Money Lent</span>
            </button>
            <button
              onClick={() => setTypeFilter("DEBT")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === "DEBT"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-amber-600" />
              <span>Debts</span>
            </button>
          </div>

          {/* Status Sub-filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(["ALL", "ACTIVE", "PARTIALLY_SETTLED", "SETTLED", "OVERDUE"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Records */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-400">Loading debt & lent records...</div>
      ) : records.length === 0 ? (
        <div className="py-16 rounded-3xl liquid-glass border border-slate-200/80 flex flex-col items-center justify-center text-center space-y-3 p-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Coins className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="text-base font-extrabold text-slate-900">No Records Found</h4>
            <p className="text-xs text-slate-500">
              {typeFilter === "LENT"
                ? "You haven't logged any money lent to others yet."
                : typeFilter === "DEBT"
                ? "You haven't recorded any debts or borrowed money."
                : "Start tracking money you lent or borrowed with interest and repayment checklists."}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingRecord(null);
              setModalOpen(true);
            }}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Entry</span>
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
        defaultType={typeFilter === "DEBT" ? "DEBT" : "LENT"}
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
