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
  AlertTriangle,
  Plus,
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
  const [hasInstallmentSchedule, setHasInstallmentSchedule] = useState(false);
  const [tenureMonths, setTenureMonths] = useState("1");

  // Linked Bank Transactions (Supports 1 or multiple statements mapped)
  const [showTxnPicker, setShowTxnPicker] = useState(false);
  const [txnSearch, setTxnSearch] = useState("");
  const [candidateTxns, setCandidateTxns] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [selectedTxns, setSelectedTxns] = useState<Transaction[]>([]);

  // Discrepancy reason when principal differs from bank statement
  const [amountDifferenceReason, setAmountDifferenceReason] = useState("");
  const [isNameAutoFetched, setIsNameAutoFetched] = useState(false);

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
      const initTenure = initialData.tenureMonths || 1;
      setHasInstallmentSchedule(initTenure > 1);
      setTenureMonths(initTenure > 1 ? initTenure.toString() : "1");
      setAmountDifferenceReason(initialData.amountDifferenceReason || "");

      if (initialData.linkedTransactionId) {
        setSelectedTxns([
          {
            id: initialData.linkedTransactionId,
            description: initialData.linkedTransactionDescription || "",
            amount: initialData.linkedTransactionAmount || 0,
            transactionDate: initialData.startDate,
          } as Transaction,
        ]);
      } else {
        setSelectedTxns([]);
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
      setHasInstallmentSchedule(false);
      setTenureMonths("1");
      setSelectedTxns([]);
      setAmountDifferenceReason("");
      setError(null);
    }
  }, [initialData, defaultType, isOpen]);

  // Fetch candidate transactions for linking
  useEffect(() => {
    if (showTxnPicker) {
      const fetchCandidates = async () => {
        try {
          setLoadingTxns(true);
          const res = await api.getDebtLentCandidates(txnSearch.trim() || undefined, 20);
          setCandidateTxns(res);
        } catch (e) {
          console.error("Failed to load candidate transactions", e);
        } finally {
          setLoadingTxns(false);
        }
      };
      const debounce = setTimeout(fetchCandidates, 250);
      return () => clearTimeout(debounce);
    }
  }, [showTxnPicker, txnSearch]);

  if (!isOpen) return null;

  // Real-time calculation of interest & expected total
  const principal = parseFloat(principalAmount) || 0;
  const rate = parseFloat(interestRate) || 0;
  const isPeriodic = hasInterest || hasInstallmentSchedule;
  const months = isPeriodic ? parseInt(tenureMonths, 10) || 1 : 1;

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
  const monthlyInstallment = months > 1 ? totalExpected / months : totalExpected;

  // Total linked bank statements amount
  const totalLinkedAmount = selectedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
  const amountDiff = selectedTxns.length > 0 && principal > 0 ? principal - totalLinkedAmount : 0;
  const hasAmountDiscrepancy = selectedTxns.length > 0 && principal > 0 && Math.abs(amountDiff) >= 0.01;

  // Handling statement selection
  const handleSelectCandidateTxn = (txn: Transaction) => {
    const isAlreadySelected = selectedTxns.some((t) => t.id === txn.id);
    let updatedTxns: Transaction[];

    if (isAlreadySelected) {
      updatedTxns = selectedTxns.filter((t) => t.id !== txn.id);
    } else {
      updatedTxns = [...selectedTxns, txn];
    }
    setSelectedTxns(updatedTxns);

    // 1. AUTO-FETCH NAME FROM MAPPED STATEMENT!
    const cleanMerchant = txn.merchant
      ? txn.merchant.replace(/^(Mr|Ms|Mrs|Dr)\.?\s+/i, "").trim() || txn.merchant
      : "";
    if (cleanMerchant && (!counterpartyName.trim() || isNameAutoFetched)) {
      setCounterpartyName(cleanMerchant);
      setIsNameAutoFetched(true);
    }

    // 2. AUTO-FETCH PHONE IF PRESENT IN TRANSACTION INFO
    if (!counterpartyPhone.trim()) {
      const phoneMatch = `${txn.description || ""} ${txn.merchant || ""} ${txn.referenceNumber || ""}`.match(
        /\b([6-9]\d{9})\b/
      );
      if (phoneMatch) {
        setCounterpartyPhone(phoneMatch[1]);
      }
    }

    // 3. AUTO-FETCH DATE LENT FROM MAPPED STATEMENT!
    if (txn.transactionDate) {
      setStartDate(txn.transactionDate.split("T")[0]);
    }

    // 4. AUTO-FETCH PURPOSE / NOTE
    if (!description || description.startsWith("EXPENSE via") || description.startsWith("INCOME via")) {
      setDescription(txn.description || `Payment to ${cleanMerchant}`);
    }

    // 5. AUTO-FETCH PRINCIPAL AMOUNT
    const newTotal = updatedTxns.reduce((sum, t) => sum + t.amount, 0);
    const prevTotal = selectedTxns.reduce((sum, t) => sum + t.amount, 0);
    if (!principalAmount || parseFloat(principalAmount) === prevTotal || parseFloat(principalAmount) === 0) {
      setPrincipalAmount(newTotal > 0 ? newTotal.toString() : "");
    }

    setShowTxnPicker(false);
  };

  const handleRemoveTxn = (id: string) => {
    const updated = selectedTxns.filter((t) => t.id !== id);
    setSelectedTxns(updated);
    if (updated.length > 0 && updated[0].transactionDate) {
      setStartDate(updated[0].transactionDate.split("T")[0]);
    }
  };

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

    // If there is an amount difference, prompt for reason
    if (hasAmountDiscrepancy && !amountDifferenceReason.trim()) {
      setError(
        `Principal (${formatCurrency(principal)}) differs from mapped bank statement (${formatCurrency(
          totalLinkedAmount
        )}) by ${formatCurrency(
          Math.abs(amountDiff)
        )}. Please provide the reason below (e.g. extra in cash).`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const descList = selectedTxns.map(
        (t) => `${t.bank || "Bank"} - ${t.merchant || t.description} (${formatCurrency(t.amount)})`
      );

      const payload: DebtLentRequest = {
        type,
        counterpartyName: counterpartyName.trim(),
        counterpartyPhone: counterpartyPhone.trim() || undefined,
        principalAmount: principal,
        description: description.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        linkedTransactionId: selectedTxns[0]?.id,
        linkedTransactionDescription: descList.length > 0 ? descList.join(", ") : undefined,
        linkedTransactionAmount: totalLinkedAmount > 0 ? totalLinkedAmount : undefined,
        linkedTransactionIds: selectedTxns.map((t) => t.id),
        amountDifferenceReason: hasAmountDiscrepancy ? amountDifferenceReason.trim() : undefined,
        hasInterest,
        interestRate: hasInterest ? rate : 0,
        interestPeriodType: hasInterest ? interestPeriodType : "YEARLY",
        tenureMonths: isPeriodic && months > 1 ? months : 1,
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
                {initialData ? "Edit Record" : type === "LENT" ? "New Lent Entry" : "New Debt Entry"}
              </h3>
              <p className="text-xs text-slate-500">
                Track money {type === "LENT" ? "lent to others" : "borrowed from others"} with auto-fetched dates & bank statements
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

          {/* Counterparty Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{type === "LENT" ? "Lent To (Person / Entity) *" : "Borrowed From *"}</span>
                </label>
                {selectedTxns.length === 1 && selectedTxns[0].merchant && counterpartyName !== selectedTxns[0].merchant && (
                  <button
                    type="button"
                    onClick={() => {
                      const clean =
                        selectedTxns[0].merchant.replace(/^(Mr|Ms|Mrs|Dr)\.?\s+/i, "").trim() ||
                        selectedTxns[0].merchant;
                      setCounterpartyName(clean);
                      setIsNameAutoFetched(true);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    Use "{selectedTxns[0].merchant}"
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="e.g. AYR Technologies, Dharani, Priya"
                value={counterpartyName}
                onChange={(e) => {
                  setCounterpartyName(e.target.value);
                  setIsNameAutoFetched(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs font-semibold"
              />

              {selectedTxns.length > 1 && (
                <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto text-xs pb-0.5">
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">
                    Statements:
                  </span>
                  {selectedTxns.map((t) => {
                    const clean =
                      t.merchant.replace(/^(Mr|Ms|Mrs|Dr)\.?\s+/i, "").trim() || t.merchant;
                    const isCurrent = counterpartyName === clean;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setCounterpartyName(clean);
                          setIsNameAutoFetched(true);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {clean}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone / Contact (Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={counterpartyPhone}
                onChange={(e) => setCounterpartyPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Principal Amount & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Principal Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 51490"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-bold focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Purpose / Note</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ASUS Laptop, College fee"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          {/* DISCREPANCY REASON PROMPT (Clean neutral styling, zero emojis) */}
          {hasAmountDiscrepancy && (
            <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/80 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Amount Difference Note</span>
                </div>
                <span className="text-[11px] font-bold tabular-nums text-slate-600">
                  Statement: {formatCurrency(totalLinkedAmount)} · Principal: {formatCurrency(principal)}{" "}
                  <span className={amountDiff > 0 ? "text-amber-700" : "text-rose-700"}>
                    ({amountDiff > 0 ? `+${formatCurrency(amountDiff)}` : `-${formatCurrency(Math.abs(amountDiff))}`})
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {amountDiff > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setAmountDifferenceReason(`Paid ${formatCurrency(amountDiff)} extra in cash`)
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        amountDifferenceReason === `Paid ${formatCurrency(amountDiff)} extra in cash`
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      Paid extra in cash ({formatCurrency(amountDiff)})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAmountDifferenceReason("Bank transfer partial, remaining in cash")
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        amountDifferenceReason === "Bank transfer partial, remaining in cash"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      Partial transfer, rest in cash
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAmountDifferenceReason("Additional transfer from another account")
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        amountDifferenceReason === "Additional transfer from another account"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      From another account
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountDifferenceReason("Rounded off")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        amountDifferenceReason === "Rounded off"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      Rounded off
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setAmountDifferenceReason("Statement included other personal expenses")
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        amountDifferenceReason === "Statement included other personal expenses"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      Statement included personal expenses
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAmountDifferenceReason("Adjusted after partial discount or concession")
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        amountDifferenceReason === "Adjusted after partial discount or concession"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      Partial discount / concession
                    </button>
                  </>
                )}
              </div>

              {/* Editable reason input */}
              <input
                type="text"
                required={hasAmountDiscrepancy}
                placeholder="Reason for difference (e.g. Paid ₹1,510 extra in cash)"
                value={amountDifferenceReason}
                onChange={(e) => setAmountDifferenceReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          )}

          {/* Start Date & Target Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date {type === "LENT" ? "Lent" : "Borrowed"} *</span>
                </label>
                {selectedTxns.length === 1 && selectedTxns[0].transactionDate && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Statement date: {selectedTxns[0].transactionDate.split("T")[0]}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
              />

              {/* DATE TOGGLE HELPER */}
              {selectedTxns.length === 1 && selectedTxns[0].transactionDate && (
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>From statement: {selectedTxns[0].transactionDate.split("T")[0]}</span>
                  {startDate !== selectedTxns[0].transactionDate.split("T")[0] ? (
                    <button
                      type="button"
                      onClick={() => setStartDate(selectedTxns[0].transactionDate.split("T")[0])}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Reset to Statement Date
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStartDate(new Date().toISOString().split("T")[0])}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Set to Today
                    </button>
                  )}
                </div>
              )}

              {selectedTxns.length > 1 && (
                <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto text-xs pb-0.5">
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">
                    Dates:
                  </span>
                  {selectedTxns.map((t, idx) => {
                    const dt = t.transactionDate?.split("T")[0];
                    if (!dt) return null;
                    const isCurrent = startDate === dt;
                    return (
                      <button
                        key={t.id || idx}
                        type="button"
                        onClick={() => setStartDate(dt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {dt} ({t.bank || t.merchant})
                      </button>
                    );
                  })}
                </div>
              )}
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

          {/* LINK BANK PAYMENT TRANSACTION (Supports 1 or multiple statements) */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Link Bank Payment Transaction(s)
                </span>
                {selectedTxns.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                    {selectedTxns.length} Mapped
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowTxnPicker(!showTxnPicker)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
              >
                {showTxnPicker ? (
                  "Cancel Picker"
                ) : selectedTxns.length > 0 ? (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>Link Another Statement</span>
                  </>
                ) : (
                  "+ Select Transaction"
                )}
              </button>
            </div>

            {/* List of mapped statements */}
            {selectedTxns.length > 0 && (
              <div className="space-y-2">
                {selectedTxns.map((txn) => (
                  <div
                    key={txn.id}
                    className="p-3 rounded-xl bg-white border border-indigo-200 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{txn.merchant || txn.description}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {txn.bank} {txn.accountNumber ? `•••• ${txn.accountNumber.slice(-4)}` : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Linked Bank Payment •{" "}
                        <strong className="text-slate-700">{formatCurrency(txn.amount)}</strong>
                        {txn.transactionDate && ` • ${txn.transactionDate.split("T")[0]}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTxn(txn.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Remove statement"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {selectedTxns.length > 1 && (
                  <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span>Total Mapped from Bank Statements:</span>
                    <span>{formatCurrency(totalLinkedAmount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Picker Dropdown */}
            {showTxnPicker && (
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
                      const queryNum = parseFloat(txnSearch.replace(/[^0-9.]/g, "")) || principal || 0;
                      const diff = queryNum > 0 ? Math.abs(txn.amount - queryNum) : null;
                      const isExact = diff !== null && diff < 0.01;
                      const isAlreadyLinked = selectedTxns.some((t) => t.id === txn.id);

                      return (
                        <div
                          key={txn.id}
                          onClick={() => handleSelectCandidateTxn(txn)}
                          className={`p-3 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                            isAlreadyLinked ? "bg-indigo-50/80 border-l-4 border-indigo-600" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-800 truncate">{txn.merchant || txn.description}</p>
                              {txn.bank && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {txn.bank} {txn.accountNumber ? `••${txn.accountNumber.slice(-4)}` : ""}
                                </span>
                              )}
                              {isAlreadyLinked && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                                  Linked
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
            )}

            {selectedTxns.length === 0 && !showTxnPicker && (
              <p className="text-[11px] text-slate-500">
                Map the bank payment sent when you lent the money, or received when you borrowed. The Date Lent will be automatically fetched!
              </p>
            )}
          </div>

          {/* Interest & Return Period Settings */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-4 bg-slate-50/50">
            {/* Interest Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Interest</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHasInterest(false)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !hasInterest
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  0% Free
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasInterest(true);
                    setHasInstallmentSchedule(true);
                    if (tenureMonths === "1" || !tenureMonths) setTenureMonths("3");
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    hasInterest
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  With Interest
                </button>
              </div>
            </div>

            {/* Repayment Terms Schedule Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800">Repayment Terms</span>
                  <span className="text-[10px] text-slate-400 block">
                    {hasInstallmentSchedule ? "Fixed monthly installments" : "Open flexible balance (repay anytime)"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHasInstallmentSchedule(false)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !hasInstallmentSchedule
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Open Balance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasInstallmentSchedule(true);
                    if (tenureMonths === "1" || !tenureMonths) setTenureMonths("3");
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    hasInstallmentSchedule
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  Monthly Installments
                </button>
              </div>
            </div>

            {/* Terms input fields (only shown if interest or installments enabled) */}
            {(hasInterest || hasInstallmentSchedule) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                {hasInterest && (
                  <>
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
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="MONTHLY">Per Month (% p.m.)</option>
                        <option value="YEARLY">Per Year (% p.a.)</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="120"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Live Calculation Preview Banner */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">
                  {hasInterest ? "Accrued Interest:" : "Interest:"}
                </span>
                <span className="font-extrabold text-indigo-700 tabular-nums">
                  {hasInterest ? formatCurrency(accruedInterest) : "0% Free"}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">Total Expected:</span>
                <span className="font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(totalExpected)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  {isPeriodic && months > 1 ? `${months} Installments of:` : "Repayment:"}
                </span>
                <span className="font-extrabold text-emerald-700 tabular-nums">
                  {isPeriodic && months > 1 ? formatCurrency(monthlyInstallment) : "Open Flexible Balance"}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Saving..." : initialData ? "Save Changes" : `Save ${type === "LENT" ? "Lent" : "Debt"} Record`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
