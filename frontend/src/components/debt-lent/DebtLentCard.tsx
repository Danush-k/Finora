"use client";

import React from "react";
import { DebtLentRecord } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Percent,
  ChevronRight,
  Link2,
} from "lucide-react";

interface DebtLentCardProps {
  record: DebtLentRecord;
  onClick: () => void;
}

export default function DebtLentCard({ record, onClick }: DebtLentCardProps) {
  const isLent = record.type === "LENT";
  const totalExpected = record.totalExpectedAmount || record.principalAmount;
  const repaid = record.totalRepaidAmount || 0;
  const remaining = record.remainingAmount !== undefined ? record.remainingAmount : totalExpected - repaid;

  const pct = totalExpected > 0 ? Math.min(100, Math.round((repaid / totalExpected) * 100)) : 0;
  const settledCount = record.installments ? record.installments.filter((i) => i.settled).length : 0;
  const totalInstallments = record.installments ? record.installments.length : 0;

  // Initials for avatar
  const initials = record.counterpartyName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isOverdue =
    record.status !== "SETTLED" && record.dueDate && new Date(record.dueDate) < new Date();

  // Formatted date string (e.g. "12 Jan 2027")
  const dueDateFormatted = record.dueDate
    ? new Date(record.dueDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      onClick={onClick}
      className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl liquid-glass border border-slate-200/90 shadow-xs hover:border-[#6C3BFF]/40 hover:shadow-lg hover:shadow-[#6C3BFF]/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 group select-none"
    >
      {/* 1. Header Row: Avatar, Counterparty, Unified Badge Cluster */}
      <div>
        <div className="flex items-center justify-between gap-3">
          {/* Avatar + Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-2xs border shrink-0",
                isLent
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                  : "bg-indigo-500/10 text-[#5228E0] border-indigo-500/20"
              )}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-slate-900 tracking-tight group-hover:text-[#6C3BFF] transition-colors truncate">
                {record.counterpartyName}
              </h4>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {record.description || (isLent ? "Money Lent" : "Personal Debt")}
              </p>
            </div>
          </div>

          {/* Clean Horizontal Status Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                isLent
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-indigo-50 text-[#5228E0] border-indigo-200"
              )}
            >
              {isLent ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
              ) : (
                <ArrowDownLeft className="w-3 h-3 text-[#6C3BFF]" />
              )}
              <span>{isLent ? "Lent" : "Debt"}</span>
            </span>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                record.status === "SETTLED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isOverdue || record.status === "OVERDUE"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : record.status === "PARTIALLY_SETTLED"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  record.status === "SETTLED"
                    ? "bg-emerald-500"
                    : isOverdue || record.status === "OVERDUE"
                    ? "bg-rose-500 animate-pulse"
                    : record.status === "PARTIALLY_SETTLED"
                    ? "bg-indigo-500"
                    : "bg-slate-400"
                )}
              />
              <span>
                {record.status === "PARTIALLY_SETTLED"
                  ? "Partial"
                  : record.status.charAt(0) + record.status.slice(1).toLowerCase().replace("_", " ")}
              </span>
            </span>
          </div>
        </div>

        {/* 2. Hero Balance: Prominent Remaining Amount with Contextual Total */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isLent ? "Remaining to Collect" : "Remaining to Pay"}
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={cn(
                  "text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight",
                  remaining <= 0
                    ? "text-slate-400"
                    : isOverdue
                    ? "text-rose-600"
                    : isLent
                    ? "text-emerald-700"
                    : "text-slate-900"
                )}
              >
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {isLent ? "Total Lent" : "Total Borrowed"}
            </span>
            <span className="text-xs font-extrabold text-slate-700 tabular-nums">
              {formatCurrency(record.principalAmount)}
            </span>
          </div>
        </div>

        {/* 3. Metadata Tags: Interest & Bank Link */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {record.hasInterest && record.interestRate ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-lg">
              <Percent className="w-2.5 h-2.5" />
              <span>
                {record.interestRate}% {record.interestPeriodType === "MONTHLY" ? "p.m." : "p.a."}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-lg">
              Interest-free
            </span>
          )}

          {record.linkedTransactionDescription && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded-lg truncate max-w-[150px]"
              title={record.linkedTransactionDescription}
            >
              <Link2 className="w-2.5 h-2.5 shrink-0 text-slate-400" />
              <span className="truncate">Linked to bank alert</span>
            </span>
          )}

          {record.amountDifferenceReason && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg truncate max-w-[150px]"
              title={record.amountDifferenceReason}
            >
              <span className="truncate">Note: {record.amountDifferenceReason}</span>
            </span>
          )}
        </div>
      </div>

      {/* 4. Progress Bar & Checklist Summary */}
      <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-500">
            {totalInstallments > 0
              ? `${settledCount} of ${totalInstallments} payments cleared`
              : repaid > 0
              ? `${formatCurrency(repaid)} paid (${pct}%)`
              : "0% paid"}
          </span>
          <span className="font-bold text-slate-700 tabular-nums">{pct}%</span>
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              pct === 100
                ? "bg-emerald-500"
                : isLent
                ? "bg-emerald-500"
                : "bg-[#6C3BFF]"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* 5. Footer: Due Date & Action Link */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className={isOverdue ? "text-rose-600 font-bold" : "text-slate-500"}>
              {dueDateFormatted ? `Due ${dueDateFormatted}` : "No due date"}
            </span>
          </span>

          <span className="inline-flex items-center gap-0.5 text-[#6C3BFF] font-bold text-xs group-hover:translate-x-0.5 transition-transform">
            <span>Checklist</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
