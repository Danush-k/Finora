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
    <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 liquid-glass-dock border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-emerald-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <span className="text-white font-bold text-sm tracking-tight">FP</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base sm:text-lg tracking-tight text-white">
                Finora
              </span>
              <span className="text-[11px] font-medium text-indigo-400/90 px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                by PayTrace
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Automated HDFC Expense Tracking</p>
          </div>
        </Link>

        {/* Sync Status Pill & Actions */}
        <div className="flex items-center gap-3">
          {status?.connected ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Gmail Linked</span>
              <span className="text-slate-400 text-[11px]">({status.email})</span>
            </div>
          ) : (
            <Link
              href="/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Connect Gmail</span>
              <ArrowUpRight className="w-3 h-3 opacity-70" />
            </Link>
          )}

          <button
            onClick={handleQuickSync}
            disabled={syncing}
            title="Trigger Instant Gmail Synchronisation"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-200 text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync Now</span>
          </button>
        </div>
      </div>
    </header>
  );
}
