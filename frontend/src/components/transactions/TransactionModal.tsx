import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Transaction, TransactionRequest, TransactionType, PaymentMethod } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { api } from "@/lib/api";
import { X, Check, Sparkles } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionRequest) => Promise<void>;
  initialData?: Transaction | null;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TransactionModalProps) {
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

  // Smart merchant rule options
  const [createMerchantRule, setCreateMerchantRule] = useState(true);
  const [applyToAllMatching, setApplyToAllMatching] = useState(true);
  const [matchCount, setMatchCount] = useState<number>(0);

  // Dynamic categories list ensuring initialData.category is always selectable
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    if (initialData?.category && initialData.category.trim()) {
      set.add(initialData.category.trim());
    }
    return Array.from(set);
  }, [initialData?.category]);

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setTransactionType(initialData.transactionType);
      setMerchant(initialData.merchant);
      setDescription(initialData.description || "");
      setTransactionDate(
        initialData.transactionDate
          ? new Date(initialData.transactionDate).toISOString().slice(0, 16)
          : ""
      );
      setReferenceNumber(initialData.referenceNumber || "");
      setCategory(initialData.category || "Other");
      setPaymentMethod(initialData.paymentMethod || "UPI");
      setBank(initialData.bank || "HDFC");
      setAccountNumber(initialData.accountNumber || "XX0000");

      setCreateMerchantRule(true);
      setApplyToAllMatching(true);

      // Check how many transactions share this merchant
      api.previewMerchantCount(initialData.merchant)
        .then((res) => setMatchCount(res.matchingCount))
        .catch(() => setMatchCount(1));
    } else {
      setAmount("");
      setTransactionType("EXPENSE");
      setMerchant("");
      setDescription("");
      setTransactionDate(new Date().toISOString().slice(0, 16));
      setReferenceNumber("");
      setCategory("Other");
      setPaymentMethod("UPI");
      setBank("HDFC");
      setAccountNumber("XX1234");
      setMatchCount(0);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen || !mounted) return null;

  const isMerchantOrCategoryChanged =
    !!initialData &&
    (merchant.trim() !== initialData.merchant || category.trim() !== initialData.category);

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl liquid-glass-elevated border border-slate-200 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">
            {initialData ? "Edit Transaction" : "New Transaction"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Amount & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="499.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors font-bold text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="EXPENSE">EXPENSE</option>
                <option value="INCOME">INCOME</option>
                <option value="REFUND">REFUND</option>
                <option value="TRANSFER">TRANSFER</option>
              </select>
            </div>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Merchant / Recipient</label>
            <input
              type="text"
              placeholder="e.g. Swiggy, Amazon, Infosys"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Category & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="UPI">UPI</option>
                <option value="DEBIT_CARD">DEBIT CARD</option>
                <option value="CREDIT_CARD">CREDIT CARD</option>
                <option value="NET_BANKING">NET BANKING</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </div>
          </div>

          {/* Date & Ref Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Bank Reference No</label>
              <input
                type="text"
                placeholder="430129849201"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Bank & Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Bank Name</label>
              <input
                type="text"
                placeholder="HDFC"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Account (Masked)</label>
              <input
                type="text"
                placeholder="XX1234"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Smart Merchant Rule Callout */}
          {initialData && isMerchantOrCategoryChanged && (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Auto-Classification Rule</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-snug">
                You changed <span className="font-semibold text-slate-900 underline decoration-indigo-300">{initialData.merchant}</span> to{" "}
                <span className="font-semibold text-slate-900 underline decoration-indigo-300">{merchant}</span> ({category}).
              </p>
              <div className="pt-1 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createMerchantRule}
                    onChange={(e) => setCreateMerchantRule(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-indigo-950">
                    Always auto-classify future transactions like this
                  </span>
                </label>
                {matchCount > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyToAllMatching}
                      onChange={(e) => setApplyToAllMatching(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-indigo-800">
                      Also apply to all {matchCount} existing transaction{matchCount === 1 ? "" : "s"} with name &quot;{initialData.merchant}&quot;
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-5 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              <span className="text-white font-semibold">{submitting ? "Saving..." : "Save Transaction"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
