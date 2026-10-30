"use client";

import React from "react";
import MonthlyCalendarView from "@/components/dashboard/MonthlyCalendarView";
import { Calendar, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function CalendarPage() {
  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Monthly Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Day-by-day cashflow breakdown, income arrivals, and expenditure patterns
          </p>
        </div>

        <Link
          href="/transactions?action=new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Entry</span>
        </Link>
      </div>

      {/* Segregated Calendar View */}
      <MonthlyCalendarView />
    </div>
  );
}
