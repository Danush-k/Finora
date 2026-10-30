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
import { RotateCcw } from "lucide-react";

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
      <div className="w-full h-80 rounded-2xl liquid-glass flex items-center justify-center text-slate-400 text-xs">
        No monthly financial trend data available yet.
      </div>
    );
  }

  const activePoint = data.find((d) => d.fullMonth === activeMonthKey);

  // Clean, professional X-Axis tick with subtle accent underline for the active month
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const point = data.find(
      (d) => d.month === payload.value || d.fullMonth === payload.value
    );
    const isActive = point && activeMonthKey === point.fullMonth;

    return (
      <g
        transform={`translate(${x},${y})`}
        onClick={(e) => {
          e.stopPropagation();
          if (point && onSelectMonth) onSelectMonth(point);
        }}
        style={{ cursor: "pointer" }}
        className="group"
      >
        <text
          x={0}
          y={16}
          textAnchor="middle"
          className={`transition-colors duration-150 select-none ${
            isActive
              ? "fill-indigo-600 font-extrabold text-[13px] tracking-tight"
              : "fill-slate-500 font-semibold text-[11px] group-hover:fill-slate-900"
          }`}
        >
          {payload.value}
        </text>
        {/* Sleek, modern accent bar directly below active month */}
        {isActive && (
          <rect
            x={-12}
            y={24}
            width={24}
            height={3}
            rx={1.5}
            fill="#4f46e5"
            className="filter drop-shadow(0 1px 2px rgba(79, 70, 229, 0.4))"
          />
        )}
      </g>
    );
  };

  return (
    <div className="w-full rounded-2xl liquid-glass p-6 border border-slate-200/80 shadow-xs">
      {/* Sleek, professional header with inline month indicator and reset */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Monthly Inflow vs Outflow
            </h4>
            {activePoint && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/90 animate-in fade-in duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                {activePoint.month} {activePoint.year || "2026"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {activePoint
              ? `Showing cashflow for ${activePoint.month}. Click any other bar or label to switch.`
              : "Past 6 months trend • Click any bar to inspect that month"}
          </p>
        </div>

        {activeMonthKey && onResetMonth && (
          <button
            onClick={onResetMonth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 active:scale-95 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Chart Canvas */}
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
              stroke="rgba(226, 232, 240, 0.7)"
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
              cursor={{ fill: "rgba(241, 245, 249, 0.55)", radius: 6 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as MonthlyChartPoint;
                  const isCurrentActive = pt.fullMonth === activeMonthKey;

                  return (
                    <div className="rounded-xl liquid-glass-elevated p-3 border border-slate-200 text-xs shadow-xl min-w-[170px]">
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                        <p className="font-extrabold text-slate-900">
                          {label} {pt.year || ""}
                        </p>
                        {isCurrentActive ? (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Click to select
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
                    opacity={!activeMonthKey || isSelected ? 1 : 0.45}
                    stroke={isSelected ? "#047857" : "none"}
                    strokeWidth={isSelected ? 1.5 : 0}
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
                    opacity={!activeMonthKey || isSelected ? 1 : 0.45}
                    stroke={isSelected ? "#be123c" : "none"}
                    strokeWidth={isSelected ? 1.5 : 0}
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
