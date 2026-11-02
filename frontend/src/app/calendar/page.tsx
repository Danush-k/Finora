"use client";

import React, { Suspense } from "react";
import MonthlyCalendarView from "@/components/dashboard/MonthlyCalendarView";
import MobileCalendarView from "@/components/mobile/MobileCalendarView";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { CalendarSkeleton } from "@/components/common/LoadingSkeletons";

export default function CalendarPage() {
  return (
    <>
      {/* ========================================================= */}
      {/* 1. DEDICATED MOBILE CALENDAR (< md)                       */}
      {/* ========================================================= */}
      <Suspense fallback={<div className="p-4 space-y-4"><div className="h-20 bg-slate-100 rounded-2xl animate-pulse" /><div className="h-64 bg-slate-100 rounded-2xl animate-pulse" /></div>}>
        <MobileCalendarView />
      </Suspense>

      {/* ========================================================= */}
      {/* 2. DESKTOP CALENDAR (md+) - 100% UNTOUCHED AND PRESERVED  */}
      {/* ========================================================= */}
      <div className="hidden md:block space-y-6 pb-28">
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
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span className="text-white font-semibold">New Entry</span>
          </Link>
        </div>

        {/* Segregated Calendar View with Smooth Skeleton Fallback */}
        <Suspense fallback={<CalendarSkeleton />}>
          <MonthlyCalendarView />
        </Suspense>
      </div>
    </>
  );
}
