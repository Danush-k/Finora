"use client";

import React, { useState, useEffect } from "react";
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
  Sparkles,
  ArrowRight,
  CreditCard,
  Building2,
  CheckCircle,
} from "lucide-react";

interface InstallmentChecklistDrawerProps {
  record: DebtLentRecord | null;
  onClose: () => void;
  onRecordUpdated: (updated: DebtLentRecord) => void;
  onDeleteRecord: (id: string) => void;
}

interface MappingSession {
  installment?: RepaymentInstallment;
  targetAmount: number;
  title: string;
}

export default function InstallmentChecklistDrawer({
  record,
  onClose,
  onRecordUpdated,
  onDeleteRecord,
}: InstallmentChecklistDrawerProps) {
  // New installment manual inline form
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  // Smart Repayment & Transaction Mapping Dialog Session
  const [mappingSession, setMappingSession] = useState<MappingSession | null>(null);
  const [txnSearch, setTxnSearch] = useState("");
  const [candidates, setCandidates] = useState<Transaction[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  // Repayment parameters
  const [appliedAmount, setAppliedAmount] = useState("");
  const [repaymentNotes, setRepaymentNotes] = useState("");
  const [autoCreateRemainingStep, setAutoCreateRemainingStep] = useState(true);
  const [remainingDueDate, setRemainingDueDate] = useState("");

  const [busy, setBusy] = useState(false);

  // Fetch candidates whenever txnSearch changes in the mapping modal
  useEffect(() => {
    if (mappingSession) {
      const fetchCandidates = async () => {
        try {
          setLoadingCandidates(true);
          const res = await api.getDebtLentCandidates(txnSearch.trim() || undefined, 20);
          setCandidates(res);
        } catch (e) {
          console.error("Failed to load candidate transactions", e);
        } finally {
          setLoadingCandidates(false);
        }
      };
      const debounce = setTimeout(fetchCandidates, 250);
      return () => clearTimeout(debounce);
    }
  }, [mappingSession, txnSearch]);

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

  // Open Smart Repayment Mapping for a specific installment
  const handleOpenInstallmentMapping = (inst: RepaymentInstallment) => {
    setMappingSession({
      installment: inst,
      targetAmount: inst.amount,
      title: inst.title,
    });
    setSelectedTxn(null);
    setAppliedAmount(inst.amount.toString());
    setTxnSearch(inst.amount.toString());
    setRepaymentNotes("");
    setAutoCreateRemainingStep(true);

    const nextMo = new Date();
    nextMo.setMonth(nextMo.getMonth() + 1);
    setRemainingDueDate(nextMo.toISOString().split("T")[0]);
  };

  // Open Smart Repayment Mapping for general balance
  const handleOpenGeneralRepayMapping = () => {
    const targetAmt = remaining > 0 ? remaining : record.principalAmount;
    setMappingSession({
      targetAmount: targetAmt,
      title: "Repayment Settlement",
    });
    setSelectedTxn(null);
    setAppliedAmount(targetAmt.toString());
    setTxnSearch(targetAmt > 0 ? targetAmt.toString() : "");
    setRepaymentNotes("");
    setAutoCreateRemainingStep(true);

    const nextMo = new Date();
    nextMo.setMonth(nextMo.getMonth() + 1);
    setRemainingDueDate(nextMo.toISOString().split("T")[0]);
  };

  // When a candidate transaction is picked
  const handleSelectCandidateTxn = (txn: Transaction) => {
    setSelectedTxn(txn);
    // Auto-detect amount from bank transaction!
    setAppliedAmount(txn.amount.toString());
  };

  // Confirm and Apply Smart Repayment
  const handleConfirmMapping = async () => {
    if (!mappingSession) return;
    const appliedNum = parseFloat(appliedAmount) || (selectedTxn ? selectedTxn.amount : 0);
    if (appliedNum <= 0) return;

    try {
      setBusy(true);
      const targetNum = mappingSession.targetAmount;
      const remainingAmountAfter = Math.max(0, targetNum - appliedNum);
      const txnDesc = selectedTxn
        ? `${selectedTxn.bank || "Bank"} - ${selectedTxn.merchant || selectedTxn.description} (${formatCurrency(appliedNum)})`
        : undefined;

      let updatedRecord: DebtLentRecord;

      if (mappingSession.installment) {
        // Mapping a specific installment
        updatedRecord = await api.toggleInstallment(record.id, mappingSession.installment.id, {
          settled: true,
          settledAmount: appliedNum,
          settledDate: selectedTxn?.transactionDate || new Date().toISOString(),
          linkedTransactionId: selectedTxn?.id,
          linkedTransactionDescription: txnDesc,
          notes: repaymentNotes.trim() || undefined,
        });

        // If partial payment and user wants auto-created remaining milestone
        if (appliedNum < targetNum && autoCreateRemainingStep && remainingAmountAfter > 0) {
          const newInst: RepaymentInstallment = {
            id: "",
            title: `Remaining: ${mappingSession.installment.title}`,
            amount: remainingAmountAfter,
            dueDate: remainingDueDate ? new Date(remainingDueDate).toISOString() : new Date().toISOString(),
            settled: false,
            settledAmount: 0,
          };
          updatedRecord = await api.addInstallment(record.id, newInst);
        }
      } else {
        // General Quick Repayment
        updatedRecord = await api.recordQuickRepayment(
          record.id,
          appliedNum,
          selectedTxn?.id,
          txnDesc,
          repaymentNotes.trim() || undefined
        );

        // If partial and auto-create enabled
        if (appliedNum < targetNum && autoCreateRemainingStep && remainingAmountAfter > 0) {
          const newInst: RepaymentInstallment = {
            id: "",
            title: `Remaining Balance Milestone`,
            amount: remainingAmountAfter,
            dueDate: remainingDueDate ? new Date(remainingDueDate).toISOString() : new Date().toISOString(),
            settled: false,
            settledAmount: 0,
          };
          updatedRecord = await api.addInstallment(record.id, newInst);
        }
      }

      onRecordUpdated(updatedRecord);
      setMappingSession(null);
      setSelectedTxn(null);
    } catch (e) {
      console.error("Failed to map repayment transaction", e);
    } finally {
      setBusy(false);
    }
  };

  // Add new checklist checkpoint manually
  const handleCreateInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newAmount) || 0;
    if (amt <= 0) return;

    try {
      setBusy(true);
      const newInst: RepaymentInstallment = {
        id: "",
        title: newTitle.trim() || `Milestone #${record.installments.length + 1}`,
        amount: amt,
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : new Date().toISOString(),
        settled: false,
        settledAmount: 0,
      };

      const updated = await api.addInstallment(record.id, newInst);
      onRecordUpdated(updated);
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

  // Calculations for active modal preview
  const activeTargetNum = mappingSession ? mappingSession.targetAmount : 0;
  const activeAppliedNum = parseFloat(appliedAmount) || (selectedTxn ? selectedTxn.amount : 0) || 0;
  const activeRemainingNum = Math.max(0, activeTargetNum - activeAppliedNum);
  const activeSurplusNum = activeAppliedNum > activeTargetNum ? activeAppliedNum - activeTargetNum : 0;

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
                if (
                  confirm(`Are you sure you want to delete this record for ${record.counterpartyName}?`)
                ) {
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
                  <strong className={remaining > 0 ? (isLent ? "text-emerald-700" : "text-rose-600") : "text-emerald-600"}>
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
            {(record.description || record.linkedTransactionDescription || record.amountDifferenceReason) && (
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
                {record.amountDifferenceReason && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Difference reason: <strong>{record.amountDifferenceReason}</strong></span>
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
                    ? "Check off installments as money is received back"
                    : "Check off installments as money is repaid"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddInstallment(!showAddInstallment)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
                <button
                  onClick={handleOpenGeneralRepayMapping}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer border border-indigo-200"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Record Repayment</span>
                </button>
              </div>
            </div>

            {/* Inline Add Checklist Form */}
            {showAddInstallment && (
              <form
                onSubmit={handleCreateInstallment}
                className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Add Milestone Step</span>
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
                    placeholder="Title (e.g. Month 2 Return)"
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
              {record.installments.map((inst) => {
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
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
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
                            onClick={() => handleOpenInstallmentMapping(inst)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Link2 className="w-3 h-3" />
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

        {/* SMART REPAYMENT & TRANSACTION MAPPING MODAL OVERLAY */}
        {mappingSession && (
          <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-4 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Map Bank Repayment Transaction</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Repay from any account • Auto-detect amount & calculate remaining balance
                  </p>
                </div>
                <button
                  onClick={() => setMappingSession(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Banner */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                    Target Milestone
                  </span>
                  <p className="font-extrabold text-slate-900">{mappingSession.title}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Target Due
                  </span>
                  <p className="text-sm font-extrabold text-indigo-900 tabular-nums">
                    {formatCurrency(activeTargetNum)}
                  </p>
                </div>
              </div>

              {/* Amount Proximity Search */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search amount (e.g. 51000), merchant, or bank..."
                    value={txnSearch}
                    onChange={(e) => setTxnSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Quick chip to search exact installment amount */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  <span className="text-slate-400 shrink-0">Suggestions:</span>
                  <button
                    type="button"
                    onClick={() => setTxnSearch(activeTargetNum.toString())}
                    className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition-colors cursor-pointer shrink-0"
                  >
                    Near {formatCurrency(activeTargetNum)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxnSearch("")}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    View All Accounts
                  </button>
                </div>
              </div>

              {/* Candidate Transactions List from ANY bank account */}
              <div className="flex-1 overflow-y-auto max-h-48 divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-2xs">
                {loadingCandidates ? (
                  <div className="p-4 text-center text-xs text-slate-400">Loading bank transactions...</div>
                ) : candidates.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No matching transactions found near "{txnSearch}". Try another amount or merchant.
                  </div>
                ) : (
                  candidates.map((t) => {
                    const queryNum = parseFloat(txnSearch.replace(/[^0-9.]/g, "")) || activeTargetNum || 0;
                    const diff = queryNum > 0 ? Math.abs(t.amount - queryNum) : null;
                    const isExact = diff !== null && diff < 0.01;
                    const isPicked = selectedTxn?.id === t.id;

                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectCandidateTxn(t)}
                        className={`p-3 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                          isPicked
                            ? "bg-indigo-50 border-l-4 border-indigo-600"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 truncate">
                              {t.merchant || t.description}
                            </p>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {t.bank || "Bank"} {t.accountNumber ? `••${t.accountNumber.slice(-4)}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span>{t.transactionDate?.split("T")[0]}</span>
                            <span>•</span>
                            <span className={t.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}>
                              {t.transactionType === "EXPENSE" ? "Debit (Outflow)" : "Credit (Inflow)"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-slate-900 tabular-nums">
                            {formatCurrency(t.amount)}
                          </p>
                          {diff !== null && queryNum > 0 && (
                            <div className="mt-0.5">
                              {isExact ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  ✓ Exact Match
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                  {t.amount > queryNum ? `+${formatCurrency(diff)}` : `-${formatCurrency(diff)}`} nearby
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* AUTO-DETECTION & REMAINING CALCULATION BANNER */}
              {selectedTxn ? (
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Detected Transaction
                        </span>
                        <strong className="text-slate-100">
                          {selectedTxn.bank || "Bank"} •••• {selectedTxn.accountNumber?.slice(-4) || ""}
                        </strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Detected Amount
                      </span>
                      <strong className="text-emerald-400 text-sm tabular-nums">
                        {formatCurrency(selectedTxn.amount)}
                      </strong>
                    </div>
                  </div>

                  {/* Remaining Breakdown Calculation */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
                    <div className="p-2 rounded-xl bg-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">Milestone Target</span>
                      <span className="font-extrabold text-slate-200 tabular-nums">
                        {formatCurrency(activeTargetNum)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">Applied Payment</span>
                      <span className="font-extrabold text-emerald-400 tabular-nums">
                        -{formatCurrency(activeAppliedNum)}
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded-xl ${
                        activeRemainingNum === 0
                          ? "bg-emerald-950/60 border border-emerald-500/40"
                          : "bg-amber-950/60 border border-amber-500/40"
                      }`}
                    >
                      <span className="text-[10px] text-slate-300 block">Remaining to Repay</span>
                      <span
                        className={`font-extrabold tabular-nums ${
                          activeRemainingNum === 0 ? "text-emerald-300" : "text-amber-300"
                        }`}
                      >
                        {formatCurrency(activeRemainingNum)}
                      </span>
                    </div>
                  </div>

                  {/* Feedback / Status guidance */}
                  {activeAppliedNum >= activeTargetNum ? (
                    <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-[11px] text-emerald-300 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        ✓ This payment fully clears this milestone! Remaining balance: <strong>₹0.00</strong>
                        {activeSurplusNum > 0 && ` (Surplus of +${formatCurrency(activeSurplusNum)} reduces total balance)`}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-800/60 text-[11px] text-amber-300 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Partial Payment detected! <strong>{formatCurrency(activeRemainingNum)}</strong> remains to be repaid.
                        </span>
                      </div>

                      {/* Auto-create remaining installment option */}
                      <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoCreateRemainingStep}
                            onChange={(e) => setAutoCreateRemainingStep(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-semibold text-slate-200">
                            Auto-create next checklist step for remaining {formatCurrency(activeRemainingNum)}
                          </span>
                        </label>

                        {autoCreateRemainingStep && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] text-slate-400">Target due date:</span>
                            <input
                              type="date"
                              value={remainingDueDate}
                              onChange={(e) => setRemainingDueDate(e.target.value)}
                              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  Select a bank transaction above. The app will auto-detect the payment amount and calculate how much remains to be repaid.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMappingSession(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !selectedTxn || activeAppliedNum <= 0}
                  onClick={handleConfirmMapping}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy
                    ? "Applying Payment..."
                    : `Confirm Payment of ${formatCurrency(activeAppliedNum)} (Remaining: ${formatCurrency(activeRemainingNum)})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
