"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Receipt, HandCoins, Settings } from "lucide-react";
import GlassNavigation from "@/components/ui/GlassNavigation";

const NAV_ITEMS = [
  {
    name: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: Receipt,
  },
  {
    name: "Debt & Lent",
    href: "/debt-lent",
    icon: HandCoins,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

import MobileBottomNav from "@/components/mobile/MobileBottomNav";

export default function NavigationDock() {
  const pathname = usePathname();

  return (
    <>
      {/* 1. Mobile-Specific Native Bottom Navigation (< md) */}
      <MobileBottomNav />

      {/* 2. Desktop Floating Glass Navigation Dock (md+) - 100% Untouched */}
      <div className="hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-30 select-none px-2 max-w-full">
        <GlassNavigation
          items={NAV_ITEMS}
          activeHref={pathname}
          layoutId="finora-global-dock-pill"
        />
      </div>
    </>
  );
}
