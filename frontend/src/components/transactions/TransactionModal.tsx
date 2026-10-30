"use client";

import React, { useState, useEffect } from "react";
import { Transaction, TransactionRequest, TransactionType, PaymentMethod } from "@/types";
import { X, Check } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionRequest) => Promise<void>;
  initialData?: Transaction | null;
}

const CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Groceries",
  "Travel & Fuel",
  "Utilities & Bills",
  "Entertainment",
  "Health & Medical",
  "Investment",
  "Salary & Income",
  "Refund",
  "Transfer",
  "Other",
];

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TransactionModalProps) {
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
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

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
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl liquid-glass-elevated border border-white/15 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <h3 className="text-base font-semibold text-slate-100">
            {initialData ? "Edit Transaction" : "New Transaction"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Amount & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="499.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-medium text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
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
            <label className="block text-slate-400 font-medium mb-1">Merchant / Recipient</label>
            <input
              type="text"
              placeholder="e.g. Swiggy, Amazon, Infosys"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Category & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
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
              <label className="block text-slate-400 font-medium mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Bank Reference No</label>
              <input
                type="text"
                placeholder="430129849201"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Bank & Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Bank Name</label>
              <input
                type="text"
                placeholder="HDFC"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Account (Masked)</label>
              <input
                type="text"
                placeholder="XX1234"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{submitting ? "Saving..." : "Save Transaction"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
