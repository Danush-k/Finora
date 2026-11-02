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
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+14px)] sm:bottom-6 left-1/2 -translate-x-1/2 z-30 select-none px-2 max-w-full">
      <GlassNavigation
        items={NAV_ITEMS}
        activeHref={pathname}
        layoutId="finora-global-dock-pill"
      />
    </div>
  );
}
