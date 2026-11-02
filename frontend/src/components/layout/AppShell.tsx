"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import NavigationDock from "./NavigationDock";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import LoginPage from "@/app/login/page";
import FinoraFoxCompanion from "@/components/common/FinoraFoxCompanion";
import { TopProgressBar } from "@/components/common/LoadingSkeletons";

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLocked, isLoading } = useAuth();

  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // During initial session check
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F5F6FF]">
        <TopProgressBar />
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#6C3BFF]/10 border border-[#6C3BFF]/20 flex items-center justify-center animate-pulse">
            <span className="w-4 h-4 rounded-full bg-[#6C3BFF]" />
          </div>
          <span className="text-xs font-bold text-slate-500 tracking-tight">
            Finora Secure Session...
          </span>
        </div>
      </div>
    );
  }

  // If user is not authenticated or the app is locked, present the Login / Face ID Lockscreen
  if (!isAuthenticated || isLocked) {
    return <LoginPage />;
  }

  // If already authenticated and navigating to /login
  if (isAuthRoute) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1 pb-28 sm:pb-24 pt-[env(safe-area-inset-top)]">
        {children}
      </main>
      <NavigationDock />
      <FinoraFoxCompanion />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthenticatedApp>{children}</AuthenticatedApp>
    </AuthProvider>
  );
}
