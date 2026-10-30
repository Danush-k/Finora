"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  DebtLentRecord,
  DebtLentRequest,
  DebtLentType,
  InterestPeriodType,
  Transaction,
} from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  X,
  PlusCircle,
  Link2,
  Calendar,
  Percent,
  Clock,
  User,
  Phone,
  FileText,
  Search,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  ShieldAlert,
} from "lucide-react";

interface DebtLentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DebtLentRequest) => Promise<void>;
  initialData?: DebtLentRecord | null;
  defaultType?: DebtLentType;
}

export default function DebtLentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultType = "LENT",
}: DebtLentModalProps) {
  const [type, setType] = useState<DebtLentType>(defaultType);
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyPhone, setCounterpartyPhone] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Interest Settings
  const [hasInterest, setHasInterest] = useState(false);
  const [interestRate, setInterestRate] = useState("12");
  const [interestPeriodType, setInterestPeriodType] =
    useState<InterestPeriodType>("YEARLY");
  const [tenureMonths, setTenureMonths] = useState("3");

  // Linked Transaction Picker
  const [showTxnPicker, setShowTxnPicker] = useState(false);
  const [txnSearch, setTxnSearch] = useState("");
  const [candidateTxns, setCandidateTxns] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setCounterpartyName(initialData.counterpartyName);
      setCounterpartyPhone(initialData.counterpartyPhone || "");
      setPrincipalAmount(initialData.principalAmount.toString());
      setDescription(initialData.description || "");
      setStartDate(initialData.startDate.split("T")[0]);
      setDueDate(initialData.dueDate ? initialData.dueDate.split("T")[0] : "");
      setHasInterest(initialData.hasInterest);
      setInterestRate(initialData.interestRate ? initialData.interestRate.toString() : "12");
      setInterestPeriodType(initialData.interestPeriodType || "YEARLY");
      setTenureMonths(initialData.tenureMonths ? initialData.tenureMonths.toString() : "3");
      if (initialData.linkedTransactionId) {
        setSelectedTxn({
          id: initialData.linkedTransactionId,
          description: initialData.linkedTransactionDescription || "",
          amount: initialData.linkedTransactionAmount || 0,
        } as Transaction);
      } else {
        setSelectedTxn(null);
      }
    } else {
      setType(defaultType);
      setCounterpartyName("");
      setCounterpartyPhone("");
      setPrincipalAmount("");
      setDescription("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setHasInterest(false);
      setInterestRate("12");
      setInterestPeriodType("YEARLY");
      setTenureMonths("3");
      setSelectedTxn(null);
      setError(null);
    }
  }, [initialData, defaultType, isOpen]);

  // Fetch candidate transactions for linking
  useEffect(() => {
    if (showTxnPicker) {
      const fetchCandidates = async () => {
        try {
          setLoadingTxns(true);
          const res = await api.getDebtLentCandidates(txnSearch.trim() || undefined, 15);
          setCandidateTxns(res);
        } catch (e) {
          console.error("Failed to load candidate transactions", e);
        } finally {
          setLoadingTxns(false);
        }
      };
      const debounce = setTimeout(fetchCandidates, 300);
      return () => clearTimeout(debounce);
    }
  }, [showTxnPicker, txnSearch]);

  if (!isOpen) return null;

  // Real-time calculation of interest & expected total
  const principal = parseFloat(principalAmount) || 0;
  const rate = parseFloat(interestRate) || 0;
  const months = parseInt(tenureMonths, 10) || 1;

  let accruedInterest = 0;
  if (hasInterest && principal > 0 && rate > 0) {
    if (interestPeriodType === "MONTHLY") {
      accruedInterest = principal * (rate / 100) * months;
    } else {
      // Yearly
      accruedInterest = principal * (rate / 100) * (months / 12);
    }
  }
  const totalExpected = principal + accruedInterest;
  const monthlyInstallment = months > 0 ? totalExpected / months : totalExpected;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterpartyName.trim()) {
      setError("Please provide the person or entity name");
      return;
    }
    if (principal <= 0) {
      setError("Please enter a valid principal amount greater than 0");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: DebtLentRequest = {
        type,
        counterpartyName: counterpartyName.trim(),
        counterpartyPhone: counterpartyPhone.trim() || undefined,
        principalAmount: principal,
        description: description.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        linkedTransactionId: selectedTxn?.id,
        linkedTransactionDescription: selectedTxn
          ? `${selectedTxn.merchant || selectedTxn.description} (${formatCurrency(selectedTxn.amount)})`
          : undefined,
        linkedTransactionAmount: selectedTxn?.amount,
        hasInterest,
        interestRate: hasInterest ? rate : 0,
        interestPeriodType: hasInterest ? interestPeriodType : "YEARLY",
        tenureMonths: months,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs border ${
                type === "LENT"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-amber-50 border-amber-200 text-amber-600"
              }`}
            >
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {initialData ? "Edit Record" : "New Debt or Lent Entry"}
              </h3>
              <p className="text-xs text-slate-500">
                Track money lent to others or debts owed with interest and installments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Segmented Type Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setType("LENT")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === "LENT"
                  ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span>I Lent Money (Receivable)</span>
            </button>
            <button
              type="button"
              onClick={() => setType("DEBT")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                type === "DEBT"
                  ? "bg-white text-amber-700 shadow-sm border border-amber-100"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-amber-600" />
              <span>I Borrowed (Debt / Payable)</span>
            </button>
          </div>

          {/* Counterparty & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{type === "LENT" ? "Lent To (Person / Entity)" : "Borrowed From"} *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma, Landlord, Priya"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone / Contact (Optional)</span>
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={counterpartyPhone}
                onChange={(e) => setCounterpartyPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Amount & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Principal Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="10000.00"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Purpose / Note</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Laptop repair, College fee"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Start Date & Target Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date {type === "LENT" ? "Lent" : "Borrowed"} *</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Return Date (Due Date)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Link with an existing transaction */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Link Bank Payment Transaction
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTxnPicker(!showTxnPicker)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                {selectedTxn ? "Change Link" : showTxnPicker ? "Cancel Picker" : "+ Select Transaction"}
              </button>
            </div>

            {selectedTxn ? (
              <div className="p-3.5 rounded-xl bg-white border border-indigo-200 flex items-center justify-between text-xs shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{selectedTxn.merchant || selectedTxn.description}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {selectedTxn.bank} {selectedTxn.accountNumber ? `•••• ${selectedTxn.accountNumber.slice(-4)}` : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Linked Bank Payment • <strong className="text-slate-700">{formatCurrency(selectedTxn.amount)}</strong>
                    {selectedTxn.transactionDate && ` • ${selectedTxn.transactionDate.split("T")[0]}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  title="Remove linked transaction"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : showTxnPicker ? (
              <div className="space-y-2.5 pt-2 border-t border-slate-200/80">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search amount (e.g. 51000), merchant, or account..."
                    value={txnSearch}
                    onChange={(e) => setTxnSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                {/* Quick chip for current principal amount */}
                {principal > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Quick search:</span>
                    <button
                      type="button"
                      onClick={() => setTxnSearch(principal.toString())}
                      className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition-colors cursor-pointer"
                    >
                      Find transactions near {formatCurrency(principal)}
                    </button>
                  </div>
                )}

                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white shadow-2xs">
                  {loadingTxns ? (
                    <div className="p-4 text-center text-xs text-slate-400">Loading candidate transactions...</div>
                  ) : candidateTxns.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching transactions found near "{txnSearch}". Try another amount or merchant.
                    </div>
                  ) : (
                    candidateTxns.map((txn) => {
                      // Proximity calculation if search contains number
                      const queryNum = parseFloat(txnSearch.replace(/[^0-9.]/g, "")) || principal || 0;
                      const diff = queryNum > 0 ? Math.abs(txn.amount - queryNum) : null;
                      const isExact = diff !== null && diff < 0.01;

                      return (
                        <div
                          key={txn.id}
                          onClick={() => {
                            setSelectedTxn(txn);
                            if (!principalAmount) setPrincipalAmount(txn.amount.toString());
                            if (!description) setDescription(txn.description || txn.merchant);
                            setShowTxnPicker(false);
                          }}
                          className="p-3 flex items-center justify-between hover:bg-indigo-50/60 cursor-pointer text-xs transition-colors"
                        >
                          <div className="truncate mr-2">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-800 truncate">{txn.merchant || txn.description}</p>
                              {txn.bank && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {txn.bank} {txn.accountNumber ? `••${txn.accountNumber.slice(-4)}` : ""}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              <span>{txn.transactionDate?.split("T")[0]}</span>
                              <span>•</span>
                              <span className={txn.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"}>
                                {txn.transactionType === "EXPENSE" ? "Debit" : "Credit"}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-extrabold text-slate-900 tabular-nums">
                              {formatCurrency(txn.amount)}
                            </p>
                            {diff !== null && queryNum > 0 && (
                              <div className="mt-0.5">
                                {isExact ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    ✓ Exact Match
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                    {txn.amount > queryNum ? `+${formatCurrency(diff)}` : `-${formatCurrency(diff)}`} nearby
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
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Map the exact bank payment sent when you lent the money, or received when you borrowed.
              </p>
            )}
          </div>

          {/* Interest & Period Settings */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-4 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Interest & Return Period</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHasInterest(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !hasInterest
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  0% (Friends & Family)
                </button>
                <button
                  type="button"
                  onClick={() => setHasInterest(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    hasInterest
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  With Interest
                </button>
              </div>
            </div>

            {hasInterest && (
              <div className="space-y-3 pt-3 border-t border-slate-200/80 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Period Type
                    </label>
                    <select
                      value={interestPeriodType}
                      onChange={(e) => setInterestPeriodType(e.target.value as InterestPeriodType)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="YEARLY">Per Annum (% p.a.)</option>
                      <option value="MONTHLY">Per Month (% p.m.)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tenure (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Calculation Callout */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500">Accrued Interest: </span>
                    <strong className="text-indigo-900">{formatCurrency(accruedInterest)}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Total Expected: </span>
                    <strong className="text-indigo-900">{formatCurrency(totalExpected)}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">{months} Installments of: </span>
                    <strong className="text-emerald-700">{formatCurrency(monthlyInstallment)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Saving..." : initialData ? "Update Record" : type === "LENT" ? "Save Lent Record" : "Save Debt Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
