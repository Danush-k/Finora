"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { GmailStatus, MerchantRule } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import CategoryBadge from "@/components/common/CategoryBadge";
import {
  Mail,
  ShieldCheck,
  RefreshCw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sliders,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  Plus,
  Trash2,
  Store,
  ArrowRight,
} from "lucide-react";
import { SettingsSkeleton } from "@/components/common/LoadingSkeletons";

export default function SettingsPage() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Simulation test state
  const [simSender, setSimSender] = useState("alerts@hdfcbank.net");
  const [simSubject, setSimSubject] = useState("Alert: Update on your HDFC Bank Account");
  const [simBody, setSimBody] = useState(
    "Dear Customer, Rs.799.00 has been debited from your account **4321 to VPA swiggy@icici on 30-10-26 via UPI txn 430198271829. Avbl bal: Rs 34,120.00."
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
      setRuleFeedback(`Rule saved: "${ruleForm.rawMerchant.trim()}" ➔ "${ruleForm.cleanMerchantName.trim()}"`);
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
      setRuleFeedback(err.message || "Failed to save rule");
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
    } catch (err: any) {
      alert(err.message || "Failed to delete rule");
    }
  };

  const handleApplyAllRules = async () => {
    try {
      setApplyingAllRules(true);
      setRuleFeedback(null);
      const res = await api.applyAllMerchantRules();
      setRuleFeedback(`Successfully processed historical transactions: ${res.totalModifiedCount} transactions updated!`);
    } catch (err: any) {
      setRuleFeedback(err.message || "Failed to apply rules");
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
      alert(
        err.message ||
          "Google OAuth is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend application.yml or .env"
      );
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setSyncFeedback(null);
      const result = await api.triggerSync();
      setSyncFeedback(
        `Sync completed: ${result.processed} new transactions extracted, ${result.duplicates} duplicates skipped.`
      );
      await fetchStatus();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finora-sync-completed"));
      }
    } catch (err: any) {
      setSyncFeedback(err.message || "Failed to trigger sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm("Disconnect this Gmail account from PayTrace?")) {
      try {
        await api.disconnectGmail();
        await fetchStatus();
      } catch (e) {
        alert("Failed to disconnect Gmail account");
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
      await fetchStatus();
    } catch (err: any) {
      setSimResult({ error: err.message || "Simulation failed" });
    } finally {
      setSimulating(false);
    }
  };

  const redirectUri = "http://localhost:8080/api/gmail/callback";

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  if (loading && !status) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Settings & Integration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your Gmail connection, automated sync parameters, and test pipelines
        </p>
      </div>

      {/* Gmail Connection Status Card */}
      <div className="rounded-2xl liquid-glass p-6 border border-slate-200/80 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl ${
                status?.connected
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Gmail Account
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    status?.connected
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {status?.connected ? "CONNECTED" : "NOT CONNECTED"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {status?.connected
                  ? `Active inbox linked: ${status.email}`
                  : "Connect your personal Gmail to monitor incoming HDFC transactions"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status?.connected ? (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={handleConnectGmail}
                className="btn-primary flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-white text-xs font-semibold cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span className="text-white font-semibold">Connect Gmail</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Status Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-500 text-[11px] font-medium">Last Sync</span>
            <p className="font-bold text-slate-900 mt-1">
              {status?.lastSyncAt ? formatDateTime(status.lastSyncAt) : "Never"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-500 text-[11px] font-medium">Emails Scanned</span>
            <p className="font-bold text-slate-900 mt-1">
              {status?.totalEmailsProcessed || 0}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-500 text-[11px] font-medium">Auto Sync Cycle</span>
            <p className="font-bold text-slate-900 mt-1">
              Every {status?.syncIntervalSeconds ? status.syncIntervalSeconds / 60 : 2} mins
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-500 text-[11px] font-medium">HDFC Senders</span>
            <p className="font-bold text-slate-900 mt-1 truncate" title={status?.senderFilter}>
              alerts@hdfcbank.net
            </p>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button
            onClick={handleSyncNow}
            disabled={syncing || !status?.connected}
            className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5228E0] ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Synchronising Inbox..." : "Sync Now"}</span>
          </button>

          {syncFeedback && (
            <p className="text-xs text-indigo-700 font-semibold">{syncFeedback}</p>
          )}
        </div>
      </div>

      {/* Merchant Auto-Classification Rules & Aliases */}
      <div className="rounded-2xl liquid-glass p-6 border border-slate-200/80 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Merchant Classification Rules &amp; Aliases
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                  {rules.length} active rule{rules.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically rename raw UPI recipient names (e.g. &quot;PREMNATH A&quot;) to friendly shop names (e.g. &quot;PREMNATH A (Metro Cafe)&quot;) and assign categories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyAllRules}
              disabled={applyingAllRules || rules.length === 0}
              className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
              title="Run all rules across entire historical database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#5228E0] ${applyingAllRules ? "animate-spin" : ""}`} />
              <span>{applyingAllRules ? "Applying..." : "Run On History"}</span>
            </button>
            <button
              type="button"
              onClick={() => setNewRuleOpen(!newRuleOpen)}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span className="text-white font-semibold">New Rule</span>
            </button>
          </div>
        </div>

        {ruleFeedback && (
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600" />
            <span>{ruleFeedback}</span>
          </div>
        )}

        {/* New Rule Form */}
        {newRuleOpen && (
          <form
            onSubmit={handleSaveRule}
            className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-3 animate-fadeIn text-xs"
          >
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-600" />
              <span>Create Merchant Auto-Classification Rule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Raw Merchant Name / ID</label>
                <input
                  type="text"
                  placeholder="e.g. PREMNATH A, 7010818264@slc"
                  value={ruleForm.rawMerchant}
                  onChange={(e) => setRuleForm({ ...ruleForm, rawMerchant: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. PREMNATH A (Metro Cafe)"
                  value={ruleForm.cleanMerchantName}
                  onChange={(e) => setRuleForm({ ...ruleForm, cleanMerchantName: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Default Category</label>
                <select
                  value={ruleForm.category}
                  onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ruleForm.applyToExisting}
                  onChange={(e) => setRuleForm({ ...ruleForm, applyToExisting: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-slate-700 font-medium">
                  Apply to all existing transactions matching this pattern immediately
                </span>
              </label>

              <div className="flex items-center gap-2 self-end">
                <button
                  type="button"
                  onClick={() => setNewRuleOpen(false)}
                  className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  className="btn-primary px-5 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <span className="text-white font-semibold">{savingRule ? "Saving..." : "Save Rule"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Rules Table / Cards */}
        {loadingRules ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 space-y-2">
            <Store className="w-6 h-6 mx-auto text-slate-400" />
            <p className="font-semibold text-slate-700">No merchant rules configured yet</p>
            <p className="max-w-md mx-auto text-[11px] text-slate-500">
              When you edit a transaction and rename a merchant (like changing PREMNATH A to Metro Cafe), Finora can remember that rule and auto-classify all past and future transactions!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono font-semibold text-[11px]">
                    {rule.rawMerchant}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-900">
                    {rule.cleanMerchantName}
                  </span>
                  <CategoryBadge category={rule.category} />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id!)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instant Test Simulator (Zero Credentials Required!) */}
      <div className="rounded-2xl liquid-glass p-6 border border-slate-200/80 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Instant HDFC Email Ingestion Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Test the end-to-end extraction, regex parsing, categorization, and duplicate check immediately
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSimulateSync} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Sender</label>
              <input
                type="text"
                value={simSender}
                onChange={(e) => setSimSender(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Subject</label>
              <input
                type="text"
                value={simSubject}
                onChange={(e) => setSimSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Email Body Content</label>
            <textarea
              rows={3}
              value={simBody}
              onChange={(e) => setSimBody(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold">Quick templates:</span>
              <button
                type="button"
                onClick={() =>
                  setSimBody(
                    "Dear Customer, Rs.499.00 has been debited from your account **1234 to VPA swiggy@icici on 30-10-26 via UPI txn 430129849201. Avbl bal: Rs 45,210.50."
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
              >
                Swiggy UPI
              </button>
              <button
                type="button"
                onClick={() =>
                  setSimBody(
                    "An amount of INR 2,499.00 has been spent on your HDFC Bank Credit Card ending 9876 at AMAZON INDIA on 29-10-26 at 14:32:10. Auth code: 789123."
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
              >
                Amazon Card
              </button>
              <button
                type="button"
                onClick={() =>
                  setSimBody(
                    "Dear Customer, Rs. 85,000.00 has been credited to your account **1234 on 30-10-26 by INFOSYS TECH SALARY. UPI Ref no 430182910291."
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
              >
                Salary Credit
              </button>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="btn-primary px-5 py-2.5 rounded-2xl text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <span className="text-white font-semibold">{simulating ? "Processing..." : "Simulate Ingestion"}</span>
            </button>
          </div>
        </form>

        {simResult && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700">Result: </span>
            <span
              className={
                simResult.processingStatus === "PROCESSED"
                  ? "text-emerald-600 font-extrabold"
                  : simResult.processingStatus === "DUPLICATE"
                  ? "text-amber-600 font-extrabold"
                  : "text-rose-600 font-extrabold"
              }
            >
              {simResult.processingStatus || JSON.stringify(simResult)}
            </span>
            {simResult.extractedTransactionId && (
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Extracted transaction saved to MongoDB with ID: {simResult.extractedTransactionId}.
                Check your Overview or Calendar view!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Google Cloud OAuth 2.0 Credentials Guide */}
      <div className="rounded-2xl liquid-glass p-6 border border-slate-200/80 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
            <KeyRound className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              How to Obtain Google Cloud OAuth Credentials
            </h3>
            <p className="text-xs text-slate-500">
              Required for automated real-time reading from your personal Gmail inbox
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-700">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
            <p className="font-bold text-slate-900">1. Create a Google Cloud Project</p>
            <p className="text-slate-600">
              Visit{" "}
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 font-semibold underline inline-flex items-center gap-1"
              >
                console.cloud.google.com <ExternalLink className="w-3 h-3" />
              </a>{" "}
              and create a new project named &quot;Finora PayTrace&quot;.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
            <p className="font-bold text-slate-900">2. Enable Gmail API</p>
            <p className="text-slate-600">
              In &quot;APIs & Services&quot; &gt; &quot;Library&quot;, search for{" "}
              <span className="text-slate-900 font-mono font-semibold">Gmail API</span> and click{" "}
              <span className="text-emerald-700 font-bold">Enable</span>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
            <p className="font-bold text-slate-900">3. Configure OAuth Consent Screen & Credentials</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>Choose &quot;External&quot; user type and add your personal Gmail as a test user.</li>
              <li>Add scope: <code className="text-indigo-700 font-semibold">https://www.googleapis.com/auth/gmail.readonly</code></li>
              <li>Go to &quot;Credentials&quot; &gt; &quot;Create Credentials&quot; &gt; &quot;OAuth client ID&quot;.</li>
              <li>Application type: <span className="text-slate-900 font-semibold">Web application</span>.</li>
              <li>
                Authorized redirect URI:
                <div className="flex items-center gap-2 mt-1">
                  <code className="px-2 py-1 bg-white rounded border border-slate-200 text-indigo-700 font-mono text-[11px]">
                    {redirectUri}
                  </code>
                  <button
                    onClick={handleCopyRedirect}
                    className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                    title="Copy URI"
                  >
                    {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
            <p className="font-bold text-slate-900">4. Configure Environment Variables</p>
            <p className="text-slate-600">
              Provide the Client ID and Client Secret in <code className="text-slate-800 font-mono font-semibold">.env</code> or directly provide them in the chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
