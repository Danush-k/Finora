"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  HandCoins,
  Settings,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    name: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: Receipt,
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
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

export default function MobileBottomNav() {
  const pathname = usePathname();

  const normalize = (p: string) => (p || "").replace(/\/+$/, "") || "/";
  const currentPath = normalize(pathname);

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(15,23,42,0.05)] pt-1.5 pb-[calc(env(safe-area-inset-bottom)+8px)] px-1 select-none md:hidden"
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = currentPath === normalize(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "min-h-[48px] flex flex-col items-center justify-center relative rounded-xl transition-colors cursor-pointer group outline-none",
                isActive ? "text-[#6C3BFF]" : "text-slate-500 hover:text-slate-800"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="flex flex-col items-center justify-center"
              >
                {/* Active Soft Glow Pill Behind Icon */}
                <div
                  className={cn(
                    "p-1 rounded-xl transition-all duration-200 flex items-center justify-center relative",
                    isActive
                      ? "bg-purple-50 text-[#6C3BFF] shadow-2xs"
                      : "text-slate-500 group-hover:text-slate-700"
                  )}
                >
                  <Icon className="w-5 h-5 transition-transform duration-200" />
                </div>

                {/* Tab Label */}
                <span
                  className={cn(
                    "text-[10px] mt-0.5 tracking-tight font-medium transition-colors",
                    isActive
                      ? "text-[#6C3BFF] font-bold"
                      : "text-slate-500 group-hover:text-slate-700"
                  )}
                >
                  {item.name}
                </span>

                {/* Active Indicator Micro-Dot */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator-dot"
                    className="w-1 h-1 rounded-full bg-[#6C3BFF] shadow-[0_0_6px_rgba(108,59,255,0.8)] mt-0.5"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
