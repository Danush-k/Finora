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
import { RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, ArrowRight } from "lucide-react";

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

  // Track sliding window start index
  const [startIndex, setStartIndex] = useState<number>(() => {
    if (!data || data.length <= windowSize) return 0;
    return Math.max(0, data.length - windowSize);
  });

  // Track currently hovered point for live header readout and infallible click resolution
  const [hoveredPoint, setHoveredPoint] = useState<MonthlyChartPoint | null>(null);

  // Whenever activeMonthKey changes, ensure it is within visible window
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

  // Adjust window if data length changes
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
      setStartIndex(Math.max(0, startIndex - 1));
    }
  };

  const handleSlideRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoLater) {
      setStartIndex(Math.min(data.length - windowSize, startIndex + 1));
    }
  };

  // Infallible month selector normalizer
  const triggerMonthSelect = (pointOrData: any) => {
    if (!pointOrData || !onSelectMonth) return;
    const pt: MonthlyChartPoint =
      pointOrData.payload && pointOrData.payload.fullMonth
        ? pointOrData.payload
        : pointOrData;
    if (pt && (pt.fullMonth || pt.month)) {
      onSelectMonth(pt);
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
          if (point) triggerMonthSelect(point);
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

  // Interactive full-height SVG column cursor that handles clicks anywhere in the month's column
  const InteractiveColumnCursor = (props: any) => {
    const { x, y, width, height } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      return null;
    }
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(99, 102, 241, 0.07)"
        rx={8}
        ry={8}
        className="cursor-pointer transition-all duration-150"
        style={{
          cursor: "pointer",
          pointerEvents: "auto",
          outline: "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (hoveredPoint) {
            triggerMonthSelect(hoveredPoint);
          }
        }}
      />
    );
  };

  return (
    <div
      className="w-full rounded-2xl liquid-glass p-6 border border-slate-200/80 shadow-xs select-none outline-none focus:outline-none"
      style={{ outline: "none", WebkitTapHighlightColor: "transparent" }}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget && (e.target as HTMLElement).blur) {
          (e.target as HTMLElement).blur();
        }
      }}
    >
      {/* Header with Title and Live Inspection Feedback */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
            {hoveredPoint ? (
              <span className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold animate-in fade-in duration-100">
                <span>{hoveredPoint.month} {hoveredPoint.year || ""}: Inflow {formatCurrency(hoveredPoint.income)} • Outflow {formatCurrency(hoveredPoint.expenses)}</span>
                <span className="text-[10px] bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">Click to view</span>
              </span>
            ) : activePoint ? (
              `Displaying verified transactions for ${activePoint.month}. Click any column or box to switch.`
            ) : (
              "Click any month column, bar, or info box to inspect that month"
            )}
          </p>
        </div>

        {activeMonthKey && onResetMonth && (
          <button
            onClick={onResetMonth}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 active:scale-95 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition-all cursor-pointer outline-none focus:outline-none"
            style={{ outline: "none" }}
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Chart Canvas with Click Listener and Outline Suppression */}
      <div
        className="w-full h-72 outline-none focus:outline-none [&_*]:focus:outline-none [&_*]:outline-none"
        style={{ outline: "none", userSelect: "none", cursor: hoveredPoint ? "pointer" : "default" }}
        onClick={() => {
          if (hoveredPoint) {
            triggerMonthSelect(hoveredPoint);
          }
        }}
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
            style={{ outline: "none", cursor: "pointer" }}
            className="outline-none focus:outline-none select-none"
            onMouseMove={(state: any) => {
              if (state?.activeTooltipIndex !== undefined && visibleData[state.activeTooltipIndex]) {
                setHoveredPoint(visibleData[state.activeTooltipIndex]);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
            onClick={(state: any) => {
              const pt =
                (state?.activeTooltipIndex !== undefined && visibleData[state.activeTooltipIndex]) ||
                state?.activePayload?.[0]?.payload ||
                hoveredPoint;
              if (pt) {
                triggerMonthSelect(pt);
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
            {/* Professional Snappy Tooltip with Zero Lag & Apple Card Aesthetics */}
            <Tooltip
              isAnimationActive={false}
              useTranslate3d={true}
              offset={14}
              cursor={<InteractiveColumnCursor />}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as MonthlyChartPoint;
                  const isCurrentActive = pt.fullMonth === activeMonthKey;

                  return (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerMonthSelect(pt);
                      }}
                      className="rounded-2xl bg-white/95 backdrop-blur-xl p-3.5 border border-slate-200/90 text-xs shadow-[0_12px_32px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.06)] min-w-[210px] select-none cursor-pointer hover:border-indigo-400 hover:shadow-[0_14px_36px_rgba(79,70,229,0.16)] active:scale-[0.98] transition-all duration-150 group pointer-events-auto"
                      style={{ outline: "none", pointerEvents: "auto" }}
                      title="Click anywhere to inspect this month"
                    >
                      {/* Card Header with Interactive Status Badge */}
                      <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-slate-100">
                        <p className="font-extrabold text-slate-900 text-sm tracking-tight">
                          {label} {pt.year || ""}
                        </p>
                        {isCurrentActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all duration-150 shadow-2xs">
                            <span>Select</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Amounts Breakdown */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" />
                            Income:
                          </span>
                          <span className="font-bold text-slate-900 tabular-nums text-xs">
                            {formatCurrency(Number(pt.income))}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-100 shrink-0" />
                            Expenses:
                          </span>
                          <span className="font-bold text-slate-900 tabular-nums text-xs">
                            {formatCurrency(Number(pt.expenses))}
                          </span>
                        </div>

                        {/* Net Cashflow Row */}
                        <div className="flex items-center justify-between gap-4 pt-1.5 mt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400 font-medium">Net:</span>
                          <span
                            className={`font-bold tabular-nums text-xs ${
                              Number(pt.savings) >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {Number(pt.savings) >= 0 ? "+" : ""}
                            {formatCurrency(Number(pt.savings))}
                          </span>
                        </div>
                      </div>

                      {/* Click prompt footer */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-400 group-hover:text-indigo-600 flex items-center justify-between transition-colors">
                        <span>{isCurrentActive ? "Active on dashboard" : "Click anywhere in column"}</span>
                        {!isCurrentActive && (
                          <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded text-[9px]">
                            Switch ↵
                          </span>
                        )}
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
              isAnimationActive={true}
              animationDuration={450}
              animationEasing="ease-in-out"
              cursor="pointer"
              style={{ outline: "none" }}
              onClick={(data: any) => triggerMonthSelect(data)}
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
                    style={{ outline: "none", cursor: "pointer" }}
                    onClick={() => triggerMonthSelect(entry)}
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
              onClick={(data: any) => triggerMonthSelect(data)}
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
                    style={{ outline: "none", cursor: "pointer" }}
                    onClick={() => triggerMonthSelect(entry)}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Smooth Sliding Navigation at Bottom */}
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
