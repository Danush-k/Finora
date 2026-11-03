"use client";

import React, { useState, useMemo } from "react";
import { GmailStatus, MerchantRule } from "@/types";
import { formatDateTime, cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import {
  Sliders,
  Palette,
  Mail,
  Sparkles,
  Send,
  ShieldCheck,
  Database,
  Info,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Download,
  Terminal,
  Settings as SettingsIcon,
  X,
  Smartphone,
  Lock,
  ArrowRight,
  FileSpreadsheet,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

interface MobileSettingsViewProps {
  status: GmailStatus | null;
  loading: boolean;
  syncing: boolean;
  syncFeedback: string | null;
  onSyncNow: () => Promise<void>;
  rules: MerchantRule[];
  loadingRules: boolean;
  onSaveRule: (e: React.FormEvent) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onApplyAllRules: () => Promise<void>;
  applyingAllRules: boolean;
  ruleFeedback: string | null;
  currency: string;
  dateFormat: string;
  defaultTab: string;
  reducedMotion: boolean;
  compactDensity: boolean;
  chartPalette?: string;
  onUpdatePreference: (key: string, val: string) => void;
  onTogglePreference: (key: string, currentVal: boolean) => void;
  onExport: (format: "csv" | "json") => void;
  onClearCache: () => void;
  ruleForm: {
    rawMerchant: string;
    cleanMerchantName: string;
    category: string;
    matchType: string;
    applyToExisting: boolean;
  };
  setRuleForm: React.Dispatch<
    React.SetStateAction<{
      rawMerchant: string;
      cleanMerchantName: string;
      category: string;
      matchType: string;
      applyToExisting: boolean;
    }>
  >;
  savingRule: boolean;
}

export default function MobileSettingsView({
  status,
  loading,
  syncing,
  syncFeedback,
  onSyncNow,
  rules,
  loadingRules,
  onSaveRule,
  onDeleteRule,
  onApplyAllRules,
  applyingAllRules,
  ruleFeedback,
  currency,
  dateFormat,
  defaultTab,
  reducedMotion,
  compactDensity,
  chartPalette = "default",
  onUpdatePreference,
  onTogglePreference,
  onExport,
  onClearCache,
  ruleForm,
  setRuleForm,
  savingRule,
}: MobileSettingsViewProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Sub-drawers on Mobile
  const [rulesSheetOpen, setRulesSheetOpen] = useState(false);
  const [newRuleModalOpen, setNewRuleModalOpen] = useState(false);
  const [simulatorSheetOpen, setSimulatorSheetOpen] = useState(false);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [dateFormatSheetOpen, setDateFormatSheetOpen] = useState(false);
  const [defaultTabSheetOpen, setDefaultTabSheetOpen] = useState(false);

  // Simulation test state
  const [simSender, setSimSender] = useState("alerts@hdfcbank.net");
  const [simSubject, setSimSubject] = useState("Alert: Update on your HDFC Bank Account");
  const [simBody, setSimBody] = useState(
    "Dear Customer, Rs.799.00 has been debited from your account **4321 to VPA store@icici on 30-10-26 via UPI txn 430198271829. Avbl bal: Rs 34,120.00."
  );
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const handleTestSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simBody.trim()) return;
    try {
      setSimulating(true);
      setSimResult(null);
      const res = await api.simulateEmailSync({
        sender: simSender,
        subject: simSubject,
        body: simBody,
      });
      setSimResult(res);
      toast.success("Simulation Complete", "Raw alert parsed successfully.");
    } catch (err: any) {
      toast.error("Simulation Failed", err.message || "Failed to parse simulation email");
    } finally {
      setSimulating(false);
    }
  };

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="md:hidden space-y-4 pb-28 select-none">
      {/* ========================================================= */}
      {/* 1. MOBILE SETTINGS HEADER & LIVE SYNC CARD                */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h1>
            <p className="text-xs text-slate-500 font-medium">Finora Personal Ledger Preferences</p>
          </div>

          <button
            type="button"
            onClick={onSyncNow}
            disabled={syncing || !status?.connected}
            className="btn-primary h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            <span>{syncing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search preferences, rules, currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6C3BFF] shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Gmail Bank Connection Status Hero Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-slate-50 border border-purple-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#6C3BFF]/10 text-[#6C3BFF] border border-[#6C3BFF]/20 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 truncate">HDFC Gmail Sync</h3>
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      status?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                    )}
                  />
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {status?.connected ? status.email : "Mailbox disconnected"}
                </p>
              </div>
            </div>

            <span
              className={cn(
                "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                status?.connected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}
            >
              {status?.connected ? "Active" : "Offline"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-purple-100/80 text-[10px]">
            <div>
              <span className="text-slate-400 font-medium block">Last Mailbox Polling</span>
              <span className="font-bold text-slate-700">
                {status?.lastSyncAt ? formatDateTime(status.lastSyncAt) : "Never"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Total Scanned / Extracted</span>
              <span className="font-bold text-slate-700">
                {status?.totalEmailsProcessed ?? 0} scanned · {status?.totalTransactionsExtracted ?? 0} txns
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. GROUPED INSET CARDS (APPLE-GRADE MOBILE SETTINGS)      */}
      {/* ========================================================= */}

      {/* GROUP A: FINANCIAL PREFERENCES */}
      {(matchesSearch("currency") ||
        matchesSearch("date") ||
        matchesSearch("tab") ||
        matchesSearch("general")) && (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#6C3BFF]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Financial Preferences
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* Currency */}
            <button
              type="button"
              onClick={() => setCurrencySheetOpen(true)}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-bold text-slate-800">Primary Currency</p>
                <p className="text-[11px] text-slate-400">Used across balances & charts</p>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="text-[#6C3BFF] font-black">
                  {currency === "INR" ? "INR (₹)" : currency === "USD" ? "USD ($)" : currency}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Date Display Format */}
            <button
              type="button"
              onClick={() => setDateFormatSheetOpen(true)}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-bold text-slate-800">Date Display Format</p>
                <p className="text-[11px] text-slate-400">Timestamps in ledger rows</p>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="text-[#6C3BFF]">{dateFormat}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Default Startup View */}
            <button
              type="button"
              onClick={() => setDefaultTabSheetOpen(true)}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-bold text-slate-800">Default Startup Tab</p>
                <p className="text-[11px] text-slate-400">Opens automatically when launched</p>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                <span className="text-[#6C3BFF]">
                  {defaultTab === "/"
                    ? "Dashboard"
                    : defaultTab === "/calendar"
                    ? "Calendar"
                    : defaultTab === "/transactions"
                    ? "Transactions"
                    : "Debt & Lent"}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* GROUP B: BANK AUTOMATION & RULES */}
      {(matchesSearch("rules") ||
        matchesSearch("merchant") ||
        matchesSearch("simulator") ||
        matchesSearch("gmail")) && (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#6C3BFF]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Automation & Smart Rules
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* Merchant Auto-Classification Rules */}
            <button
              type="button"
              onClick={() => setRulesSheetOpen(true)}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-bold text-slate-800">Merchant Classification Rules</p>
                <p className="text-[11px] text-slate-400">Auto-clean titles & assign categories</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-[#6C3BFF] border border-purple-200/80">
                  {rules.length} {rules.length === 1 ? "Rule" : "Rules"}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>

            {/* Email Diagnostics / Simulator */}
            <button
              type="button"
              onClick={() => setSimulatorSheetOpen(true)}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div>
                <p className="font-bold text-slate-800">Email Parser Diagnostic</p>
                <p className="text-[11px] text-slate-400">Test raw HDFC alert string ingestion</p>
              </div>
              <div className="flex items-center gap-1 text-slate-500 font-semibold">
                <Terminal className="w-3.5 h-3.5 text-[#6C3BFF]" />
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* GROUP C: DISPLAY & ACCESSIBILITY */}
      {(matchesSearch("motion") ||
        matchesSearch("density") ||
        matchesSearch("appearance")) && (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#6C3BFF]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Display & Feel
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* Reduced Motion Toggle */}
            <div className="px-3.5 py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Reduced Motion</p>
                <p className="text-[11px] text-slate-400">Instant transitions instead of physics</p>
              </div>
              <button
                type="button"
                onClick={() => onTogglePreference("reduced_motion", reducedMotion)}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative cursor-pointer",
                  reducedMotion ? "bg-[#6C3BFF]" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-md block absolute top-0.5 transition-transform",
                    reducedMotion ? "left-5.5" : "left-0.5"
                  )}
                />
              </button>
            </div>

            {/* Compact Table Density */}
            <div className="px-3.5 py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Compact Density</p>
                <p className="text-[11px] text-slate-400">Slimmer padding in transaction rows</p>
              </div>
              <button
                type="button"
                onClick={() => onTogglePreference("compact_density", compactDensity)}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative cursor-pointer",
                  compactDensity ? "bg-[#6C3BFF]" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-md block absolute top-0.5 transition-transform",
                    compactDensity ? "left-5.5" : "left-0.5"
                  )}
                />
              </button>
            </div>

            {/* Cashflow Graph Colors Palette */}
            <div className="px-3.5 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">Graph Color Palette</p>
                <p className="text-[11px] text-slate-400">Inflow & Outflow bar colors</p>
              </div>
              <select
                value={chartPalette}
                onChange={(e) => onUpdatePreference("chart_palette", e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="default">Emerald & Violet</option>
                <option value="red-green">Red & Green</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* GROUP D: SECURITY & DATA EXPORT */}
      {(matchesSearch("security") ||
        matchesSearch("export") ||
        matchesSearch("data") ||
        matchesSearch("csv")) && (
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Security & Ledger Data
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* Encryption info */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold text-slate-800">256-Bit Bank Encryption</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => onExport("csv")}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Export Ledger as CSV</p>
                  <p className="text-[11px] text-slate-400">Compatible with Excel & Sheets</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={() => onExport("json")}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-[#6C3BFF] flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Export Technical JSON</p>
                  <p className="text-[11px] text-slate-400">Complete raw transaction payload</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>

            {/* Reset Local Cache */}
            <button
              type="button"
              onClick={onClearCache}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-rose-50 transition-colors text-rose-600 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold">Reset Client Cache</p>
                  <p className="text-[11px] text-rose-400">Clears offline tokens and local filters</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      )}

      {/* GROUP E: ABOUT FINORA */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-center space-y-1">
        <p className="text-xs font-black text-slate-900 tracking-tight">Finora by PayTrace</p>
        <p className="text-[11px] text-slate-500 font-medium">
          Version 2.4.0 · Spring Boot 3.3.4 & Next.js 16
        </p>
        <p className="text-[10px] text-slate-400 pt-1">
          Automated HDFC Bank financial intelligence engine
        </p>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM SHEETS FOR SUB-SECTIONS                            */}
      {/* ========================================================= */}

      {/* 1. CURRENCY SELECTOR SHEET */}
      <AnimatePresence>
        {currencySheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCurrencySheetOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-3"
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-2" />
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Select Primary Currency</h3>
                <button
                  type="button"
                  onClick={() => setCurrencySheetOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 pt-1 text-xs font-bold">
                {[
                  { id: "INR", label: "Indian Rupee (₹ INR)" },
                  { id: "USD", label: "US Dollar ($ USD)" },
                  { id: "EUR", label: "Euro (€ EUR)" },
                  { id: "GBP", label: "British Pound (£ GBP)" },
                ].map((cur) => (
                  <button
                    key={cur.id}
                    type="button"
                    onClick={() => {
                      onUpdatePreference("currency", cur.id);
                      setCurrencySheetOpen(false);
                    }}
                    className={cn(
                      "w-full p-3 rounded-xl flex items-center justify-between border transition-all cursor-pointer",
                      currency === cur.id
                        ? "bg-[#6C3BFF]/10 text-[#5228E0] border-[#6C3BFF]"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                    )}
                  >
                    <span>{cur.label}</span>
                    {currency === cur.id && <CheckCircle2 className="w-4 h-4 text-[#6C3BFF]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. DATE FORMAT SELECTOR SHEET */}
      <AnimatePresence>
        {dateFormatSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDateFormatSheetOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-3"
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-2" />
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Select Date Format</h3>
                <button
                  type="button"
                  onClick={() => setDateFormatSheetOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 pt-1 text-xs font-bold">
                {[
                  { id: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 02/11/2026)" },
                  { id: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 11/02/2026)" },
                  { id: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO Format)" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      onUpdatePreference("date_format", fmt.id);
                      setDateFormatSheetOpen(false);
                    }}
                    className={cn(
                      "w-full p-3 rounded-xl flex items-center justify-between border transition-all cursor-pointer",
                      dateFormat === fmt.id
                        ? "bg-[#6C3BFF]/10 text-[#5228E0] border-[#6C3BFF]"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                    )}
                  >
                    <span>{fmt.label}</span>
                    {dateFormat === fmt.id && <CheckCircle2 className="w-4 h-4 text-[#6C3BFF]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. DEFAULT TAB SELECTOR SHEET */}
      <AnimatePresence>
        {defaultTabSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDefaultTabSheetOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-3"
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-2" />
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Startup View</h3>
                <button
                  type="button"
                  onClick={() => setDefaultTabSheetOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 pt-1 text-xs font-bold">
                {[
                  { id: "/", label: "Overview Dashboard" },
                  { id: "/calendar", label: "Monthly Calendar" },
                  { id: "/transactions", label: "Transactions Ledger" },
                  { id: "/debt-lent", label: "Debt & Lent Split" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onUpdatePreference("default_tab", tab.id);
                      setDefaultTabSheetOpen(false);
                    }}
                    className={cn(
                      "w-full p-3 rounded-xl flex items-center justify-between border transition-all cursor-pointer",
                      defaultTab === tab.id
                        ? "bg-[#6C3BFF]/10 text-[#5228E0] border-[#6C3BFF]"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                    )}
                  >
                    <span>{tab.label}</span>
                    {defaultTab === tab.id && <CheckCircle2 className="w-4 h-4 text-[#6C3BFF]" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MERCHANT RULES MANAGEMENT DRAWER */}
      <AnimatePresence>
        {rulesSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRulesSheetOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-3"
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-2" />
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Merchant Classification Rules</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{rules.length} Active Rules</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewRuleModalOpen(true)}
                    className="btn-primary px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRulesSheetOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Apply All Action Banner */}
              <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200/80 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-purple-950">Batch Re-Classify</p>
                  <p className="text-[10px] text-purple-800">Apply all rules to historical records</p>
                </div>
                <button
                  type="button"
                  onClick={onApplyAllRules}
                  disabled={applyingAllRules || rules.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-[#6C3BFF] text-white text-[11px] font-bold shadow-2xs hover:bg-[#5228E0] active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {applyingAllRules ? "Applying..." : "Run All"}
                </button>
              </div>

              {/* Rules List */}
              <div className="space-y-2 pt-1 max-h-[50vh] overflow-y-auto no-scrollbar">
                {rules.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No classification rules configured yet.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded">
                            {rule.rawMerchant}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-black text-slate-900">{rule.cleanMerchantName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <CategoryBadge category={rule.category} className="scale-75 origin-left" />
                          <span className="text-[10px] text-slate-400 uppercase font-bold">
                            {rule.matchType}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => rule.id && onDeleteRule(rule.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. ADD NEW RULE MODAL */}
      <AnimatePresence>
        {newRuleModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNewRuleModalOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full bg-white rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-3.5"
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-2" />
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Merchant Rule</h3>
                <button
                  type="button"
                  onClick={() => setNewRuleModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  await onSaveRule(e);
                  setNewRuleModalOpen(false);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Raw Merchant String in Bank SMS / Alert
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PREMNATH A, ZOMATO LTD"
                    value={ruleForm.rawMerchant}
                    onChange={(e) => setRuleForm({ ...ruleForm, rawMerchant: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Clean Display Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metro Cafe, Zomato"
                    value={ruleForm.cleanMerchantName}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, cleanMerchantName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Auto Category</label>
                    <select
                      value={ruleForm.category}
                      onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Match Type</label>
                    <select
                      value={ruleForm.matchType}
                      onChange={(e) => setRuleForm({ ...ruleForm, matchType: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                    >
                      <option value="CONTAINS">Contains</option>
                      <option value="EXACT">Exact Match</option>
                      <option value="STARTS_WITH">Starts With</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ruleForm.applyToExisting}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, applyToExisting: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#6C3BFF] focus:ring-[#6C3BFF] cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-slate-700">
                    Apply to all matching historical transactions
                  </span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewRuleModalOpen(false)}
                    className="btn-secondary px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRule}
                    className="btn-primary px-5 py-2 rounded-xl text-xs font-bold text-white shadow-2xs"
                  >
                    {savingRule ? "Saving..." : "Save Rule"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. EMAIL DIAGNOSTICS / SIMULATOR DRAWER */}
      <AnimatePresence>
        {simulatorSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSimulatorSheetOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative w-full max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl p-5 pb-8 shadow-2xl z-10 space-y-3"
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-2" />
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Email Ingestion Diagnostic</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Test HDFC Regex & AI Parser</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulatorSheetOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleTestSimulation} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-0.5">Sender Email</label>
                  <input
                    type="text"
                    value={simSender}
                    onChange={(e) => setSimSender(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-0.5">Subject</label>
                  <input
                    type="text"
                    value={simSubject}
                    onChange={(e) => setSimSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#6C3BFF]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-0.5">
                    Raw SMS / Email Body
                  </label>
                  <textarea
                    rows={3}
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-[#6C3BFF] font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={simulating}
                  className="btn-primary w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-2xs flex items-center justify-center gap-1.5"
                >
                  <Send className={cn("w-3.5 h-3.5", simulating && "animate-spin")} />
                  <span>{simulating ? "Parsing..." : "Test Ingestion Parser"}</span>
                </button>
              </form>

              {/* Simulation Output Card */}
              {simResult && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="font-black text-slate-900">Extracted Output</span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.2 rounded-full",
                        simResult.success
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      )}
                    >
                      {simResult.success ? "Success" : "Failed"}
                    </span>
                  </div>

                  {simResult.transaction ? (
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount:</span>
                        <strong className="text-rose-600 font-black">
                          ₹{simResult.transaction.amount}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Merchant:</span>
                        <strong className="text-slate-900">{simResult.transaction.merchant}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Category:</span>
                        <strong className="text-purple-700">{simResult.transaction.category}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ref / UPI:</span>
                        <span className="font-mono">{simResult.transaction.referenceNumber || "N/A"}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-600">{simResult.message || "Failed to extract"}</p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
