import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { CsvTransaction, CsvVerificationResult } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  UploadCloud,
  X,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
  Check,
  Download,
  Receipt,
  RotateCcw,
  Tag,
} from "lucide-react";
import { useToast } from "@/lib/toast-context";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CsvImportModal({
  isOpen,
  onClose,
  onSuccess,
}: CsvImportModalProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification result state
  const [result, setResult] = useState<CsvVerificationResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    }
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setSelectedIds(new Set());
    setError(null);
    setImportSuccessCount(null);
    setVerifying(false);
    setImporting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setError("Please select a valid CSV file (.csv)");
        return;
      }
      setFile(selected);
      setError(null);
      setResult(null);
      setImportSuccessCount(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.toLowerCase().endsWith(".csv")) {
        setError("Please drop a valid CSV file (.csv)");
        return;
      }
      setFile(dropped);
      setError(null);
      setResult(null);
      setImportSuccessCount(null);
    }
  };

  const handleVerify = async () => {
    if (!file) {
      setError("Please select a CSV file first");
      return;
    }

    try {
      setVerifying(true);
      setError(null);
      const res = await api.verifyCsv(file);
      setResult(res);

      // By default, select all new transactions
      if (res.newTransactions && res.newTransactions.length > 0) {
        setSelectedIds(new Set(res.newTransactions.map((t) => t.id)));
      } else {
        setSelectedIds(new Set());
      }
    } catch (err: any) {
      setError(err.message || "Failed to parse and verify CSV");
    } finally {
      setVerifying(false);
    }
  };

  const toggleSelectAll = () => {
    if (!result?.newTransactions) return;
    if (selectedIds.size === result.newTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(result.newTransactions.map((t) => t.id)));
    }
  };

  const toggleSelectId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleConfirmImport = async () => {
    if (!result?.newTransactions || selectedIds.size === 0) return;

    try {
      setImporting(true);
      setError(null);

      const toImport = result.newTransactions.filter((t) => selectedIds.has(t.id));
      const count = await api.confirmCsvImport(toImport);

      setImportSuccessCount(count);
      toast.success("Transactions Imported", `Successfully imported ${count} transactions to your ledger.`);
      onSuccess();
    } catch (err: any) {
      const errMsg = err.message || "Failed to import transactions";
      setError(errMsg);
      toast.error("Import Failed", errMsg);
    } finally {
      setImporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Import Bank Statement or CSV
              </h3>
              <p className="text-xs text-slate-500">
                Automatic duplicate verification against your existing PayTrace records
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Success State */}
          {importSuccessCount !== null ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-slate-900">
                  Successfully Imported {importSuccessCount} Transactions!
                </h4>
                <p className="text-xs text-slate-500 max-w-md">
                  Your new transactions have been verified and added to your records. All dashboard charts and metrics are now updated.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    handleReset();
                    onClose();
                  }}
                  className="btn-primary px-6 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
                >
                  Done & View Dashboard
                </button>
              </div>
            </div>
          ) : verifying ? (
            /* Verifying Spinner */
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-800">
                  Verifying Transactions...
                </p>
                <p className="text-xs text-slate-400">
                  Checking CSV rows against existing database records to identify duplicates
                </p>
              </div>
            </div>
          ) : result ? (
            /* Result View: Either All Present OR New Unlisted Found */
            <div className="space-y-5 animate-in fade-in duration-150">
              {result.allPresent ? (
                /* CASE: Everything is already present in the database */
                <div className="py-8 px-6 rounded-2xl bg-gradient-to-b from-emerald-50/50 to-emerald-50/20 border border-emerald-200/80 flex flex-col items-center justify-center text-center space-y-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-lg">
                    <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                      All Transactions Already Recorded!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Every single transaction in this CSV already exists in your PayTrace records. Zero unlisted transactions were detected, so your records are already completely up to date.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-[11px] font-bold shadow-2xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>Verified {result.existingCount} duplicates against database</span>
                  </div>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleReset}
                      className="btn-secondary px-4 py-2 rounded-2xl text-xs font-semibold cursor-pointer"
                    >
                      Upload Another File
                    </button>
                    <button
                      onClick={onClose}
                      className="btn-primary px-5 py-2 rounded-2xl text-xs font-semibold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* CASE: New Unlisted Transactions Found */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                          New to Add
                        </p>
                        <p className="text-lg font-extrabold text-indigo-900 tabular-nums">
                          {result.newCount}
                        </p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Already in DB (Skipped)
                        </p>
                        <p className="text-lg font-extrabold text-slate-700 tabular-nums">
                          {result.existingCount}
                        </p>
                      </div>
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Total Rows Scanned
                        </p>
                        <p className="text-lg font-extrabold text-slate-700 tabular-nums">
                          {result.totalRows}
                        </p>
                      </div>
                      <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Informative Guidance */}
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-800 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Confirmation Required: </span>
                      <span>
                        The {result.newCount} transactions below were verified and are NOT currently in your records. Check the items you wish to add and click Confirm.
                      </span>
                    </div>
                  </div>

                  {/* Table Selection Controls */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-slate-700 hover:text-indigo-600 font-semibold cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={
                          result.newTransactions.length > 0 &&
                          selectedIds.size === result.newTransactions.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>
                        Select All ({selectedIds.size} of {result.newCount} selected)
                      </span>
                    </button>
                    <span className="text-slate-400 text-[11px]">
                      Showing unlisted transactions
                    </span>
                  </div>

                  {/* Unlisted Transactions List */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {result.newTransactions.map((txn) => {
                      const isSelected = selectedIds.has(txn.id);
                      return (
                        <div
                          key={txn.id}
                          onClick={() => toggleSelectId(txn.id)}
                          className={`p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                            isSelected
                              ? "bg-indigo-50/30 hover:bg-indigo-50/50"
                              : "hover:bg-slate-50 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectId(txn.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {txn.merchant}
                                </p>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    txn.transactionType === "INCOME"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  {txn.transactionType}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {txn.formattedDate} • {txn.category}
                                {txn.referenceNumber && (
                                  <span className="font-mono text-[10px] ml-1.5 text-slate-400">
                                    Ref: {txn.referenceNumber}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`text-xs font-extrabold tabular-nums ${
                                txn.transactionType === "INCOME"
                                  ? "text-emerald-600"
                                  : "text-slate-900"
                              }`}
                            >
                              {txn.transactionType === "INCOME" ? "+" : "-"}
                              {formatCurrency(txn.amount)}
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {txn.paymentMethod}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Initial Upload Drag & Drop View */
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/60 scale-[1.01]"
                    : file
                    ? "border-emerald-300 bg-emerald-50/20"
                    : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/70"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
                    file
                      ? "bg-emerald-100 text-emerald-700 scale-105"
                      : "bg-indigo-50 text-indigo-600 group-hover:scale-105"
                  }`}
                >
                  {file ? (
                    <FileSpreadsheet className="w-7 h-7" />
                  ) : (
                    <UploadCloud className="w-7 h-7" />
                  )}
                </div>

                <div className="mt-4 space-y-1">
                  {file ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB • Click or drop to replace
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Drop your bank statement or CSV file here
                      </p>
                      <p className="text-xs text-slate-500">
                        Or click to browse from your computer (.csv)
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Automatic deduplication prevents double entries</span>
                </div>
              </div>

              {/* Supported format info & template download */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Supports HDFC bank statements, standard bank exports, and PayTrace templates.
                  </span>
                </div>
                <a
                  href={api.getCsvTemplateUrl()}
                  download="paytrace_template.csv"
                  className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample Template</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          {result && !result.allPresent && importSuccessCount === null ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={importing}
                className="btn-secondary flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#5228E0]" />
                <span>Choose Different File</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || selectedIds.size === 0}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="text-white font-semibold">Adding Transactions...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span className="text-white font-semibold">Confirm & Add {selectedIds.size} Transactions</span>
                  </>
                )}
              </button>
            </>
          ) : !result && importSuccessCount === null ? (
            <>
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="btn-secondary px-4 py-2 rounded-2xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleVerify}
                disabled={!file || verifying}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying CSV...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Check Records</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="btn-primary px-6 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
              >
                <span className="text-white font-semibold">Done</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
