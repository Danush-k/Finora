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
      border: "border-rose-500/20 hover:border-rose-500/40",
      iconBg: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      amountColor: "text-rose-400",
      glow: "from-rose-500/5 to-transparent",
    },
    income: {
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      amountColor: "text-emerald-400",
      glow: "from-emerald-500/5 to-transparent",
    },
    savings: {
      border: "border-indigo-500/20 hover:border-indigo-500/40",
      iconBg: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
      amountColor: amount >= 0 ? "text-indigo-300" : "text-rose-400",
      glow: "from-indigo-500/5 to-transparent",
    },
    neutral: {
      border: "border-sky-500/20 hover:border-sky-500/40",
      iconBg: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
      amountColor: "text-slate-100",
      glow: "from-sky-500/5 to-transparent",
    },
  }[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl liquid-glass p-5 transition-all duration-300 hover:-translate-y-1 ${variantStyles.border}`}
    >
      <div className={`absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br ${variantStyles.glow} rounded-full blur-2xl pointer-events-none`} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-xl ${variantStyles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight ${variantStyles.amountColor}`}>
          {formatCurrency(amount)}
        </h3>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
        <span>{subtitle || "Current Month"}</span>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-medium text-slate-300">
            {count} {count === 1 ? "txn" : "txns"}
          </span>
        )}
      </div>
    </div>
  );
}
