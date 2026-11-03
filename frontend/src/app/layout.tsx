import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const viewport: Viewport = {
  themeColor: [
    { media: "(min-width: 768px)", color: "#F5F6FF" },
    { media: "(max-width: 767px)", color: "#230348" },
  ],
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
    statusBarStyle: "default",
    title: "Finora",
  },
  other: {
    "msapplication-navbutton-color": "#F5F6FF",
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
      <body
        className="min-h-full flex flex-col bg-[#F5F6FF] text-[#0F172A] font-sans selection:bg-[#8F6BFF]/25 selection:text-[#5228E0]"
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
