import React from "react";
import { formatCurrency } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon: LucideIcon;
  variant: "expense" | "income" | "savings" | "neutral";
  count?: number;
}

export default function MetricCard({
  title,
  amount,
  subtitle,
  icon: Icon,
  variant,
  count,
}: MetricCardProps) {
  const variantStyles = {
    expense: {
      border: "border-rose-100/90 hover:border-rose-300",
      iconBg: "bg-rose-50 text-rose-600 border border-rose-200/80",
      amountColor: "text-rose-600",
      glow: "from-rose-500/5 to-transparent",
    },
    income: {
      border: "border-emerald-100/90 hover:border-emerald-300",
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
      amountColor: "text-emerald-600",
      glow: "from-emerald-500/5 to-transparent",
    },
    savings: {
      border: "border-indigo-100/90 hover:border-indigo-300",
      iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-200/80",
      amountColor: amount >= 0 ? "text-indigo-600" : "text-rose-600",
      glow: "from-indigo-500/5 to-transparent",
    },
    neutral: {
      border: "border-slate-200/80 hover:border-slate-300",
      iconBg: "bg-slate-100 text-slate-700 border border-slate-200",
      amountColor: "text-slate-900",
      glow: "from-slate-500/5 to-transparent",
    },
  }[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl liquid-glass p-5 transition-all duration-300 hover:-translate-y-1 ${variantStyles.border}`}
    >
      <div className={`absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br ${variantStyles.glow} rounded-full blur-2xl pointer-events-none`} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`p-2 rounded-xl ${variantStyles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${variantStyles.amountColor}`}>
          {formatCurrency(amount)}
        </h3>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <span>{subtitle || "Current Month"}</span>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-slate-100/80 border border-slate-200 text-slate-600 font-semibold">
            {count} {count === 1 ? "txn" : "txns"}
          </span>
        )}
      </div>
    </div>
  );
}
