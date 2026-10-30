"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { DebtLentRecord, RepaymentInstallment, Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  X,
  CheckCircle2,
  Calendar,
  Clock,
  Link2,
  Plus,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Search,
  Percent,
  AlertTriangle,
  Receipt,
  User,
  Phone,
  Trash2,
} from "lucide-react";

interface InstallmentChecklistDrawerProps {
  record: DebtLentRecord | null;
  onClose: () => void;
  onRecordUpdated: (updated: DebtLentRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export default function InstallmentChecklistDrawer({
  record,
  onClose,
  onRecordUpdated,
  onDeleteRecord,
}: InstallmentChecklistDrawerProps) {
  // New installment inline form
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  // Map transaction dialog for a specific installment
  const [mappingInstallmentId, setMappingInstallmentId] = useState<string | null>(null);
  const [txnSearch, setTxnSearch] = useState("");
  const [candidates, setCandidates] = useState<Transaction[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Quick repayment
  const [showQuickRepay, setShowQuickRepay] = useState(false);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickNotes, setQuickNotes] = useState("");

  const [busy, setBusy] = useState(false);

  if (!record) return null;

  const isLent = record.type === "LENT";
  const totalExpected = record.totalExpectedAmount || record.principalAmount;
  const repaid = record.totalRepaidAmount || 0;
  const remaining = record.remainingAmount !== undefined ? record.remainingAmount : totalExpected - repaid;
  const pct = totalExpected > 0 ? Math.min(100, Math.round((repaid / totalExpected) * 100)) : 0;

  // Toggle checklist checkbox
  const handleToggle = async (inst: RepaymentInstallment) => {
    try {
      setBusy(true);
      const nextSettled = !inst.settled;
      const updated = await api.toggleInstallment(record.id, inst.id, {
        settled: nextSettled,
        settledAmount: nextSettled ? inst.amount : 0,
        settledDate: nextSettled ? new Date().toISOString() : undefined,
      });
      onRecordUpdated(updated);
    } catch (e) {
      console.error("Failed to toggle installment", e);
    } finally {
      setBusy(false);
    }
  };

  // Open transaction picker to link received/paid transaction to this installment
  const handleOpenTxnPicker = async (installmentId: string) => {
    setMappingInstallmentId(installmentId);
    setTxnSearch("");
    try {
      setLoadingCandidates(true);
      const res = await api.getDebtLentCandidates(undefined, 15);
      setCandidates(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleSearchCandidates = async (query: string) => {
    setTxnSearch(query);
    try {
      setLoadingCandidates(true);
      const res = await api.getDebtLentCandidates(query.trim() || undefined, 15);
      setCandidates(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Map transaction and settle installment
  const handleSelectTxnForInstallment = async (txn: Transaction) => {
    if (!mappingInstallmentId) return;
    try {
      setBusy(true);
      const updated = await api.toggleInstallment(record.id, mappingInstallmentId, {
        settled: true,
        settledAmount: txn.amount,
        settledDate: txn.transactionDate || new Date().toISOString(),
        linkedTransactionId: txn.id,
        linkedTransactionDescription: `${txn.merchant || txn.description} (${formatCurrency(txn.amount)})`,
      });
      onRecordUpdated(updated);
      setMappingInstallmentId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  // Add new checklist checkpoint
  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount) || 0;
    if (amt <= 0) return;

    try {
      setBusy(true);
      const newInst: RepaymentInstallment = {
        id: "",
        title: newTitle.trim() || `Installment #${record.installments.length + 1}`,
        amount: amt,
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : new Date().toISOString(),
        settled: false,
        settledAmount: 0,
      };

      // Add installment via API (using toggle or add endpoint)
      const res = await fetch(`/api/debt-lent/${record.id}/installments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newInst),
      });
      const json = await res.json();
      if (json.data) {
        onRecordUpdated(json.data);
      }
      setShowAddInstallment(false);
      setNewTitle("");
      setNewAmount("");
      setNewDueDate("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  // Quick lump-sum repayment
  const handleQuickRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickAmount) || 0;
    if (amt <= 0) return;

    try {
      setBusy(true);
      const updated = await api.recordQuickRepayment(record.id, amt, undefined, undefined, quickNotes.trim() || undefined);
      onRecordUpdated(updated);
      setShowQuickRepay(false);
      setQuickAmount("");
      setQuickNotes("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-end p-0 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div
        className="bg-white/98 backdrop-blur-2xl shadow-2xl border-l sm:border border-slate-200/90 w-full sm:max-w-xl h-full sm:h-[94vh] sm:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs border ${
                isLent
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
            >
              {isLent ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  {record.counterpartyName}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    record.status === "SETTLED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : record.status === "PARTIALLY_SETTLED"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : record.status === "OVERDUE"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {record.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLent ? "Money Lent (Receivable)" : "Money Borrowed (Debt)"}
                {record.counterpartyPhone && ` • ${record.counterpartyPhone}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete this record for ${record.counterpartyName}?`)) {
                  onDeleteRecord(record.id);
                  onClose();
                }
              }}
              title="Delete record"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Financial Progress & Summary Card */}
          <div className="p-5 rounded-3xl bg-slate-50/80 border border-slate-200/90 space-y-4 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Principal
                </span>
                <p className="text-base font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(record.principalAmount)}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Interest
                </span>
                <p className="text-base font-extrabold text-indigo-700 tabular-nums">
                  {record.hasInterest && record.accruedInterest
                    ? `+${formatCurrency(record.accruedInterest)}`
                    : "0% Free"}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Expected
                </span>
                <p className="text-base font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(totalExpected)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">
                  {isLent ? "Recovered" : "Repaid"}:{" "}
                  <strong className="text-emerald-700">{formatCurrency(repaid)}</strong> ({pct}%)
                </span>
                <span className="text-slate-500">
                  Remaining:{" "}
                  <strong className={remaining > 0 ? "text-rose-600" : "text-emerald-600"}>
                    {formatCurrency(remaining)}
                  </strong>
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct === 100
                      ? "bg-emerald-500"
                      : isLent
                      ? "bg-gradient-to-r from-emerald-500 to-indigo-600"
                      : "bg-gradient-to-r from-amber-500 to-indigo-600"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Note & Initial Transaction Link */}
            {(record.description || record.linkedTransactionDescription) && (
              <div className="pt-2 border-t border-slate-200/70 text-xs space-y-1.5">
                {record.description && (
                  <p className="text-slate-600 italic">"{record.description}"</p>
                )}
                {record.linkedTransactionDescription && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Mapped to: <strong>{record.linkedTransactionDescription}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CHECKLIST & REPAYMENT TRACKING */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Repayment Checklist</span>
                </h4>
                <p className="text-xs text-slate-500">
                  {isLent
                    ? "Check off each installment as you receive money back"
                    : "Check off payments as you repay to them"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddInstallment(!showAddInstallment)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
                <button
                  onClick={() => setShowQuickRepay(!showQuickRepay)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer border border-indigo-200"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Quick Repay</span>
                </button>
              </div>
            </div>

            {/* Inline Quick Repay Form */}
            {showQuickRepay && (
              <form
                onSubmit={handleQuickRepaySubmit}
                className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/90 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">Record a Quick Payment</span>
                  <button
                    type="button"
                    onClick={() => setShowQuickRepay(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Repayment amount (₹)"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Notes (e.g. UPI transfer)"
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Confirm Repayment
                </button>
              </form>
            )}

            {/* Inline Add Checklist Form */}
            {showAddInstallment && (
              <form
                onSubmit={handleCreateInstallment}
                className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Add Checklist Milestone</span>
                  <button
                    type="button"
                    onClick={() => setShowAddInstallment(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Title (e.g. Month 4 Return)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Amount (₹)"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Add Milestone to Checklist
                </button>
              </form>
            )}

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {record.installments.map((inst, index) => {
                const isOverdue = !inst.settled && inst.dueDate && new Date(inst.dueDate) < new Date();

                return (
                  <div
                    key={inst.id}
                    className={`p-4 rounded-2xl border transition-all duration-150 ${
                      inst.settled
                        ? "bg-emerald-50/40 border-emerald-200/70"
                        : isOverdue
                        ? "bg-rose-50/40 border-rose-200/80"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Checkbox & Details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(inst)}
                          disabled={busy}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors mt-0.5 cursor-pointer ${
                            inst.settled
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "border-2 border-slate-300 hover:border-indigo-500 bg-white"
                          }`}
                        >
                          {inst.settled && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold ${
                              inst.settled ? "line-through text-slate-400" : "text-slate-900"
                            }`}
                          >
                            {inst.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{inst.dueDate ? inst.dueDate.split("T")[0] : "No date"}</span>
                            </span>
                            {isOverdue && (
                              <span className="font-bold text-rose-600 text-[10px]">Overdue</span>
                            )}
                            {inst.settled && inst.settledDate && (
                              <span className="text-emerald-700 font-semibold text-[10px]">
                                Cleared on {inst.settledDate.split("T")[0]}
                              </span>
                            )}
                          </div>

                          {/* Mapped Transaction Tag */}
                          {inst.linkedTransactionDescription && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold">
                              <Link2 className="w-3 h-3" />
                              <span>{inst.linkedTransactionDescription}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs font-extrabold tabular-nums ${
                            inst.settled ? "text-emerald-700" : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(inst.settled && inst.settledAmount ? inst.settledAmount : inst.amount)}
                        </p>

                        {!inst.settled && (
                          <button
                            type="button"
                            onClick={() => handleOpenTxnPicker(inst.id)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            <span>Map Bank Txn</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Transaction Picker Modal Overlay */}
        {mappingInstallmentId && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Map Bank Transaction</h4>
                  <p className="text-[11px] text-slate-500">
                    Select the transaction corresponding to this repayment
                  </p>
                </div>
                <button
                  onClick={() => setMappingInstallmentId(null)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by merchant or amount..."
                  value={txnSearch}
                  onChange={(e) => handleSearchCandidates(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                {loadingCandidates ? (
                  <div className="p-3 text-center text-xs text-slate-400">Loading...</div>
                ) : candidates.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">No matching transactions</div>
                ) : (
                  candidates.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTxnForInstallment(t)}
                      className="p-2.5 flex items-center justify-between hover:bg-indigo-50/60 cursor-pointer text-xs"
                    >
                      <div className="truncate mr-2">
                        <p className="font-bold text-slate-800 truncate">{t.merchant || t.description}</p>
                        <p className="text-[10px] text-slate-400">{t.transactionDate?.split("T")[0]}</p>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0 tabular-nums">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
