"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Clock,
  Store,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  CornerDownLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, cn } from "@/lib/utils";
import CategoryBadge from "@/components/common/CategoryBadge";
import {
  searchTransactionsAndMerchants,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  HighlightSegment,
  MerchantSuggestion,
  TransactionSuggestion,
  RecentSearchItem,
} from "@/lib/searchEngine";
import { Transaction } from "@/types";

interface IntelligentSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearchSubmit: (val: string) => void;
  onSelectMerchant: (merchantName: string) => void;
  onSelectTransaction: (txn: Transaction) => void;
  allTransactions: Transaction[];
  placeholder?: string;
  className?: string;
}

export default function IntelligentSearchBar({
  value,
  onChange,
  onSearchSubmit,
  onSelectMerchant,
  onSelectTransaction,
  allTransactions,
  placeholder = "Search by merchant, description, category, ₹amount, UPI ref...",
  className,
}: IntelligentSearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query input by 160ms for fluid responsiveness
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 160);
    return () => clearTimeout(timer);
  }, [value]);

  // Compute categorized suggestions
  const categorizedResults = useMemo(() => {
    return searchTransactionsAndMerchants(debouncedQuery, allTransactions, 5, 5);
  }, [debouncedQuery, allTransactions]);

  // Flatten suggestions for unified keyboard navigation
  const flatItems = useMemo(() => {
    const items: Array<
      | { type: "RECENT"; item: RecentSearchItem }
      | { type: "MERCHANT"; item: MerchantSuggestion }
      | { type: "TRANSACTION"; item: TransactionSuggestion }
    > = [];

    categorizedResults.recentSearches.forEach((r) => items.push({ type: "RECENT", item: r }));
    categorizedResults.merchants.forEach((m) => items.push({ type: "MERCHANT", item: m }));
    categorizedResults.transactions.forEach((t) => items.push({ type: "TRANSACTION", item: t }));

    return items;
  }, [categorizedResults]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  const handleSelectRecent = (q: string) => {
    onChange(q);
    saveRecentSearch(q);
    setIsOpen(false);
    onSearchSubmit(q);
  };

  const handleSelectMerchant = (m: MerchantSuggestion) => {
    onChange(m.name);
    saveRecentSearch(m.name);
    setIsOpen(false);
    onSelectMerchant(m.name);
  };

  const handleSelectTxn = (t: TransactionSuggestion) => {
    saveRecentSearch(t.merchant);
    setIsOpen(false);
    const fullTxn = allTransactions.find((txn) => txn.id === t.id);
    if (fullTxn) {
      onSelectTransaction(fullTxn);
    } else {
      onChange(t.merchant);
      onSearchSubmit(t.merchant);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && activeIndex < flatItems.length) {
        const selected = flatItems[activeIndex];
        if (selected.type === "RECENT") {
          handleSelectRecent(selected.item.query);
        } else if (selected.type === "MERCHANT") {
          handleSelectMerchant(selected.item);
        } else if (selected.type === "TRANSACTION") {
          handleSelectTxn(selected.item);
        }
      } else {
        // Execute full search query
        setIsOpen(false);
        if (value.trim()) {
          saveRecentSearch(value.trim());
        }
        onSearchSubmit(value);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
    onSearchSubmit("");
    inputRef.current?.focus();
  };

  const renderHighlight = (segments: HighlightSegment[]) => {
    return segments.map((seg, i) =>
      seg.isHighlighted ? (
        <mark
          key={i}
          className="bg-purple-100 text-[#5228E0] font-black rounded-xs px-0.5 not-italic"
        >
          {seg.text}
        </mark>
      ) : (
        <span key={i}>{seg.text}</span>
      )
    );
  };

  let globalItemIndex = 0;

  return (
    <div ref={containerRef} className={cn("relative flex-1 select-none", className)}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#6C3BFF]" />

        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-[#6C3BFF] focus:ring-2 focus:ring-purple-100 transition-all shadow-2xs font-medium"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Categorized Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl bg-white/95 backdrop-blur-2xl border border-purple-200/90 shadow-[0_18px_40px_rgba(15,23,42,0.14)] overflow-hidden divide-y divide-slate-100/80 max-h-[410px] overflow-y-auto"
          >
            {/* 1. RECENT SEARCHES */}
            {categorizedResults.recentSearches.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRecentSearches();
                      setDebouncedQuery((prev) => prev + " "); // force re-render
                    }}
                    className="text-[10px] text-purple-600 hover:text-purple-800 lowercase font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-0.5 mt-1">
                  {categorizedResults.recentSearches.map((r) => {
                    const thisIndex = globalItemIndex++;
                    const isSelected = activeIndex === thisIndex;

                    return (
                      <div
                        key={r.query}
                        onMouseEnter={() => setActiveIndex(thisIndex)}
                        onClick={() => handleSelectRecent(r.query)}
                        className={cn(
                          "flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors group",
                          isSelected
                            ? "bg-purple-50 text-purple-900 border-l-2 border-[#6C3BFF]"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 shrink-0" />
                          <span className="truncate">{r.query}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRecentSearch(r.query);
                              setDebouncedQuery((prev) => prev + " ");
                            }}
                            className="p-1 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-200/60"
                            title="Remove from history"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. MERCHANTS & PAYEES */}
            {categorizedResults.merchants.length > 0 && (
              <div className="p-2">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-3 h-3 text-purple-500" />
                  Merchants & Payees
                </div>

                <div className="space-y-0.5 mt-1">
                  {categorizedResults.merchants.map((m) => {
                    const thisIndex = globalItemIndex++;
                    const isSelected = activeIndex === thisIndex;

                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setActiveIndex(thisIndex)}
                        onClick={() => handleSelectMerchant(m)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors group",
                          isSelected
                            ? "bg-purple-50 text-purple-900 border-l-2 border-[#6C3BFF]"
                            : "text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-purple-100/70 border border-purple-200/60 flex items-center justify-center shrink-0 text-[#6C3BFF]">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {renderHighlight(m.highlightSegments)}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <CategoryBadge category={m.category} className="scale-75 origin-left" />
                              <span>·</span>
                              <span>{m.transactionCount} txns</span>
                              {m.totalSpent > 0 && (
                                <>
                                  <span>·</span>
                                  <span>{formatCurrency(m.totalSpent)} spent</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          Filter
                          <CornerDownLeft className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. TRANSACTION MATCHES */}
            {categorizedResults.transactions.length > 0 && (
              <div className="p-2">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3 h-3 text-indigo-500" />
                  Transaction Matches
                </div>

                <div className="space-y-0.5 mt-1">
                  {categorizedResults.transactions.map((t) => {
                    const thisIndex = globalItemIndex++;
                    const isSelected = activeIndex === thisIndex;

                    return (
                      <div
                        key={t.id}
                        onMouseEnter={() => setActiveIndex(thisIndex)}
                        onClick={() => handleSelectTxn(t)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-colors group",
                          isSelected
                            ? "bg-purple-50 text-purple-900 border-l-2 border-[#6C3BFF]"
                            : "text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                              t.transactionType === "EXPENSE"
                                ? "bg-rose-50 border-rose-200 text-rose-600"
                                : "bg-emerald-50 border-emerald-200 text-emerald-600"
                            )}
                          >
                            {t.transactionType === "EXPENSE" ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {renderHighlight(t.highlightSegments)}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <span>
                                {t.date ? new Date(t.date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }) : "No date"}
                              </span>
                              <span>·</span>
                              <CategoryBadge category={t.category} className="scale-75 origin-left" />
                              {t.referenceNumber && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono">{t.referenceNumber}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={cn(
                              "font-black text-xs tabular-nums block",
                              t.transactionType === "EXPENSE" ? "text-rose-600" : "text-emerald-600"
                            )}
                          >
                            {t.transactionType === "EXPENSE" ? "-" : "+"}
                            {formatCurrency(t.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. EMPTY RESULTS STATE */}
            {debouncedQuery.trim() &&
              categorizedResults.merchants.length === 0 &&
              categorizedResults.transactions.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">
                    No instant suggestions for &quot;{debouncedQuery}&quot;
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-600 font-mono text-[10px]">Enter</kbd> to search the complete database.
                  </p>
                </div>
              )}

            {/* Bottom Keyboard Shortcuts Footer */}
            <div className="px-3.5 py-2 bg-slate-50/80 text-[10px] text-slate-400 flex items-center justify-between select-none">
              <span className="flex items-center gap-2">
                <span><kbd className="font-mono bg-white px-1 py-0.2 rounded border">↑</kbd><kbd className="font-mono bg-white px-1 py-0.2 rounded border ml-0.5">↓</kbd> navigate</span>
                <span>·</span>
                <span><kbd className="font-mono bg-white px-1 py-0.2 rounded border">↵</kbd> select</span>
                <span>·</span>
                <span><kbd className="font-mono bg-white px-1 py-0.2 rounded border">esc</kbd> close</span>
              </span>
              <span className="font-semibold text-purple-600">Finora Intelligent Search</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
