"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Transaction, TransactionRequest, TransactionType, PaymentMethod } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { api } from "@/lib/api";
import {
  X,
  Check,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  ArrowRightLeft,
  Store,
  Tag,
  Calendar as CalendarIcon,
  CreditCard,
  Building2,
  Hash,
  FileText,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/lib/toast-context";
import { getCategoryTheme } from "@/lib/category-theme";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionRequest) => Promise<void>;
  initialData?: Transaction | null;
}

const COMMON_CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Shopping",
  "Travel & Fuel",
  "Utilities & Bills",
  "Entertainment",
  "Health & Medical",
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "UPI", label: "UPI" },
  { id: "DEBIT_CARD", label: "Debit Card" },
  { id: "CREDIT_CARD", label: "Credit Card" },
  { id: "NET_BANKING", label: "NetBanking" },
  { id: "MANUAL", label: "Cash / Manual" },
];

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TransactionModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    }
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const [amount, setAmount] = useState<string>("");
  const [transactionType, setTransactionType] = useState<TransactionType>("EXPENSE");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [category, setCategory] = useState("Other");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [bank, setBank] = useState("HDFC");
  const [accountNumber, setAccountNumber] = useState("XX0000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Smart merchant rule options
  const [createMerchantRule, setCreateMerchantRule] = useState(true);
  const [applyToAllMatching, setApplyToAllMatching] = useState(true);
  const [matchCount, setMatchCount] = useState<number>(0);

  // Dynamic categories list ensuring initialData.category is always selectable
  const availableCategories = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    if (initialData?.category && initialData.category.trim()) {
      set.add(initialData.category.trim());
    }
    return Array.from(set);
  }, [initialData?.category]);

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount ? initialData.amount.toString() : "");
      setTransactionType(initialData.transactionType || "EXPENSE");
      setMerchant(initialData.merchant || "");
      setDescription(initialData.description || "");
      setTransactionDate(
        initialData.transactionDate
          ? new Date(initialData.transactionDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
      setReferenceNumber(initialData.referenceNumber || "");
      setCategory(initialData.category || "Other");
      setPaymentMethod(initialData.paymentMethod || "UPI");
      setBank(initialData.bank || "HDFC");
      setAccountNumber(initialData.accountNumber || "XX0000");

      setCreateMerchantRule(true);
      setApplyToAllMatching(true);

      // Check how many transactions share this merchant
      api
        .previewMerchantCount(initialData.merchant)
        .then((res) => setMatchCount(res.matchingCount))
        .catch(() => setMatchCount(1));
    } else {
      setAmount("");
      setTransactionType("EXPENSE");
      setMerchant("");
      setDescription("");
      setTransactionDate(new Date().toISOString().slice(0, 16));
      setReferenceNumber("");
      setCategory("Food & Dining");
      setPaymentMethod("UPI");
      setBank("HDFC");
      setAccountNumber("XX1480");
      setMatchCount(0);
    }
    setError(null);
    setShowAdvanced(false);
  }, [initialData, isOpen]);

  if (!isOpen || !mounted) return null;

  const isMerchantOrCategoryChanged =
    !!initialData &&
    (merchant.trim() !== initialData.merchant || category.trim() !== initialData.category);

  const activeCategoryTheme = getCategoryTheme(category);
  const CategoryIcon = activeCategoryTheme.icon;

  const handleCopyRef = () => {
    if (referenceNumber) {
      navigator.clipboard.writeText(referenceNumber);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 1800);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Please provide a valid amount greater than 0");
      return;
    }
    if (!merchant.trim()) {
      setError("Merchant name is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: TransactionRequest = {
        amount: parseFloat(amount),
        transactionType,
        merchant: merchant.trim(),
        description: description.trim() || undefined,
        transactionDate: new Date(transactionDate).toISOString(),
        referenceNumber: referenceNumber.trim() || undefined,
        category,
        paymentMethod,
        bank: bank.trim() || "HDFC",
        accountNumber: accountNumber.trim() || "XX0000",
        createMerchantRule: isMerchantOrCategoryChanged ? createMerchantRule : false,
        applyToAllMatching: isMerchantOrCategoryChanged ? applyToAllMatching : false,
        originalMerchant: initialData?.merchant,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
      {/* Background click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Surface */}
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border-t sm:border border-slate-200/90 shadow-[0_24px_60px_rgba(15,23,42,0.2),0_8px_24px_rgba(108,59,255,0.08)] overflow-hidden max-h-[92vh] flex flex-col z-10">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* ========================================================= */}
        {/* HEADER                                                    */}
        {/* ========================================================= */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 via-white to-slate-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
                transactionType === "EXPENSE"
                  ? "bg-rose-50 text-rose-600 border-rose-100"
                  : transactionType === "INCOME"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-purple-50 text-[#6C3BFF] border-purple-100"
              }`}
            >
              {transactionType === "EXPENSE" ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : transactionType === "INCOME" ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowRightLeft className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                {initialData ? "Edit Transaction" : "New Transaction"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {initialData?.source === "GMAIL_AUTOMATED"
                  ? "Linked HDFC Bank SMS / Email Alert"
                  : "Finora Personal Ledger Record"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* SCROLLABLE FORM BODY                                      */}
        {/* ========================================================= */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. TRANSACTION TYPE SEGMENTED CONTROL */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
              {[
                { id: "EXPENSE", label: "Expense", icon: ArrowDownRight, color: "text-rose-600" },
                { id: "INCOME", label: "Income", icon: ArrowUpRight, color: "text-emerald-600" },
                { id: "REFUND", label: "Refund", icon: RotateCcw, color: "text-sky-600" },
                { id: "TRANSFER", label: "Transfer", icon: ArrowRightLeft, color: "text-purple-600" },
              ].map((t) => {
                const isSelected = transactionType === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransactionType(t.id as TransactionType)}
                    className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? t.color : "text-slate-400"}`} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. HERO AMOUNT INPUT CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-purple-50/40 border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>AMOUNT</span>
              <span className="text-[10px] text-slate-400 font-normal">Quick add chips below</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={`w-full text-3xl sm:text-4xl font-black tracking-tight bg-transparent focus:outline-none tabular-nums ${
                  transactionType === "EXPENSE"
                    ? "text-rose-600 placeholder:text-rose-200"
                    : transactionType === "INCOME"
                    ? "text-emerald-600 placeholder:text-emerald-200"
                    : "text-slate-900 placeholder:text-slate-300"
                }`}
              />
            </div>

            {/* Quick Increment Chips */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {[50, 100, 500, 1000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => {
                    const cur = parseFloat(amount) || 0;
                    setAmount((cur + inc).toString());
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100/70 hover:text-purple-800 text-slate-600 text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  +₹{inc}
                </button>
              ))}
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-semibold transition-colors cursor-pointer ml-auto"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3. MERCHANT / RECIPIENT */}
          <div>
            <label className="block text-slate-700 font-bold text-xs mb-1">
              Merchant / Recipient
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. Chai track ssn, Amazon, Swiggy, Premnath"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF] focus:ring-1 focus:ring-[#6C3BFF]/20 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* 4. CATEGORY SELECTOR WITH VISUAL THEMES */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold text-xs">Category</label>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                <div
                  className={`w-4 h-4 rounded-md ${activeCategoryTheme.bgLight} ${activeCategoryTheme.iconClass} flex items-center justify-center`}
                >
                  <CategoryIcon className="w-2.5 h-2.5" />
                </div>
                <span>{category}</span>
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {COMMON_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                const theme = getCategoryTheme(cat);
                const Icon = theme.icon;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#6C3BFF] text-white shadow-2xs shadow-purple-500/25"
                        : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Full Category Dropdown */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF] transition-colors shadow-2xs"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 5. PAYMENT METHOD & DATE/TIME ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">Payment Method</label>
              <div className="relative">
                <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF] transition-colors shadow-2xs"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold text-xs mb-1">Date & Time</label>
              <div className="relative">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="datetime-local"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF] transition-colors shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* 6. BANK ACCOUNT & REFERENCE CARD */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Bank & Account Reference
              </span>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[#6C3BFF] hover:underline cursor-pointer font-semibold text-[10px]"
              >
                {showAdvanced ? "Hide Details" : "Show All"}
              </button>
            </div>

            {/* Bank Name & Account Number */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="HDFC"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Account (Masked)
                </label>
                <input
                  type="text"
                  placeholder="XX1480"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                />
              </div>
            </div>

            {/* Reference Number & Copy Button */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                Bank Reference / UPI Ref
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Hash className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="630680699640"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                  />
                </div>
                {referenceNumber && (
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                    title="Copy reference number"
                  >
                    {copiedRef ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Notes / Description */}
            {(showAdvanced || description) && (
              <div className="pt-1">
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Notes & Description
                </label>
                <div className="relative">
                  <FileText className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <textarea
                    rows={2}
                    placeholder="Optional notes regarding this transaction..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#6C3BFF] resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 7. SMART MERCHANT AUTO-CLASSIFICATION CALLOUT */}
          {initialData && isMerchantOrCategoryChanged && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50/60 to-white border border-purple-200 text-xs space-y-2 animate-fadeIn shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-950">
                <Sparkles className="w-4 h-4 text-[#6C3BFF]" />
                <span>Automate Future Classifications</span>
              </div>
              <p className="text-[11px] text-purple-900 leading-snug">
                You changed <strong className="text-slate-900 underline decoration-purple-300">{initialData.merchant}</strong> to{" "}
                <strong className="text-slate-900 underline decoration-purple-300">{merchant}</strong> ({category}).
              </p>
              <div className="pt-1 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createMerchantRule}
                    onChange={(e) => setCreateMerchantRule(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-purple-300 text-[#6C3BFF] focus:ring-[#6C3BFF] cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-purple-950">
                    Always auto-classify future transactions like this
                  </span>
                </label>
                {matchCount > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyToAllMatching}
                      onChange={(e) => setApplyToAllMatching(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-purple-300 text-[#6C3BFF] focus:ring-[#6C3BFF] cursor-pointer"
                    />
                    <span className="text-[11px] text-purple-800">
                      Also apply to all {matchCount} existing transaction{matchCount === 1 ? "" : "s"} with name &quot;{initialData.merchant}&quot;
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* 8. ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              <span>{submitting ? "Saving..." : "Save Transaction"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
