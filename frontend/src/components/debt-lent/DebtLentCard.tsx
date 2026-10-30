"use client";

import React from "react";
import { DebtLentRecord } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Percent,
  ChevronRight,
  AlertCircle,
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

  // Get initials for avatar
  const initials = record.counterpartyName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isOverdue =
    record.status !== "SETTLED" && record.dueDate && new Date(record.dueDate) < new Date();

  return (
    <div
      onClick={onClick}
      className="p-5 rounded-3xl liquid-glass border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group select-none"
    >
      {/* Top Row: Avatar, Name, Type, Status */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shadow-2xs border ${
                isLent
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
              }`}
            >
              {initials}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {record.counterpartyName}
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {record.description || (isLent ? "Money Lent" : "Personal Debt")}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLent
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isLent ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
              <span>{isLent ? "Lent (Receivable)" : "Debt (Payable)"}</span>
            </span>

            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                record.status === "SETTLED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : record.status === "PARTIALLY_SETTLED"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : isOverdue || record.status === "OVERDUE"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {record.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Amount & Expected Total */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isLent ? "Principal Lent" : "Principal Borrowed"}
            </span>
            <p className="text-lg font-extrabold text-slate-900 tabular-nums">
              {formatCurrency(record.principalAmount)}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Remaining
            </span>
            <p
              className={`text-sm font-extrabold tabular-nums ${
                remaining > 0 ? (isLent ? "text-emerald-700" : "text-rose-600") : "text-slate-400"
              }`}
            >
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Interest & Tenure Tag */}
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
          {record.hasInterest && record.interestRate ? (
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 bg-indigo-50/70 border border-indigo-200/60 px-2 py-0.5 rounded-md">
              <Percent className="w-3 h-3" />
              <span>
                {record.interestRate}% {record.interestPeriodType === "MONTHLY" ? "p.m." : "p.a."} ({record.tenureMonths || 1} mo)
              </span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              0% Interest Free
            </span>
          )}

          {record.linkedTransactionDescription && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded truncate max-w-[140px]" title={record.linkedTransactionDescription}>
              <Link2 className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">Mapped Txn</span>
            </span>
          )}

          {record.amountDifferenceReason && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded truncate max-w-[170px]"
              title={record.amountDifferenceReason}
            >
              <span>💵 {record.amountDifferenceReason}</span>
            </span>
          )}
        </div>
      </div>

      {/* Bottom Progress & Checklist Summary */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
          <span>
            {totalInstallments > 0
              ? `${settledCount} of ${totalInstallments} checklist steps cleared`
              : `${pct}% settled`}
          </span>
          <span className="font-bold text-slate-700">{pct}%</span>
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pct === 100
                ? "bg-emerald-500"
                : isLent
                ? "bg-emerald-500"
                : "bg-amber-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="flex items-center gap-1 text-slate-400">
            <Calendar className="w-3 h-3" />
            <span>{record.dueDate ? `Due ${record.dueDate.split("T")[0]}` : "No set due date"}</span>
          </span>

          <span className="inline-flex items-center gap-0.5 text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform">
            <span>Checklist</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
