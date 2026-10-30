"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { MonthlyChartPoint } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { RotateCcw, CalendarCheck, Sparkles } from "lucide-react";

interface ExpenseChartProps {
  data: MonthlyChartPoint[];
  activeMonthKey?: string | null;
  onSelectMonth?: (point: MonthlyChartPoint) => void;
  onResetMonth?: () => void;
}

export default function ExpenseChart({
  data,
  activeMonthKey,
  onSelectMonth,
  onResetMonth,
}: ExpenseChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-72 rounded-2xl liquid-glass flex items-center justify-center text-slate-400 text-xs">
        No monthly financial trend data available yet.
      </div>
    );
  }

  // Active month info
  const activePoint = data.find((d) => d.fullMonth === activeMonthKey);

  // Custom tick with active highlight badge and click handler
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const point = data.find(
      (d) => d.month === payload.value || d.fullMonth === payload.value
    );
    const isActive = point && activeMonthKey === point.fullMonth;

    return (
      <g transform={`translate(${x},${y})`}>
        {isActive && (
          <rect
            x={-24}
            y={5}
            width={48}
            height={22}
            rx={11}
            fill="#4f46e5"
            className="filter drop-shadow(0 2px 4px rgba(79, 70, 229, 0.35)) cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (point && onSelectMonth) onSelectMonth(point);
            }}
          />
        )}
        <text
          x={0}
          y={isActive ? 20 : 17}
          textAnchor="middle"
          onClick={(e) => {
            e.stopPropagation();
            if (point && onSelectMonth) onSelectMonth(point);
          }}
          className={`cursor-pointer transition-all select-none ${
            isActive
              ? "fill-white font-extrabold text-[12px] tracking-wide"
              : "fill-slate-600 font-bold text-[11px] hover:fill-indigo-600"
          }`}
        >
          {payload.value}
        </text>
        {isActive && (
          <circle cx={0} cy={32} r={2.5} fill="#4f46e5" />
        )}
      </g>
    );
  };

  return (
    <div className="w-full rounded-2xl liquid-glass p-5 border border-slate-200/80 shadow-xs">
      {/* Top Header with title, active badge, and reset button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Monthly Inflow vs Outflow
            </h4>
            {activePoint && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-in fade-in zoom-in-95 duration-200">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Active: {activePoint.fullMonth}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any month bar or label to update the entire dashboard
          </p>
        </div>

        {/* Action button if filtered */}
        {activeMonthKey && onResetMonth && (
          <button
            onClick={onResetMonth}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
            title="Reset to latest month"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset to Current</span>
          </button>
        )}
      </div>

      {/* Month Selection Quick Bar (Pills) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
          <CalendarCheck className="w-3 h-3" /> Select:
        </span>
        {data.map((point) => {
          const isActive = point.fullMonth === activeMonthKey;
          return (
            <button
              key={point.fullMonth}
              onClick={() => onSelectMonth && onSelectMonth(point)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-400/60 ring-offset-1"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900"
              }`}
            >
              {point.month}
              {isActive && " •"}
            </button>
          );
        })}
      </div>

      {/* Recharts Bar Chart */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
            onClick={(state: any) => {
              if (
                state &&
                state.activePayload &&
                state.activePayload.length &&
                onSelectMonth
              ) {
                const pt = state.activePayload[0].payload as MonthlyChartPoint;
                onSelectMonth(pt);
              }
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(226, 232, 240, 0.8)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              interval={0}
              tick={<CustomXAxisTick />}
              tickLine={false}
              axisLine={{ stroke: "rgba(226, 232, 240, 0.9)" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) =>
                `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as MonthlyChartPoint;
                  const isCurrentActive = pt.fullMonth === activeMonthKey;

                  return (
                    <div className="rounded-xl liquid-glass-elevated p-3 border border-slate-200 text-xs shadow-xl min-w-[160px]">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-extrabold text-slate-900">
                          {label} ({pt.fullMonth})
                        </p>
                        {isCurrentActive && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      {payload.map((entry, index) => (
                        <div
                          key={`item-${index}`}
                          className="flex items-center justify-between gap-4 py-0.5"
                        >
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            {entry.name}:
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(Number(entry.value))}
                          </span>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-indigo-600 font-semibold text-center">
                        Click to filter dashboard for this month
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{
                paddingBottom: "12px",
                fontSize: "11px",
                fontWeight: "500",
              }}
            />
            <Bar
              name="Income"
              dataKey="income"
              fill="#059669"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              cursor="pointer"
            >
              {data.map((entry) => {
                const isSelected = entry.fullMonth === activeMonthKey;
                return (
                  <Cell
                    key={`income-${entry.fullMonth}`}
                    fill="#059669"
                    opacity={!activeMonthKey || isSelected ? 1 : 0.4}
                    stroke={isSelected ? "#047857" : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              })}
            </Bar>
            <Bar
              name="Expenses"
              dataKey="expenses"
              fill="#e11d48"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              cursor="pointer"
            >
              {data.map((entry) => {
                const isSelected = entry.fullMonth === activeMonthKey;
                return (
                  <Cell
                    key={`exp-${entry.fullMonth}`}
                    fill="#e11d48"
                    opacity={!activeMonthKey || isSelected ? 1 : 0.4}
                    stroke={isSelected ? "#be123c" : "none"}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
