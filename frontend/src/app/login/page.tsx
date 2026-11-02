"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  KeyRound,
  Sparkles,
  Fingerprint,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FinoraAnimatedIllustration from "@/components/auth/FinoraAnimatedIllustration";
import FaceIdScannerModal from "@/components/auth/FaceIdScannerModal";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithFaceId, loginWithPasscode, loginWithGoogle, isAuthenticated, isLocked, unlock } = useAuth();

  const [email, setEmail] = useState("danush@paytrace.app");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Mobile drawer state: on iPhone 16 / mobile screens, hero with 3D illustration shows first,
  // user taps arrow or swipe up to reveal credentials drawer
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Face ID Biometric Modal State
  const [faceIdModalOpen, setFaceIdModalOpen] = useState(false);

  // Passcode Mode (4-digit quick pin)
  const [authMethod, setAuthMethod] = useState<"credentials" | "passcode">("credentials");
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);

  // If already authenticated and not locked, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !isLocked) {
      router.push("/");
    }
  }, [isAuthenticated, isLocked, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password, rememberMe);
    router.push("/");
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await loginWithGoogle();
    router.push("/");
  };

  const handleFaceIdSuccess = async () => {
    setFaceIdModalOpen(false);
    await loginWithFaceId();
    router.push("/");
  };

  const handlePinInput = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = val;
    setPinDigits(newDigits);

    // Auto advance focus
    if (val && index < 3) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      nextInput?.focus();
    }

    // If 4 digits entered, auto-submit
    if (newDigits.every((d) => d !== "") && index === 3) {
      setLoading(true);
      loginWithPasscode(newDigits.join("")).then(() => {
        router.push("/");
      });
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F5F6FF] flex flex-col justify-between selection:bg-[#8F6BFF]/25 selection:text-[#5228E0] overflow-x-hidden">
      {/* Background Silk Waves */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <svg
          className="absolute bottom-0 left-0 w-[50vw] min-w-[440px] max-w-[760px] h-auto pointer-events-none select-none z-0"
          viewBox="0 0 900 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="tier1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E4DCFF" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#D9CFFF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="tier2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C4B0FF" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#BEAAFF" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#B39BFF" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="tier3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A284FF" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#9777FF" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#8C6BFA" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="tier4Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8765F7" stopOpacity="1" />
              <stop offset="60%" stopColor="#7B52F9" stopOpacity="1" />
              <stop offset="100%" stopColor="#6C3BFF" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M 0,900 L 0,280 C 260,340 550,560 820,900 L 0,900 Z" fill="url(#tier1Grad)" />
          <path d="M 0,900 L 0,420 C 220,470 460,650 680,900 L 0,900 Z" fill="url(#tier2Grad)" />
          <path d="M 0,900 L 0,560 C 180,590 360,720 520,900 L 0,900 Z" fill="url(#tier3Grad)" />
          <path d="M 0,900 L 0,700 C 120,720 250,810 360,900 L 0,900 Z" fill="url(#tier4Grad)" />
        </svg>

        {/* Ambient Top Glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#6C3BFF]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================= */}
      {/* HEADER: LOGO & STATUS                                     */}
      {/* ========================================================= */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center" style={{ width: "128px", height: "33px" }}>
            <Image
              src="/finora-logo-transparent.png"
              alt="Finora by PayTrace"
              width={128}
              height={33}
              priority
              style={{ width: "128px", height: "33px", objectFit: "contain" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Biometric Face ID Button in Header */}
          <button
            type="button"
            onClick={() => setFaceIdModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-slate-200 shadow-2xs text-xs font-semibold cursor-pointer transition-all hover:border-[#6C3BFF]/40 active:scale-95"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#6C3BFF]" />
            <span className="hidden sm:inline">Face ID Unlock</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/90 text-emerald-800 text-xs font-semibold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">256-Bit Bank Encryption</span>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTAINER: 2-COLUMN LAYOUT / MOBILE GESTURE HERO     */}
      {/* ========================================================= */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 py-4 sm:py-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* ======================================================= */}
          {/* LEFT SECTION (55%): 3D GLASS CARD & MOBILE GESTURE      */}
          {/* ======================================================= */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6C3BFF]/10 border border-[#6C3BFF]/20 text-[#5228E0] text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#6C3BFF]" />
                <span>Apple Liquid Glass Financial Engine</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-[#0F172A] tracking-tight leading-tight">
                Your money, tracked in real-time.
              </h1>
              <p className="text-sm sm:text-base text-[#475569] font-medium leading-relaxed">
                Finora scans your HDFC Bank alerts automatically, extracting UPI, credit card, and salary transactions with zero manual entry.
              </p>
            </div>

            {/* 3D Animated Glass Dashboard Card */}
            <div className="w-full flex justify-center lg:justify-start">
              <FinoraAnimatedIllustration />
            </div>

            {/* ======================================================= */}
            {/* MOBILE ONLY (iPhone 16): Tap/Swipe Arrow & Face ID      */}
            {/* ======================================================= */}
            <div className="lg:hidden w-full flex flex-col items-center gap-3 pt-2">
              {/* Primary Face ID Biometric Quick Unlock */}
              <button
                type="button"
                onClick={() => setFaceIdModalOpen(true)}
                className="btn-primary w-full max-w-xs h-13 rounded-2xl text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_12px_28px_rgba(108,59,255,0.32)] active:scale-95"
              >
                <Smartphone className="w-5 h-5 text-white" />
                <span>Unlock with Face ID</span>
              </button>

              {/* Tap to Reveal Drawer Cue */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="flex items-center gap-2 text-xs font-bold text-[#6C3BFF] hover:text-[#5228E0] py-2 px-4 rounded-xl bg-white/80 border border-slate-200/80 shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                <span>Or sign in with Passcode / Password</span>
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </button>
            </div>
          </div>

          {/* ======================================================= */}
          {/* RIGHT SECTION (45%): APPLE-GRADE LOGIN CARD WITH MASCOT  */}
          {/* ======================================================= */}
          <div
            className={`lg:col-span-5 flex justify-center lg:justify-end pt-8 lg:pt-14 ${
              mobileDrawerOpen ? "block" : "hidden lg:flex"
            }`}
          >
            <div className="relative w-full max-w-[430px]">
              {/* 3D Finora Fox Mascot sitting properly on the card ledge with money note & isolated waving hand */}
              <div
                className="absolute -top-[175px] sm:-top-[190px] right-6 sm:right-10 w-[176px] sm:w-[191px] h-[210px] sm:h-[228px] z-20 select-none group cursor-pointer"
                title="Finora Fox Mascot - Your Financial Companion"
              >
                {/* 1. Stationary Sitting Body with Money Notebook & Dangling Legs */}
                <div className="relative w-full h-full drop-shadow-[0_12px_24px_rgba(108,59,255,0.22)]">
                  <Image
                    src="/finora-fox-body.png"
                    alt="Finora Fox Mascot"
                    fill
                    priority
                    sizes="191px"
                    className="object-contain pointer-events-none"
                  />

                  {/* 2. Isolated Waving Hand (Only the hand shakes / waves!) */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: "33.67%",
                      left: "0%",
                      width: "21.27%",
                      height: "20.63%",
                    }}
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 6, -1, 6, 0],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        transformOrigin: "55.32% 75.46%",
                        width: "100%",
                        height: "100%",
                      }}
                      className="relative w-full h-full"
                    >
                      <Image
                        src="/finora-fox-paw.png"
                        alt="Waving Paw"
                        fill
                        priority
                        sizes="40px"
                        className="object-contain"
                      />
                    </motion.div>
                  </div>

                  {/* 3. Native 3D Cuff Foreground */}
                  <div className="absolute inset-0 pointer-events-none">
                    <Image
                      src="/finora-fox-cuff.png"
                      alt=""
                      fill
                      priority
                      sizes="191px"
                      className="object-contain"
                    />
                  </div>

                  {/* Interactive Greeting Wave Speech Pill on Hover */}
                  <div className="absolute -top-3 -left-8 sm:-left-12 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:-translate-y-1 pointer-events-none">
                    <div className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-md flex items-center gap-1.5 text-[11px] font-semibold text-[#5228E0] whitespace-nowrap">
                      <span>Hi Danush!</span>
                      <span className="inline-block animate-bounce">👋</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Card */}
              <div className="w-full rounded-3xl bg-white border border-[#E2E8F0] p-6 sm:p-9 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_16px_36px_-6px_rgba(15,23,42,0.08)] relative z-10 backdrop-blur-xl">
                {/* Mobile Drawer Close Button */}
                <div className="flex lg:hidden items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Sign In Options
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Card Header */}
                <div className="mb-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                      Welcome back!
                    </h2>
                    {/* Method Toggle: Credentials vs 4-Digit Passcode */}
                    <button
                      type="button"
                      onClick={() =>
                        setAuthMethod(authMethod === "credentials" ? "passcode" : "credentials")
                      }
                      className="text-[11px] font-bold text-[#6C3BFF] hover:text-[#5228E0] flex items-center gap-1 cursor-pointer bg-[#6C3BFF]/10 px-2.5 py-1 rounded-full"
                    >
                      {authMethod === "credentials" ? (
                        <>
                          <KeyRound className="w-3 h-3" />
                          <span>Use PIN</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3 h-3" />
                          <span>Use Email</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-1">
                    Sign in to your Finora by PayTrace tracker.
                  </p>
                </div>

                {/* Apple Face ID Quick Unlock Bar */}
                <button
                  type="button"
                  onClick={() => setFaceIdModalOpen(true)}
                  className="w-full mb-4 p-3 rounded-2xl bg-gradient-to-r from-[#6C3BFF]/10 via-purple-50 to-[#6C3BFF]/10 border border-[#6C3BFF]/25 hover:border-[#6C3BFF]/50 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#6C3BFF] text-white flex items-center justify-center shadow-[0_2px_8px_rgba(108,59,255,0.4)]">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-[#6C3BFF] transition-colors">
                        Unlock with Face ID
                      </p>
                      <p className="text-[10px] text-slate-500">Biometric instant login</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#6C3BFF] px-2 py-0.5 rounded-lg bg-white border border-[#6C3BFF]/20 shadow-2xs">
                    Scan Face
                  </span>
                </button>

                {/* =================================================== */}
                {/* 4-DIGIT PIN MODE                                    */}
                {/* =================================================== */}
                {authMethod === "passcode" ? (
                  <div className="space-y-4 py-2">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-600 mb-3">
                        Enter your 4-digit Finora PIN
                      </p>
                      <div className="flex justify-center gap-3">
                        {pinDigits.map((digit, i) => (
                          <input
                            key={i}
                            id={`pin-input-${i}`}
                            type="password"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handlePinInput(i, e.target.value)}
                            className="w-12 h-14 rounded-2xl text-center text-xl font-bold bg-slate-50 border-2 border-slate-200 focus:border-[#6C3BFF] focus:bg-white focus:outline-none transition-all shadow-2xs"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loading || pinDigits.some((d) => d === "")}
                      onClick={() => {
                        setLoading(true);
                        loginWithPasscode(pinDigits.join("")).then(() => {
                          router.push("/");
                        });
                      }}
                      className="btn-primary w-full h-12 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      <span>{loading ? "Unlocking..." : "Unlock with PIN"}</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  /* =================================================== */
                  /* EMAIL / PASSWORD FORM                               */
                  /* =================================================== */
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="email-input"
                        className="block text-xs font-semibold text-[#334155] uppercase tracking-wider"
                      >
                        Email address
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 pointer-events-none text-[#94A3B8]">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          id="email-input"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] font-medium focus:outline-none focus:border-[#6C3BFF] focus:ring-2 focus:ring-[#6C3BFF]/15 transition-all"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="password-input"
                        className="block text-xs font-semibold text-[#334155] uppercase tracking-wider"
                      >
                        Password
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 pointer-events-none text-[#94A3B8]">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="password-input"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#94A3B8] font-medium focus:outline-none focus:border-[#6C3BFF] focus:ring-2 focus:ring-[#6C3BFF]/15 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-[#94A3B8] hover:text-[#64748B] transition-colors p-0.5 cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember me */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#6C3BFF] focus:ring-[#6C3BFF]/20 accent-[#6C3BFF]"
                        />
                        <span className="text-xs font-medium text-[#475569]">Remember session</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setFaceIdModalOpen(true)}
                        className="text-xs font-semibold text-[#6C3BFF] hover:text-[#5228E0]"
                      >
                        Use Face ID
                      </button>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary w-full h-12 rounded-2xl text-white font-semibold text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2 shadow-[0_4px_16px_rgba(108,59,255,0.25)]"
                    >
                      <span className="text-white font-semibold">
                        {loading ? "Signing in..." : "Sign In to Finora"}
                      </span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </button>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center py-2">
                      <div className="w-full border-t border-[#F1F5F9]" />
                      <span className="absolute px-3 bg-white text-[11px] font-medium text-[#94A3B8]">
                        or continue with
                      </span>
                    </div>

                    {/* Google Sign In */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="btn-secondary w-full h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.14C3.27 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.59H1.26C.46 8.18 0 10.03 0 12c0 1.97.46 3.82 1.26 5.41l4.02-3.14z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.64 1.26 6.59l4.02 3.14c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 py-5 flex flex-wrap items-center justify-between text-xs text-[#94A3B8] border-t border-[#E5E7EB]/60">
        <div>&copy; 2026 Finora by PayTrace. All rights reserved.</div>
        <div className="flex items-center gap-6 mt-2 sm:mt-0">
          <Link href="#" className="hover:text-[#64748B] transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-[#64748B] transition-colors">
            Terms of Service
          </Link>
          <Link href="#" className="hover:text-[#64748B] transition-colors">
            Security Overview
          </Link>
        </div>
      </footer>

      {/* Apple Face ID Biometric Scanner Modal */}
      <FaceIdScannerModal
        isOpen={faceIdModalOpen}
        onClose={() => setFaceIdModalOpen(false)}
        onSuccess={handleFaceIdSuccess}
        userName="Danush"
      />
    </div>
  );
}
