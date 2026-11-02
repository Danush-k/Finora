"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  X,
  Clock,
  Store,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, cn } from "@/lib/utils";
import {
  searchTransactionsAndMerchants,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
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
          className="bg-purple-100 text-[#5228E0] font-bold rounded-xs px-0.5 not-italic inline-block leading-none"
        >
          {seg.text}
        </mark>
      ) : (
        <span key={i}>{seg.text}</span>
      )
    );
  };

  const hasAnyResults =
    categorizedResults.recentSearches.length > 0 ||
    categorizedResults.merchants.length > 0 ||
    categorizedResults.transactions.length > 0;

  const shouldShowDropdown = isOpen && (hasAnyResults || debouncedQuery.trim().length > 0);

  let globalItemIndex = 0;

  return (
    <div ref={containerRef} className={cn("relative select-none", className)}>
      {/* 1. Search Input Box - Matches debt-lent search bar exactly */}
      <div className="relative w-full">
        <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

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
          className="w-full pl-8 sm:pl-9 pr-8 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Floating Suggestion Popover (Natural content-aware sizing, subtle shadow, zero page layout shift) */}
      <AnimatePresence>
        {shouldShowDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.995 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl overflow-hidden max-h-[380px] sm:max-h-[430px] overflow-y-auto divide-y divide-slate-100"
          >
            {/* 1. RECENT SEARCHES */}
            {categorizedResults.recentSearches.length > 0 && (
              <div className="p-1.5 sm:p-2">
                <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRecentSearches();
                      setDebouncedQuery((prev) => prev + " ");
                    }}
                    className="text-[10px] text-[#6C3BFF] hover:text-[#5228E0] font-semibold cursor-pointer lowercase hover:underline"
                  >
                    clear
                  </button>
                </div>

                <div className="space-y-0.5 mt-0.5">
                  {categorizedResults.recentSearches.map((r) => {
                    const thisIndex = globalItemIndex++;
                    const isSelected = activeIndex === thisIndex;

                    return (
                      <div
                        key={r.query}
                        onMouseEnter={() => setActiveIndex(thisIndex)}
                        onClick={() => handleSelectRecent(r.query)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors group select-none",
                          isSelected
                            ? "bg-purple-50/80 text-purple-900 border-l-2 border-[#6C3BFF]"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#6C3BFF] shrink-0 transition-colors" />
                          <span className="truncate">{r.query}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentSearch(r.query);
                            setDebouncedQuery((prev) => prev + " ");
                          }}
                          className="p-1 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-200/50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove from history"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. MERCHANTS & PAYEES */}
            {categorizedResults.merchants.length > 0 && (
              <div className="p-1.5 sm:p-2">
                <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Store className="w-3 h-3 text-slate-400" />
                  Merchants & Payees
                </div>

                <div className="space-y-0.5 mt-0.5">
                  {categorizedResults.merchants.map((m) => {
                    const thisIndex = globalItemIndex++;
                    const isSelected = activeIndex === thisIndex;

                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setActiveIndex(thisIndex)}
                        onClick={() => handleSelectMerchant(m)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors group select-none",
                          isSelected
                            ? "bg-purple-50/80 text-purple-900 border-l-2 border-[#6C3BFF]"
                            : "text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Understated Merchant Icon */}
                          <div className="w-6.5 h-6.5 rounded-lg bg-purple-50 text-[#6C3BFF] border border-purple-100/80 flex items-center justify-center shrink-0">
                            <Store className="w-3.5 h-3.5" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                              {renderHighlight(m.highlightSegments)}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 font-medium truncate">
                              <span className="text-slate-600">{m.category}</span>
                              <span className="text-slate-300">·</span>
                              <span>
                                {m.transactionCount} {m.transactionCount === 1 ? "txn" : "txns"}
                              </span>
                              {m.totalSpent > 0 && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="font-semibold text-slate-700">
                                    {formatCurrency(m.totalSpent)} spent
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Subtle arrow indicator on hover/selection (no oversized filter button) */}
                        <div className="shrink-0 pl-2">
                          <ArrowUpRight
                            className={cn(
                              "w-3.5 h-3.5 transition-colors",
                              isSelected ? "text-[#6C3BFF]" : "text-slate-300 group-hover:text-slate-500"
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. TRANSACTION MATCHES */}
            {categorizedResults.transactions.length > 0 && (
              <div className="p-1.5 sm:p-2">
                <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Receipt className="w-3 h-3 text-slate-400" />
                  Transaction Matches
                </div>

                <div className="space-y-0.5 mt-0.5">
                  {categorizedResults.transactions.map((t) => {
                    const thisIndex = globalItemIndex++;
                    const isSelected = activeIndex === thisIndex;

                    return (
                      <div
                        key={t.id}
                        onMouseEnter={() => setActiveIndex(thisIndex)}
                        onClick={() => handleSelectTxn(t)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors group select-none",
                          isSelected
                            ? "bg-purple-50/80 text-purple-900 border-l-2 border-[#6C3BFF]"
                            : "text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Financial Direction Indicator */}
                          <div
                            className={cn(
                              "w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 border",
                              t.transactionType === "EXPENSE"
                                ? "bg-rose-50 border-rose-100 text-rose-600"
                                : "bg-emerald-50 border-emerald-100 text-emerald-600"
                            )}
                          >
                            {t.transactionType === "EXPENSE" ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate leading-tight">
                              {renderHighlight(t.highlightSegments)}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 font-medium truncate">
                              <span>
                                {t.date
                                  ? new Date(t.date).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "No date"}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-600">{t.category}</span>
                              {t.paymentMethod && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="uppercase text-[9px] font-semibold tracking-wider text-slate-500">
                                    {t.paymentMethod}
                                  </span>
                                </>
                              )}
                              {t.referenceNumber && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="font-mono text-[9px] text-slate-400 truncate max-w-[100px]">
                                    Ref: {t.referenceNumber}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right-aligned Amount */}
                        <div className="shrink-0 text-right pl-3">
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
                <div className="py-4 px-3 text-center text-xs text-slate-500 select-none">
                  <p className="font-semibold text-slate-700">
                    No suggestions found for &quot;{debouncedQuery}&quot;
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[10px]">Enter</kbd> to search the complete database
                  </p>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
