"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

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
  const windowSize = 6;

  // Track window startIndex to display a sliding window of months
  const [startIndex, setStartIndex] = useState<number>(() => {
    if (!data || data.length <= windowSize) return 0;
    return Math.max(0, data.length - windowSize);
  });

  // Whenever activeMonthKey is selected, ensure it's visible in the current window
  useEffect(() => {
    if (activeMonthKey && data && data.length > 0) {
      const idx = data.findIndex((d) => d.fullMonth === activeMonthKey);
      if (idx !== -1) {
        if (idx < startIndex) {
          setStartIndex(Math.max(0, idx));
        } else if (idx >= startIndex + windowSize) {
          setStartIndex(Math.max(0, Math.min(data.length - windowSize, idx - windowSize + 1)));
        }
      }
    }
  }, [activeMonthKey, data]);

  // If data length changes (e.g. after backfill), adjust if needed
  useEffect(() => {
    if (data && data.length > 0) {
      if (startIndex + windowSize > data.length) {
        setStartIndex(Math.max(0, data.length - windowSize));
      }
    }
  }, [data?.length]);

  const visibleData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(startIndex, startIndex + windowSize);
  }, [data, startIndex, windowSize]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 rounded-2xl liquid-glass flex items-center justify-center text-slate-400 text-xs select-none">
        No monthly financial trend data available yet.
      </div>
    );
  }

  const activePoint = data.find((d) => d.fullMonth === activeMonthKey);
  const canGoEarlier = startIndex > 0;
  const canGoLater = startIndex + windowSize < data.length;

  const handleSlideLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoEarlier) {
      const newIdx = Math.max(0, startIndex - 1);
      setStartIndex(newIdx);
    }
  };

  const handleSlideRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoLater) {
      const newIdx = Math.min(data.length - windowSize, startIndex + 1);
      setStartIndex(newIdx);
    }
  };

  // Clean X-Axis tick with subtle accent underline for active month
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const point = visibleData.find(
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
        style={{ cursor: "pointer", outline: "none" }}
        className="group select-none"
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
    <div
      className="w-full rounded-2xl liquid-glass p-6 border border-slate-200/80 shadow-xs select-none outline-none focus:outline-none"
      style={{ outline: "none", WebkitTapHighlightColor: "transparent" }}
      onMouseDown={(e) => {
        // Prevent browser focus ring on click
        if (e.target !== e.currentTarget && (e.target as HTMLElement).blur) {
          (e.target as HTMLElement).blur();
        }
      }}
    >
      {/* Header with Title and Reset */}
      <div className="flex items-center justify-between mb-4">
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
              ? `Displaying verified transactions for ${activePoint.month}. Use arrows to slide across months.`
              : "Past 12 months cashflow trend • Click any bar to inspect that month"}
          </p>
        </div>

        {activeMonthKey && onResetMonth && (
          <button
            onClick={onResetMonth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 active:scale-95 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition-all cursor-pointer outline-none focus:outline-none"
            style={{ outline: "none" }}
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Chart Canvas with strict outline suppression */}
      <div
        className="w-full h-72 outline-none focus:outline-none [&_*]:focus:outline-none [&_*]:outline-none"
        style={{ outline: "none", userSelect: "none" }}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          style={{ outline: "none" }}
          className="outline-none focus:outline-none"
        >
          <BarChart
            data={visibleData}
            margin={{ top: 10, right: 10, left: -15, bottom: 15 }}
            style={{ outline: "none" }}
            className="outline-none focus:outline-none select-none"
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
                    <div className="rounded-xl liquid-glass-elevated p-3 border border-slate-200 text-xs shadow-xl min-w-[170px] select-none">
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
              isAnimationActive={true}
              animationDuration={450}
              animationEasing="ease-in-out"
              cursor="pointer"
              style={{ outline: "none" }}
            >
              {visibleData.map((entry) => {
                const isSelected = entry.fullMonth === activeMonthKey;
                return (
                  <Cell
                    key={`income-${entry.fullMonth}`}
                    fill="#059669"
                    opacity={!activeMonthKey || isSelected ? 1 : 0.45}
                    stroke={isSelected ? "#047857" : "none"}
                    strokeWidth={isSelected ? 1.5 : 0}
                    style={{ outline: "none" }}
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
              isAnimationActive={true}
              animationDuration={450}
              animationEasing="ease-in-out"
              cursor="pointer"
              style={{ outline: "none" }}
            >
              {visibleData.map((entry) => {
                const isSelected = entry.fullMonth === activeMonthKey;
                return (
                  <Cell
                    key={`exp-${entry.fullMonth}`}
                    fill="#e11d48"
                    opacity={!activeMonthKey || isSelected ? 1 : 0.45}
                    stroke={isSelected ? "#be123c" : "none"}
                    strokeWidth={isSelected ? 1.5 : 0}
                    style={{ outline: "none" }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Smooth Navigation Controls at the Bottom Near Month Labels */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100/80">
        <button
          onClick={handleSlideLeft}
          disabled={!canGoEarlier}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer outline-none focus:outline-none ${
            canGoEarlier
              ? "bg-white hover:bg-indigo-50/80 active:scale-95 text-slate-700 hover:text-indigo-600 border-slate-200/90 shadow-xs"
              : "opacity-35 text-slate-400 border-transparent cursor-not-allowed"
          }`}
          style={{ outline: "none" }}
          title={canGoEarlier ? "Slide to earlier months" : "Reached earliest month"}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-[11px]">Earlier Months</span>
        </button>

        {/* Center Timeline Label */}
        <div className="text-[11px] font-semibold text-slate-400 select-none flex items-center gap-1.5">
          <span className="text-slate-600">
            {visibleData[0]?.month} {visibleData[0]?.year}
          </span>
          <span className="text-slate-300">→</span>
          <span className="text-slate-600">
            {visibleData[visibleData.length - 1]?.month} {visibleData[visibleData.length - 1]?.year}
          </span>
        </div>

        <button
          onClick={handleSlideRight}
          disabled={!canGoLater}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer outline-none focus:outline-none ${
            canGoLater
              ? "bg-white hover:bg-indigo-50/80 active:scale-95 text-slate-700 hover:text-indigo-600 border-slate-200/90 shadow-xs"
              : "opacity-35 text-slate-400 border-transparent cursor-not-allowed"
          }`}
          style={{ outline: "none" }}
          title={canGoLater ? "Slide to later months" : "Reached latest month"}
        >
          <span className="text-[11px]">Later Months</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
