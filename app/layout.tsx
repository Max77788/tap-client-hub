"use client";

import type { Metadata } from "next";
import { Public_Sans, Fraunces } from "next/font/google";
import { usePathname } from "next/navigation";
import { useState } from "react";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

interface NavItem {
  label: string;
  href: string;
  role?: "owner" | "all";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Clients", href: "/" },
  { label: "Team Workload", href: "/workload" },
  { label: "Timesheet", href: "/time" },
  { label: "Monthly Financials", href: "/fin" },
  { label: "Payroll", href: "/pr" },
  { label: "Sales Tax", href: "/stx" },
  { label: "1099s", href: "/t9" },
  { label: "Renditions", href: "/rend" },
  { label: "Password Vault", href: "/vault" },
  { label: "Users & Access", href: "/users", role: "owner" },
  { label: "Help & Support", href: "/support" },
];

// ── Page title mapping ──
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Clients", subtitle: "Active client accounts and engagement tracking" },
  "/workload": { title: "Team Workload", subtitle: "Per-person workload distribution and service mix" },
  "/time": { title: "Timesheet", subtitle: "Track time against client engagements" },
  "/fin": { title: "Monthly Financials", subtitle: "Month-by-month financial statement preparation tracking" },
  "/pr": { title: "Payroll", subtitle: "Payroll processing and filing status" },
  "/stx": { title: "Sales Tax", subtitle: "Sales tax preparation and filing tracking" },
  "/t9": { title: "1099s", subtitle: "Annual 1099 preparation and filing" },
  "/rend": { title: "Renditions", subtitle: "Property renditions and annual filings" },
  "/vault": { title: "Password Vault", subtitle: "Secure credential storage for client portals" },
  "/users": { title: "Users & Access", subtitle: "Manage team accounts and access levels" },
  "/support": { title: "Help & Support", subtitle: "Submit a support request or find answers" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState("admin"); // admin | manager | staff | owner

  // ── Filter nav items by role ──
  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.role === "owner" && role !== "owner") return false;
    return true;
  });

  // ── Determine active page title ──
  const pageInfo = PAGE_TITLES[pathname] || PAGE_TITLES["/"];

  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${fraunces.variable}`}
    >
      <body
        className="min-h-screen flex"
        style={{ backgroundColor: "var(--paper)" }}
      >
        {/* ── Sidebar ── */}
        <aside
          className="sticky top-0 h-screen flex flex-col shrink-0 select-none"
          style={{
            width: "var(--sidebar-width)",
            background: `linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%)`,
            color: "#ffffff",
          }}
        >
          {/* Brand */}
          <div className="px-5 pt-8 pb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-white m-0">
              TAP
            </h2>
            <p className="text-xs mt-1 opacity-70 leading-relaxed">
              Associates, LLC &middot; Est. 1999
            </p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {visibleNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-5 pb-6 pt-4 text-xs text-white/50">
            TAP Client Hub v1.0
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header
            className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 shrink-0"
            style={{
              backgroundColor: "var(--card)",
              borderBottom: `1px solid var(--line)`,
              boxShadow: "var(--shadow)",
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div>
                <h1 className="text-lg font-semibold text-[var(--ink)] m-0 leading-tight">
                  {pageInfo.title}
                </h1>
                <p className="text-xs text-[var(--muted)] m-0">
                  {pageInfo.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Role selector */}
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer"
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>

              {/* Action buttons */}
              <button
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg
                  bg-[var(--teal)] text-white hover:opacity-90 transition-opacity"
              >
                + New Client
              </button>

              <button
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg
                  border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-soft)] transition-colors"
              >
                Export
              </button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
