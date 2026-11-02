"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (item: Omit<ToastItem, "id">) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
  toast: {
    success: (message: string, description?: string) => void;
    error: (message: string, description?: string) => void;
    warning: (message: string, description?: string) => void;
    info: (message: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, message, description, duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, message, description, duration };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Limit to max 4 concurrent toasts

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, description?: string) => {
      showToast({ type: "success", message, description });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, description?: string) => {
      showToast({ type: "error", message, description, duration: 5000 });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, description?: string) => {
      showToast({ type: "warning", message, description, duration: 4500 });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, description?: string) => {
      showToast({ type: "info", message, description });
    },
    [showToast]
  );

  const toastMethods = useMemo(
    () => ({ success, error, warning, info }),
    [success, error, warning, info]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success,
        error,
        warning,
        info,
        toast: toastMethods,
      }}
    >
      {children}

      {/* Floating Apple-Style Toast Container */}
      <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4 select-none">
        <AnimatePresence mode="sync">
          {toasts.map((toast) => {
            const config = {
              success: {
                icon: CheckCircle2,
                iconColor: "text-emerald-500",
                glow: "rgba(16, 185, 129, 0.22)",
                border: "border-emerald-200/80",
                bgGradient: "from-emerald-50/70 via-white/95 to-white/95",
              },
              error: {
                icon: AlertCircle,
                iconColor: "text-rose-500",
                glow: "rgba(240, 82, 112, 0.22)",
                border: "border-rose-200/80",
                bgGradient: "from-rose-50/70 via-white/95 to-white/95",
              },
              warning: {
                icon: AlertTriangle,
                iconColor: "text-amber-500",
                glow: "rgba(245, 158, 11, 0.22)",
                border: "border-amber-200/80",
                bgGradient: "from-amber-50/70 via-white/95 to-white/95",
              },
              info: {
                icon: Info,
                iconColor: "text-[#6C3BFF]",
                glow: "rgba(108, 59, 255, 0.22)",
                border: "border-purple-200/80",
                bgGradient: "from-purple-50/70 via-white/95 to-white/95",
              },
            }[toast.type];

            const Icon = config.icon;

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.94 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "pointer-events-auto w-full rounded-2xl p-3 sm:p-3.5 backdrop-blur-xl bg-gradient-to-r border shadow-lg flex items-start justify-between gap-3",
                  config.border,
                  config.bgGradient
                )}
                style={{
                  boxShadow: `0 12px 30px ${config.glow}, 0 4px 12px rgba(0,0,0,0.04)`,
                }}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1 rounded-lg shrink-0 mt-0.5">
                    <Icon className={cn("w-4 h-4", config.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 leading-snug">
                      {toast.message}
                    </h5>
                    {toast.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {toast.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
