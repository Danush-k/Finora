import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import NavigationDock from "@/components/layout/NavigationDock";

export const metadata: Metadata = {
  title: "Finora by PayTrace - Automated Personal Expense Tracker",
  description:
    "Minimal automated expense tracker extracting HDFC bank transactions from Gmail with smart categorization, Apple liquid glass light design, and monthly calendar view.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full flex-1">
          {children}
        </main>
        <NavigationDock />
      </body>
    </html>
  );
}
