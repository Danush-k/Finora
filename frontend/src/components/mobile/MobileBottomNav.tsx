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
              className="flex flex-col items-center justify-center relative transition-colors cursor-pointer group outline-none py-1"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "flex flex-col items-center justify-center px-2.5 py-1 rounded-2xl transition-all",
                  isActive ? "bg-[#EDE7FD] text-[#6C3BFF]" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                <span
                  className={cn(
                    "text-[10px] mt-0.5 tracking-tight",
                    isActive ? "font-black text-[#6C3BFF]" : "font-semibold text-slate-500"
                  )}
                >
                  {item.name}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
