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

  // Dynamically ensure theme-color matches:
  // - Mobile Overview page ('/'): Purple #230348 (status bar matching hero banner)
  // - Desktop view (all pages): Light #F5F6FF
  // - Other mobile pages (/transactions, /calendar, /debt-lent, etc.): Old light theme #F5F6FF
  React.useEffect(() => {
    const updateThemeForScreen = () => {
      const isMobile = window.innerWidth < 768;
      const isOverview = pathname === "/" || pathname === "";
      const shouldBePurple = isMobile && isOverview;

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", shouldBePurple ? "#230348" : "#F5F6FF");
      }
      if (typeof document !== "undefined") {
        document.documentElement.style.backgroundColor = shouldBePurple ? "#230348" : "#F5F6FF";
        document.body.style.backgroundColor = shouldBePurple ? "#230348" : "#F5F6FF";
      }
    };
    updateThemeForScreen();
    window.addEventListener("resize", updateThemeForScreen);
    return () => window.removeEventListener("resize", updateThemeForScreen);
  }, [pathname]);

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

