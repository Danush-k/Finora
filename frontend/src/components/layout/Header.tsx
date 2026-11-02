"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GmailStatus } from "@/types";
import { RefreshCw, AlertCircle, ArrowUpRight, Lock, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import GlassSurface from "@/components/ui/GlassSurface";
import { useAuth } from "@/lib/auth-context";

export default function Header() {
  const { user, lock, logout } = useAuth();
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finora-sync-completed"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };

  return (
    <GlassSurface
      as="header"
      variant="toolbar"
      className="sticky top-0 z-40 w-full px-4 sm:px-8 py-[11px] pt-[calc(env(safe-area-inset-top)+11px)]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo - Fixed Dimensions: Height: 33px, Width: 128px */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="relative flex items-center" style={{ width: "128px", height: "33px" }}>
            <Image
              src="/finora-logo-transparent.png"
              alt="Finora by PayTrace"
              width={128}
              height={33}
              priority
              style={{ width: "128px", height: "33px", objectFit: "contain" }}
              className="select-none transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>

          <div className="hidden lg:block pl-3 border-l border-slate-200/80">
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              Automated HDFC Expense Tracking
            </p>
          </div>
        </Link>

        {/* Sync Status Badge & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {status?.connected ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gmail Linked</span>
              <span className="text-slate-500 font-normal text-[11px]">({status.email})</span>
            </div>
          ) : (
            <Link
              href="/settings"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50/90 border border-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-100/70 transition-colors shadow-2xs"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Connect Gmail</span>
              <ArrowUpRight className="w-3 h-3 opacity-70" />
            </Link>
          )}

          {/* Quick Sync Button */}
          <button
            onClick={handleQuickSync}
            disabled={syncing}
            title="Trigger Instant Gmail Synchronisation"
            className="btn-secondary flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5228E0] ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync Now</span>
          </button>

          {/* Profile & Lock Screen Toggle */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-200/80">
            <button
              type="button"
              onClick={lock}
              title="Lock Screen with Face ID"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/80 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              <Lock className="w-3 h-3 text-[#6C3BFF]" />
              <span className="hidden sm:inline">Lock</span>
            </button>

            {/* User Avatar */}
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#6C3BFF] to-[#A78BFA] p-0.5 shadow-2xs cursor-pointer"
              title={`${user?.name || "Danush"} (${user?.role || "Owner"}) - Click to sign out`}
              onClick={logout}
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden text-[10px] font-extrabold text-[#6C3BFF]">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "DA"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassSurface>
  );
}
