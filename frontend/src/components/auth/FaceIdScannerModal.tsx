"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Shield, Lock, Smartphone } from "lucide-react";

interface FaceIdScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userName?: string;
}

export default function FaceIdScannerModal({
  isOpen,
  onClose,
  onSuccess,
  userName = "Danush",
}: FaceIdScannerModalProps) {
  const [scanState, setScanState] = useState<"preparing" | "scanning" | "success" | "failed">("preparing");

  useEffect(() => {
    if (!isOpen) {
      setScanState("preparing");
      return;
    }

    // Step 1: Start scanning after 300ms
    const timer1 = setTimeout(() => {
      setScanState("scanning");
    }, 350);

    // Step 2: Recognized successfully after 1400ms
    const timer2 = setTimeout(() => {
      setScanState("success");
    }, 1500);

    // Step 3: Trigger onSuccess callback after 2100ms
    const timer3 = setTimeout(() => {
      onSuccess();
    }, 2100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isOpen, onSuccess]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Window: Apple iOS Face ID Viewfinder */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative z-10 w-full max-w-[340px] rounded-3xl bg-slate-900/90 border border-slate-700/60 p-6 text-center text-white shadow-[0_24px_64px_rgba(0,0,0,0.5),0_0_40px_rgba(108,59,255,0.25)] backdrop-blur-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-[#8F6BFF]" />
            <h3 className="text-base font-bold tracking-tight text-white">Apple Face ID</h3>
          </div>
          <p className="text-xs text-slate-400 mb-6">Unlocking Finora for {userName}</p>

          {/* Face ID Viewfinder Frame */}
          <div className="relative mx-auto w-36 h-36 flex items-center justify-center mb-6">
            {/* Ambient biometric glow */}
            <div
              className={`absolute inset-0 rounded-3xl blur-xl transition-all duration-500 ${
                scanState === "success"
                  ? "bg-emerald-500/30"
                  : scanState === "scanning"
                  ? "bg-[#6C3BFF]/35"
                  : "bg-slate-700/20"
              }`}
            />

            {/* Apple Face ID Brackets Box */}
            <div
              className={`relative w-28 h-28 rounded-2xl border-2 transition-all duration-500 flex items-center justify-center ${
                scanState === "success"
                  ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_24px_rgba(52,211,153,0.5)]"
                  : scanState === "scanning"
                  ? "border-[#8F6BFF] bg-[#6C3BFF]/10 shadow-[0_0_20px_rgba(143,107,255,0.4)]"
                  : "border-slate-500 bg-slate-800/40"
              }`}
            >
              {/* Corner brackets */}
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white rounded-tl-sm" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white rounded-tr-sm" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white rounded-bl-sm" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white rounded-br-sm" />

              {/* Scanning Laser Beam */}
              {scanState === "scanning" && (
                <motion.div
                  animate={{ y: [-38, 38, -38] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#8F6BFF] to-transparent shadow-[0_0_8px_#8F6BFF]"
                />
              )}

              {/* Biometric Face Icon / Animated Success Checkmark */}
              {scanState === "success" ? (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.7)]"
                >
                  <Check className="w-7 h-7 stroke-[3]" />
                </motion.div>
              ) : (
                <motion.div
                  animate={
                    scanState === "scanning"
                      ? { scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }
                      : { scale: 1, opacity: 0.7 }
                  }
                  transition={{ duration: 1, repeat: Infinity }}
                  className="flex flex-col items-center justify-center"
                >
                  {/* Authentic Apple Face ID Glyph */}
                  <svg
                    className={`w-14 h-14 transition-colors duration-300 ${
                      scanState === "scanning" ? "text-[#C4B5FD]" : "text-slate-400"
                    }`}
                    viewBox="0 0 48 48"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Left Eye */}
                    <circle cx="17" cy="18" r="1.5" fill="currentColor" />
                    {/* Right Eye */}
                    <circle cx="31" cy="18" r="1.5" fill="currentColor" />
                    {/* Nose */}
                    <path d="M24 19v6h2" />
                    {/* Smile Mouth */}
                    <path d="M17 31c2 3 5 4.5 7 4.5s5-1.5 7-4.5" />
                  </svg>
                </motion.div>
              )}
            </div>
          </div>

          {/* Feedback Label */}
          <div className="h-6 mb-4 flex items-center justify-center">
            {scanState === "scanning" && (
              <span className="text-xs font-semibold text-[#C4B5FD] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8F6BFF] animate-ping" />
                Scanning Face...
              </span>
            )}
            {scanState === "success" && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Face ID Verified. Unlocking...
              </motion.span>
            )}
            {scanState === "preparing" && (
              <span className="text-xs text-slate-400">Position face in view</span>
            )}
          </div>

          {/* Fallback button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer border border-slate-700/50"
          >
            Use Passcode Instead
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
