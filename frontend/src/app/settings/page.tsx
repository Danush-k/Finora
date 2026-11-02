"use client";

import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { GmailStatus, MerchantRule } from "@/types";
import { formatDateTime, cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import CategoryBadge from "@/components/common/CategoryBadge";
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
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  LogOut,
  Lock,
  ArrowRight,
  Download,
  Terminal,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { SettingsSkeleton } from "@/components/common/LoadingSkeletons";
import { useToast } from "@/lib/toast-context";
import { motion, AnimatePresence } from "framer-motion";

type SettingsTab =
  | "general"
  | "appearance"
  | "gmail"
  | "rules"
  | "simulator"
  | "security"
  | "data"
  | "about";

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [searchQuery, setSearchQuery] = useState("");

  // Backend state
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Simulation test state
  const [simSender, setSimSender] = useState("alerts@hdfcbank.net");
  const [simSubject, setSimSubject] = useState("Alert: Update on your HDFC Bank Account");
  const [simBody, setSimBody] = useState(
    "Dear Customer, Rs.799.00 has been debited from your account **4321 to VPA store@icici on 30-10-26 via UPI txn 430198271829. Avbl bal: Rs 34,120.00."
  );
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Merchant Rules State
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    rawMerchant: "",
    cleanMerchantName: "",
    category: "Food & Dining",
    matchType: "CONTAINS",
    applyToExisting: true,
  });
  const [savingRule, setSavingRule] = useState(false);
  const [applyingAllRules, setApplyingAllRules] = useState(false);
  const [ruleFeedback, setRuleFeedback] = useState<string | null>(null);

  // Local preferences
  const [currency, setCurrency] = useState("INR");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [defaultTab, setDefaultTab] = useState("/");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState("15");

  // Load local preferences on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrency(localStorage.getItem("finora_currency") || "INR");
      setDateFormat(localStorage.getItem("finora_date_format") || "DD/MM/YYYY");
      setDefaultTab(localStorage.getItem("finora_default_tab") || "/");
      setReducedMotion(localStorage.getItem("finora_reduced_motion") === "true");
      setCompactDensity(localStorage.getItem("finora_compact_density") === "true");
    }
  }, []);

  const handleUpdatePreference = (key: string, val: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`finora_${key}`, val);
    }
    if (key === "currency") setCurrency(val);
    if (key === "date_format") setDateFormat(val);
    if (key === "default_tab") setDefaultTab(val);
    toast.success("Preference Saved", `${key.replace("_", " ")} updated to ${val}`);
  };

  const handleTogglePreference = (key: string, currentVal: boolean) => {
    const newVal = !currentVal;
    if (typeof window !== "undefined") {
      localStorage.setItem(`finora_${key}`, String(newVal));
    }
    if (key === "reduced_motion") setReducedMotion(newVal);
    if (key === "compact_density") setCompactDensity(newVal);
    toast.info("Setting Updated", `${key.replace("_", " ")}: ${newVal ? "Enabled" : "Disabled"}`);
  };

  const fetchStatus = async () => {
    try {
      setLoadingRules(true);
      const [gmailData, rulesData] = await Promise.all([
        api.getGmailStatus(),
        api.getMerchantRules().catch(() => []),
      ]);
      setStatus(gmailData);
      setRules(rulesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.rawMerchant.trim() || !ruleForm.cleanMerchantName.trim()) {
      return;
    }
    try {
      setSavingRule(true);
      setRuleFeedback(null);
      await api.saveMerchantRule({
        rawMerchant: ruleForm.rawMerchant.trim(),
        cleanMerchantName: ruleForm.cleanMerchantName.trim(),
        category: ruleForm.category,
        matchType: ruleForm.matchType,
        applyToExisting: ruleForm.applyToExisting,
      });
      const ruleMsg = `Rule saved: "${ruleForm.rawMerchant.trim()}" ➔ "${ruleForm.cleanMerchantName.trim()}"`;
      setRuleFeedback(ruleMsg);
      toast.success("Rule Saved", ruleMsg);
      setRuleForm({
        rawMerchant: "",
        cleanMerchantName: "",
        category: "Food & Dining",
        matchType: "CONTAINS",
        applyToExisting: true,
      });
      setNewRuleOpen(false);
      const updated = await api.getMerchantRules();
      setRules(updated);
    } catch (err: any) {
      const errMsg = err.message || "Failed to save rule";
      setRuleFeedback(errMsg);
      toast.error("Save Failed", errMsg);
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this merchant auto-classification rule?")) return;
    try {
      await api.deleteMerchantRule(id);
      const updated = await api.getMerchantRules();
      setRules(updated);
      toast.info("Rule Deleted", "Merchant rule removed.");
    } catch (err: any) {
      toast.error("Delete Failed", err.message || "Failed to delete rule");
    }
  };

  const handleApplyAllRules = async () => {
    try {
      setApplyingAllRules(true);
      setRuleFeedback(null);
      const res = await api.applyAllMerchantRules();
      const feedbackMsg = `Successfully processed historical transactions: ${res.totalModifiedCount} transactions updated!`;
      setRuleFeedback(feedbackMsg);
      toast.success("Rules Applied", feedbackMsg);
    } catch (err: any) {
      const errMsg = err.message || "Failed to apply rules";
      setRuleFeedback(errMsg);
      toast.error("Application Failed", errMsg);
    } finally {
      setApplyingAllRules(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { authorizationUrl } = await api.getGmailConnectUrl();
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      }
    } catch (err: any) {
      toast.error(
        "OAuth Setup",
        err.message || "Google OAuth is not configured yet. Configure GOOGLE_CLIENT_ID in backend .env"
      );
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setSyncFeedback(null);
      const result = await api.triggerSync();
      const syncMsg = `Sync completed: ${result.processed} new transactions extracted, ${result.duplicates} duplicates skipped.`;
      setSyncFeedback(syncMsg);
      toast.success("Gmail Sync Completed", syncMsg);
      await fetchStatus();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finora-sync-completed"));
      }
    } catch (err: any) {
      const errMsg = err.message || "Failed to trigger sync";
      setSyncFeedback(errMsg);
      toast.error("Sync Failed", errMsg);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm("Disconnect this Gmail account from PayTrace?")) {
      try {
        await api.disconnectGmail();
        await fetchStatus();
        toast.info("Account Disconnected", "Gmail sync disconnected successfully.");
      } catch (e: any) {
        toast.error("Disconnect Failed", e.message || "Failed to disconnect Gmail account");
      }
    }
  };

  const handleSimulateSync = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSimulating(true);
      setSimResult(null);
      const res = await api.simulateEmailSync({
        sender: simSender,
        subject: simSubject,
        body: simBody,
      });
      setSimResult(res);
      toast.success("Simulation Parsed", "HDFC email body extracted successfully.");
      await fetchStatus();
    } catch (err: any) {
      setSimResult({ error: err.message || "Simulation failed" });
      toast.error("Simulation Error", err.message || "Failed to parse email");
    } finally {
      setSimulating(false);
    }
  };

  const redirectUri = "http://localhost:8080/api/gmail/callback";

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    toast.success("Copied to Clipboard", "Redirect URI copied.");
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  const handleExportData = async (format: "csv" | "json") => {
    try {
      const data = await api.getTransactions({ page: 0, size: 5000 });
      const txns = data.content || [];
      if (txns.length === 0) {
        toast.info("Export", "No transaction records to export.");
        return;
      }

      let blob: Blob;
      let filename: string;
      if (format === "json") {
        blob = new Blob([JSON.stringify(txns, null, 2)], { type: "application/json" });
        filename = `finora-transactions-${new Date().toISOString().split("T")[0]}.json`;
      } else {
        const headers = ["ID", "Date", "Merchant", "Amount", "Type", "Category", "Payment Method", "Reference"];
        const rows = txns.map((t) => [
          t.id,
          t.transactionDate || "",
          `"${(t.merchant || "").replace(/"/g, '""')}"`,
          t.amount,
          t.transactionType,
          t.category,
          t.paymentMethod,
          t.referenceNumber || "",
        ]);
        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        filename = `finora-transactions-${new Date().toISOString().split("T")[0]}.csv`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Export Complete", `Downloaded ${filename} successfully.`);
    } catch (e: any) {
      toast.error("Export Failed", e.message || "Failed to generate export file");
    }
  };

  const handleClearCache = () => {
    if (confirm("Reset client application storage and local preferences?")) {
      localStorage.clear();
      toast.success("Cache Cleared", "Local storage reset to default settings.");
      setTimeout(() => window.location.reload(), 800);
    }
  };

  // Sidebar navigation items
  const sidebarItems: { id: SettingsTab; label: string; icon: any; badge?: string }[] = [
    { id: "general", label: "General", icon: Sliders },
    { id: "appearance", label: "Appearance", icon: Palette },
    {
      id: "gmail",
      label: "Gmail & Bank Sync",
      icon: Mail,
      badge: status?.connected ? "Active" : "Offline",
    },
    {
      id: "rules",
      label: "Merchant Rules",
      icon: Sparkles,
      badge: rules.length > 0 ? String(rules.length) : undefined,
    },
    { id: "simulator", label: "Email Diagnostics", icon: Send },
    { id: "security", label: "Security & Lock", icon: ShieldCheck },
    { id: "data", label: "Data Management", icon: Database },
    { id: "about", label: "About Finora", icon: Info },
  ];

  // All searchable settings preferences for dynamic live autocomplete
  const searchKeywords = [
    { title: "Default Currency", tab: "general" as SettingsTab, desc: "INR (₹), USD ($), EUR (€), GBP (£)" },
    { title: "Date Display Format", tab: "general" as SettingsTab, desc: "DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD" },
    { title: "Default Startup View", tab: "general" as SettingsTab, desc: "Dashboard, Calendar, Transactions" },
    { title: "Reduced Motion", tab: "appearance" as SettingsTab, desc: "Fluid physics vs instant cuts" },
    { title: "Compact Table Density", tab: "appearance" as SettingsTab, desc: "Tighter spacing for ledger rows" },
    { title: "Gmail Mailbox Sync", tab: "gmail" as SettingsTab, desc: "Automated HDFC alert polling & sync" },
    { title: "Google OAuth Redirect URI", tab: "gmail" as SettingsTab, desc: "Callback configuration for Google Cloud" },
    { title: "Merchant Classification Rules", tab: "rules" as SettingsTab, desc: "Clean merchant titles & auto-category" },
    { title: "Email Ingestion Simulator", tab: "simulator" as SettingsTab, desc: "Test raw HDFC alert email parsing" },
    { title: "Biometric & PIN Lock", tab: "security" as SettingsTab, desc: "Session security & inactivity timeout" },
    { title: "Export CSV Ledger", tab: "data" as SettingsTab, desc: "Download all transaction records" },
    { title: "Export JSON Technical Dump", tab: "data" as SettingsTab, desc: "Structured data export" },
    { title: "Clear Application Cache", tab: "data" as SettingsTab, desc: "Reset local storage preferences" },
    { title: "Finora Engine Architecture", tab: "about" as SettingsTab, desc: "Spring Boot 3.3 + MongoDB engine" },
  ];

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchKeywords.filter(
      (k) => k.title.toLowerCase().includes(q) || k.desc.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery]);

  const [showSettingsSuggestions, setShowSettingsSuggestions] = useState(false);

  // Filtered sidebar items when user searches
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sidebarItems;
    const q = searchQuery.toLowerCase();
    return sidebarItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [searchQuery, sidebarItems]);

  return (
    <div className="space-y-4 pb-28 max-w-6xl mx-auto select-none">
      {/* Top Breadcrumb & Page Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shadow-2xs">
              <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <span>System Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure financial preferences, automated Gmail sync, and application settings
          </p>
        </div>

        {/* Global Sync Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing || !status?.connected}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
            <span>{syncing ? "Syncing..." : "Sync Mailbox"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TWO-PANEL MACOS SYSTEM SETTINGS CONTAINER WITH PREMIUM GLASS EFFECT        */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_20px_50px_rgba(108,59,255,0.08),0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[620px]">
        
        {/* ======================================================================= */}
        {/* LEFT PANEL: SETTINGS SIDEBAR (In Light Purple with High Contrast)        */}
        {/* ======================================================================= */}
        <aside className="border-b md:border-b-0 md:border-r border-purple-200/70 bg-[#F6F2FF]/95 backdrop-blur-xl p-3.5 sm:p-5 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Search Input with Dynamic Autocomplete */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onFocus={() => setShowSettingsSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSettingsSuggestions(true);
                }}
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white/95 border border-purple-200/90 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-400 transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowSettingsSuggestions(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Dynamic Suggestions Dropdown */}
              <AnimatePresence>
                {showSettingsSuggestions && searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 2, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl bg-white/95 backdrop-blur-2xl border border-purple-200 shadow-xl overflow-hidden py-1.5"
                  >
                    <div className="px-3.5 py-1 text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                      Matching Settings
                    </div>
                    {searchSuggestions.map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onMouseDown={() => {
                          setActiveTab(item.tab);
                          setSearchQuery("");
                          setShowSettingsSuggestions(false);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-purple-50/80 transition-colors flex flex-col cursor-pointer border-b border-slate-50 last:border-b-0"
                      >
                        <span className="text-xs font-bold text-slate-900">{item.title}</span>
                        <span className="text-[10px] text-slate-500 truncate">{item.desc}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation List */}
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 md:shrink md:w-full group select-none",
                      isActive
                        ? "bg-[#6C3BFF] text-white shadow-[0_4px_14px_rgba(108,59,255,0.30)] font-bold"
                        : "text-slate-600 hover:bg-purple-100/60 hover:text-purple-950"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive ? "text-white" : "text-purple-600/70 group-hover:text-purple-700"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          "ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded-full",
                          isActive
                            ? "bg-white/25 text-white"
                            : item.badge === "Active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-purple-200/80 text-purple-900"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">No matching settings</p>
              )}
            </nav>
          </div>

          {/* Quick User Identity Footer */}
          <div className="pt-3 border-t border-purple-200/60 hidden md:flex items-center justify-between text-[11px] text-purple-800/70">
            <span className="font-semibold truncate">Finora macOS Engine</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-200/60 text-purple-900 font-bold">
              v2.4
            </span>
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: SETTINGS CONTENT VIEW                                      */}
        {/* ======================================================================= */}
        <main className="p-5 sm:p-7 overflow-y-auto max-h-[750px] bg-slate-50/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* ================================================================= */}
              {/* 1. GENERAL TAB                                                    */}
              {/* ================================================================= */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      General Preferences
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure localization, currency display, and startup destinations
                    </p>
                  </div>

                  {/* Group 1: Localization */}
                  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Default Currency</h4>
                        <p className="text-[11px] text-slate-500">
                          Primary currency symbol used across charts and summary totals
                        </p>
                      </div>
                      <select
                        value={currency}
                        onChange={(e) => handleUpdatePreference("currency", e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="INR">INR (₹ - Indian Rupee)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                        <option value="GBP">GBP (£ - British Pound)</option>
                      </select>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Date Display Format</h4>
                        <p className="text-[11px] text-slate-500">
                          How calendar days and transaction dates are formatted
                        </p>
                      </div>
                      <select
                        value={dateFormat}
                        onChange={(e) => handleUpdatePreference("date_format", e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Standard)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                      </select>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Default Startup View</h4>
                        <p className="text-[11px] text-slate-500">
                          Initial destination loaded when launching Finora
                        </p>
                      </div>
                      <select
                        value={defaultTab}
                        onChange={(e) => handleUpdatePreference("default_tab", e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="/">Financial Overview (Dashboard)</option>
                        <option value="/calendar">Monthly Calendar</option>
                        <option value="/transactions">Transactions Ledger</option>
                        <option value="/debt-lent">Debt & Lent Ledger</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 2. APPEARANCE TAB                                                 */}
              {/* ================================================================= */}
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Appearance & Motion
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tailor theme styling, animation speed, and layout density
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Reduced Motion</h4>
                        <p className="text-[11px] text-slate-500">
                          Replaces fluid spring physics with instantaneous cuts
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePreference("reduced_motion", reducedMotion)}
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5",
                          reducedMotion ? "bg-purple-600" : "bg-slate-200"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full bg-white shadow-xs transition-transform",
                            reducedMotion ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Compact Table Density</h4>
                        <p className="text-[11px] text-slate-500">
                          Tighter padding for high-density transaction review
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePreference("compact_density", compactDensity)}
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5",
                          compactDensity ? "bg-purple-600" : "bg-slate-200"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full bg-white shadow-xs transition-transform",
                            compactDensity ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Accent Brand Color</h4>
                        <p className="text-[11px] text-slate-500">Primary Finora visual highlight</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#6C3BFF] ring-2 ring-purple-300 shadow-2xs" />
                        <span className="text-xs font-bold text-slate-700">Finora Purple (#6C3BFF)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 3. GMAIL & BANK SYNC TAB                                          */}
              {/* ================================================================= */}
              {activeTab === "gmail" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Gmail & Bank Integration
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Automated ingestion of HDFC Bank SMS/UPI alerts from your inbox
                    </p>
                  </div>

                  {/* Status Banner */}
                  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs border ${
                            status?.connected
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                              : "bg-rose-50 border-rose-200 text-rose-600"
                          }`}
                        >
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {status?.connected ? "HDFC Mailbox Connected" : "Mailbox Disconnected"}
                            </h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                status?.connected
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {status?.connected ? "Active Polling" : "Requires Authorization"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {status?.connected && status?.email
                              ? `Linked to ${status.email}`
                              : "Authorize Finora to read HDFC transaction alert emails"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {status?.connected ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSyncNow}
                              disabled={syncing}
                              className="btn-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                              <span>{syncing ? "Syncing..." : "Sync Now"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleDisconnect}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectGmail}
                            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Connect Gmail Account</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metadata stats */}
                    {status?.connected && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Last Sync Time</span>
                          <span className="font-bold text-slate-900">
                            {status.lastSyncAt ? formatDateTime(status.lastSyncAt) : "Never synced"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Auto Polling</span>
                          <span className="font-bold text-emerald-600">Every 15 minutes</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Engine Pipeline</span>
                          <span className="font-bold text-purple-700">HDFC Alert Parser v2</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OAuth Redirect Info Card */}
                  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900">Google OAuth Authorized Redirect URI</h4>
                    <p className="text-[11px] text-slate-500">
                      If configuring Google Cloud Console credentials, paste this exact callback URL into your OAuth credentials:
                    </p>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                      <span className="truncate flex-1">{redirectUri}</span>
                      <button
                        type="button"
                        onClick={handleCopyRedirect}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedRedirect ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedRedirect ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 4. MERCHANT RULES TAB                                             */}
              {/* ================================================================= */}
              {activeTab === "rules" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                        Merchant Auto-Classification Rules
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Automatically transform raw bank strings into clean vendor titles & categories
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRuleOpen(true)}
                        className="btn-primary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Rule</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAllRules}
                        disabled={applyingAllRules || rules.length === 0}
                        className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>{applyingAllRules ? "Applying..." : "Apply All"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Rule Form Modal / Collapsible */}
                  {newRuleOpen && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleSaveRule}
                      className="p-4 rounded-2xl bg-white border border-purple-200 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">Define Classification Rule</h4>
                        <button
                          type="button"
                          onClick={() => setNewRuleOpen(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Raw Statement Substring
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. UBER INDIA"
                            value={ruleForm.rawMerchant}
                            onChange={(e) => setRuleForm({ ...ruleForm, rawMerchant: e.target.value })}
                            required
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Clean Vendor Title
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Uber"
                            value={ruleForm.cleanMerchantName}
                            onChange={(e) => setRuleForm({ ...ruleForm, cleanMerchantName: e.target.value })}
                            required
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Assigned Category
                          </label>
                          <select
                            value={ruleForm.category}
                            onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ruleForm.applyToExisting}
                            onChange={(e) => setRuleForm({ ...ruleForm, applyToExisting: e.target.checked })}
                            className="rounded text-purple-600 focus:ring-purple-400"
                          />
                          <span>Apply rule immediately across historical records</span>
                        </label>

                        <button
                          type="submit"
                          disabled={savingRule}
                          className="btn-primary px-4 py-1.5 rounded-xl text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {savingRule ? "Saving..." : "Save Rule"}
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* Rules List */}
                  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    {rules.length > 0 ? (
                      rules.map((r) => (
                        <div key={r.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 truncate">
                              &quot;{r.rawMerchant}&quot;
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-900 truncate">{r.cleanMerchantName}</span>
                            <CategoryBadge category={r.category} className="scale-90 origin-left" />
                          </div>

                          <button
                            type="button"
                            onClick={() => r.id && handleDeleteRule(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No merchant classification rules configured. Add a rule to automatically clean raw bank text.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 5. EMAIL DIAGNOSTICS & SIMULATOR TAB                              */}
              {/* ================================================================= */}
              {activeTab === "simulator" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Email Ingestion Simulator
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verify HDFC alert pattern extraction against raw email bodies
                    </p>
                  </div>

                  <form onSubmit={handleSimulateSync} className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Sender Email</label>
                        <input
                          type="text"
                          value={simSender}
                          onChange={(e) => setSimSender(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Email Subject</label>
                        <input
                          type="text"
                          value={simSubject}
                          onChange={(e) => setSimSubject(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-500 block">Raw Email Message Body</label>
                        {/* Preset templates */}
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-slate-400">Presets:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSimBody(
                                "Dear Customer, Rs.499.00 has been debited from your account **1234 to VPA store@icici on 30-10-26 via UPI txn 430129849201. Avbl bal: Rs 45,210.50."
                              )
                            }
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                          >
                            UPI Debit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSimBody(
                                "An amount of INR 2,499.00 has been spent on your HDFC Bank Credit Card ending 9876 at AMAZON INDIA on 29-10-26 at 14:32:10. Auth code: 789123."
                              )
                            }
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                          >
                            Card POS
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSimBody(
                                "Dear Customer, Rs 85,000.00 has been credited to your account **4321 on 01-11-26 by Salary Transfer from TECH CORP PVT LTD. Avbl bal: Rs 1,19,120.00."
                              )
                            }
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                          >
                            Salary Inflow
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        value={simBody}
                        onChange={(e) => setSimBody(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={simulating}
                        className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>{simulating ? "Parsing..." : "Execute Simulation Pipeline"}</span>
                      </button>
                    </div>

                    {simResult && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
                        <span className="text-[10px] text-purple-400 block font-bold mb-1">PARSED RESULT:</span>
                        <pre>{JSON.stringify(simResult, null, 2)}</pre>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* ================================================================= */}
              {/* 6. SECURITY & LOCK TAB                                            */}
              {/* ================================================================= */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Security & Device Privacy
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Session locking, biometric FaceID / PIN protection, and credentials
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Biometric & PIN Lock</h4>
                        <p className="text-[11px] text-slate-500">
                          Protects financial ledger when device is unattended
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                        Active & Protected
                      </span>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Auto-lock Inactivity Timeout</h4>
                        <p className="text-[11px] text-slate-500">
                          Duration before session automatically locks
                        </p>
                      </div>
                      <select
                        value={autoSyncInterval}
                        onChange={(e) => setAutoSyncInterval(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="5">5 Minutes</option>
                        <option value="15">15 Minutes (Default)</option>
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                      </select>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Manual Device Lock</h4>
                        <p className="text-[11px] text-slate-500">
                          Instantly lock Finora and require PIN / Biometrics to re-enter
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.location.href = "/login";
                          }
                        }}
                        className="btn-secondary flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-purple-600" />
                        <span>Lock Application</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 7. DATA MANAGEMENT TAB                                            */}
              {/* ================================================================= */}
              {activeTab === "data" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Data Management & Backups
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Export your transaction archive and manage browser storage
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Export Ledger as CSV</h4>
                        <p className="text-[11px] text-slate-500">
                          Universal comma-separated file format compatible with Excel and Apple Numbers
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportData("csv")}
                        className="btn-secondary flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-600" />
                        <span>Download CSV</span>
                      </button>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Export Structured JSON</h4>
                        <p className="text-[11px] text-slate-500">
                          Complete technical schema dump with metadata and linked IDs
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportData("json")}
                        className="btn-secondary flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-600" />
                        <span>Download JSON</span>
                      </button>
                    </div>

                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-rose-600">Clear Application Cache</h4>
                        <p className="text-[11px] text-slate-500">
                          Clears local cached filters and preference overrides
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearCache}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                      >
                        Clear Cache
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 8. ABOUT FINORA TAB                                               */}
              {/* ================================================================= */}
              {activeTab === "about" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      About Finora
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Architecture specifications, build identifiers, and engine status
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-5 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center font-black text-purple-700 text-sm">
                        F
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Finora by PayTrace</h3>
                        <p className="text-xs text-slate-500">Automated HDFC Bank Personal Expense Tracker</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Client Version</span>
                        <span className="font-bold text-slate-900">v2.4.0 (macOS Edition)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Backend Engine</span>
                        <span className="font-bold text-slate-900">Spring Boot 3.3 + MongoDB</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Frontend Stack</span>
                        <span className="font-bold text-slate-900">Next.js 16 + Turbopack + Motion</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Security Standard</span>
                        <span className="font-bold text-emerald-600">Localhost Isolation · TLS</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
