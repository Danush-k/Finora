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
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+10px)] left-3.5 right-3.5 z-40 max-w-md mx-auto bg-white/95 backdrop-blur-xl rounded-[28px] border border-purple-100/70 shadow-[0_12px_36px_rgba(108,59,255,0.12)] p-1.5 select-none md:hidden"
    >
      <div className="grid grid-cols-5 items-center">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = currentPath === normalize(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center relative transition-colors cursor-pointer group outline-none py-0.5"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <motion.div
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "flex flex-col items-center justify-center px-2 py-1 rounded-2xl transition-all w-full",
                  isActive ? "bg-[#EDE7FD] text-[#6C3BFF]" : "text-[#4A1D75]/75 hover:text-[#2E0249]"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px] text-[#6C3BFF]" : "text-[#4A1D75]/75")} />
                <span
                  className={cn(
                    "text-[10px] mt-0.5 tracking-tight",
                    isActive ? "font-black text-[#6C3BFF]" : "font-semibold text-[#4A1D75]/75"
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
