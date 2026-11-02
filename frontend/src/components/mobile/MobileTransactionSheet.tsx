"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Building2,
  Tag,
  Hash,
  FileText,
  Edit3,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getCategoryTheme } from "@/lib/category-theme";

interface MobileTransactionSheetProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (txn: Transaction) => void;
  onDelete?: (id: string) => void;
}

export default function MobileTransactionSheet({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: MobileTransactionSheetProps) {
  if (!isOpen || !transaction) return null;

  const isExpense = transaction.transactionType === "EXPENSE";
  const theme = getCategoryTheme(transaction.category || "Other");
  const CategoryIcon = theme.icon;

  const formattedDate = transaction.transactionDate
    ? new Date(transaction.transactionDate).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recent";

  const formattedTime = transaction.transactionDate
    ? new Date(transaction.transactionDate).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete this transaction for ${transaction.merchant}?`)) {
      onDelete?.(transaction.id);
      onClose();
    }
  };

  const handleEdit = () => {
    onEdit?.(transaction);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Bottom Sheet Drawer */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl z-10 border-t border-slate-200/80"
        >
          {/* Drag Handle */}
          <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-4 cursor-grab active:cursor-grabbing" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Summary */}
          <div className="text-center pt-1 pb-4 border-b border-slate-100">
            {/* Direction Badge */}
            <div
              className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-2.5 ${
                isExpense
                  ? "bg-rose-50 text-rose-600 border border-rose-100"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-100"
              }`}
            >
              {isExpense ? (
                <ArrowDownRight className="w-6 h-6" />
              ) : (
                <ArrowUpRight className="w-6 h-6" />
              )}
            </div>

            <h3 className="text-base font-extrabold text-slate-900 tracking-tight px-6 truncate">
              {transaction.merchant}
            </h3>

            {/* Formatted Amount */}
            <div
              className={`text-2xl font-black mt-1 tabular-nums ${
                isExpense ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {isExpense ? "-" : "+"}
              {formatCurrency(transaction.amount)}
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs text-slate-500">
              <span>{formattedDate}</span>
              {formattedTime && <span>· {formattedTime}</span>}
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified
              </span>
            </div>
          </div>

          {/* Details List */}
          <div className="py-4 space-y-3 text-xs">
            {/* Category */}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Category
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-md ${theme.bgLight} ${theme.iconClass} flex items-center justify-center`}
                >
                  <CategoryIcon className="w-3 h-3" />
                </div>
                <span className="font-bold text-slate-800">{transaction.category}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Payment Method
              </span>
              <span className="font-bold text-slate-800 uppercase">
                {transaction.paymentMethod || "UPI"}
              </span>
            </div>

            {/* Bank Account */}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Account
              </span>
              <span className="font-bold text-slate-800">
                {transaction.bank || "HDFC Bank"}{" "}
                <span className="text-slate-400 font-normal">
                  ({transaction.accountNumber || "XX0000"})
                </span>
              </span>
            </div>

            {/* Reference Number */}
            {transaction.referenceNumber && (
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  Reference No.
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {transaction.referenceNumber}
                </span>
              </div>
            )}

            {/* Description / Notes */}
            {transaction.description && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Notes
                </span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] leading-relaxed">
                  {transaction.description}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleEdit}
              className="btn-primary h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
              <span className="text-white">Edit Record</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
