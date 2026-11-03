"use client";

import React, { Suspense } from "react";
import ExpenseAnalyticsView from "@/components/analytics/ExpenseAnalyticsView";

export default function ExpenseCategoriesPage() {
  return (
    <Suspense fallback={<div className="p-6 space-y-4"><div className="h-20 bg-slate-100 rounded-2xl animate-pulse" /><div className="h-64 bg-slate-100 rounded-2xl animate-pulse" /></div>}>
      <ExpenseAnalyticsView />
    </Suspense>
  );
}

