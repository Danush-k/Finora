"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GmailStatus } from "@/types";
import { ShieldCheck, RefreshCw, AlertCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function Header() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.getGmailStatus();
      setStatus(data);
    } catch {
      // Backend might be offline during initial load
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickSync = async () => {
    try {
      setSyncing(true);
      await api.triggerSync();
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 liquid-glass-dock border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 p-[1px] shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-white rounded-[11px] flex items-center justify-center">
              <span className="text-indigo-600 font-bold text-sm tracking-tight">FP</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
                Finora
              </span>
              <span className="text-[11px] font-semibold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                by PayTrace
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">Automated HDFC Expense Tracking</p>
          </div>
        </Link>

        {/* Sync Status Pill & Actions */}
        <div className="flex items-center gap-3">
          {status?.connected ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Gmail Linked</span>
              <span className="text-slate-500 font-normal text-[11px]">({status.email})</span>
            </div>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100/70 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Connect Gmail</span>
              <ArrowUpRight className="w-3 h-3 opacity-70" />
            </Link>
          )}

          <button
            onClick={handleQuickSync}
            disabled={syncing}
            title="Trigger Instant Gmail Synchronisation"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 active:scale-95 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync Now</span>
          </button>
        </div>
      </div>
    </header>
  );
}
