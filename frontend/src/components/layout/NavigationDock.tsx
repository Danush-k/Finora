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

export default function NavigationDock() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+12px)] sm:bottom-6 left-1/2 -translate-x-1/2 z-30 select-none px-2 w-[calc(100%-24px)] max-w-[440px] sm:w-auto flex justify-center pointer-events-auto">
      <GlassNavigation
        items={NAV_ITEMS}
        activeHref={pathname}
        layoutId="finora-global-dock-pill"
        className="w-full sm:w-auto"
      />
    </div>
  );
}
