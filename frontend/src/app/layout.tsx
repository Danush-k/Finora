import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const viewport: Viewport = {
  themeColor: "#230348",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Finora by PayTrace - Automated Personal Expense Tracker",
  description:
    "Minimal automated expense tracker extracting HDFC bank transactions from Gmail with smart categorization, Apple liquid glass light design, and monthly calendar view.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finora",
  },
  other: {
    "msapplication-navbutton-color": "#230348",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/app-icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/app-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/app-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Unconditional deep purple theme-color for iOS & mobile browsers */}
        <meta name="theme-color" content="#230348" />
      </head>
      <body
        className="min-h-full flex flex-col bg-[#F5F6FF] text-[#0F172A] font-sans selection:bg-[#8F6BFF]/25 selection:text-[#5228E0]"
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
