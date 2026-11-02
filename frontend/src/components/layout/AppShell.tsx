"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import NavigationDock from "./NavigationDock";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import LoginPage from "@/app/login/page";
import FinoraFoxCompanion from "@/components/common/FinoraFoxCompanion";
import AppLoader from "@/components/ui/AppLoader";
import PageTransition from "@/components/ui/PageTransition";
import { ToastProvider } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLocked, isLoading } = useAuth();

  const isAuthRoute = pathname === "/login" || pathname === "/register";

  // During initial session check: Apple-inspired elegant loader with F logo glow
  if (isLoading) {
    return <AppLoader />;
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
      {/* Top mobile overscroll guard: prevents white background when user drags down */}
      {pathname === "/" && (
        <div className="fixed -top-96 left-0 right-0 h-96 bg-[#1F0238] -z-10 md:hidden pointer-events-none" />
      )}
      <Header />
      {/* Mobile-first comfortable padding: full-bleed on mobile overview, expansive on desktop */}
      <main
        className={cn(
          "max-w-7xl mx-auto pb-28 sm:pb-28 w-full flex-1",
          pathname === "/" ? "px-0 pt-0 sm:px-8 sm:pt-9" : "px-3.5 sm:px-8 pt-4 sm:pt-9"
        )}
      >
        <PageTransition key={pathname}>
          {children}
        </PageTransition>
      </main>
      <NavigationDock />
      <FinoraFoxCompanion />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthenticatedApp>{children}</AuthenticatedApp>
      </ToastProvider>
    </AuthProvider>
  );
}

