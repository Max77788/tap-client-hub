"use client";

import type { Metadata } from "next";
import { Public_Sans, Fraunces } from "next/font/google";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
  { label: "---", href: "" },
  { label: "Financials", href: "/fin" },
  { label: "Payroll", href: "/pr" },
  { label: "Sales Tax", href: "/stx" },
  { label: "1099s", href: "/t9" },
  { label: "Renditions", href: "/rend" },
  { label: "Tax Returns", href: "/tax" },
  { label: "---", href: "" },
  { label: "Password Vault", href: "/vault" },
  { label: "Users & Access", href: "/users", role: "owner" },
  { label: "---", href: "" },
  { label: "Settings", href: "/settings/2fa" },
  { label: "Help & Support", href: "/support" },
];

// ── Page title mapping ──
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Clients", subtitle: "Active client accounts and engagement tracking" },
  "/workload": { title: "Team Workload", subtitle: "Per-person workload distribution and service mix" },
  "/time": { title: "Timesheet", subtitle: "Live time tracking by person and client — lean by design; profitability analytics come next." },
  "/fin": { title: "Financials", subtitle: "Month-by-month financial statement preparation tracking" },
  "/pr": { title: "Payroll", subtitle: "Payroll processing and filing status" },
  "/stx": { title: "Sales Tax", subtitle: "Sales tax preparation and filing tracking" },
  "/t9": { title: "1099s", subtitle: "Annual 1099 preparation and filing" },
  "/rend": { title: "Renditions", subtitle: "Property renditions and annual filings" },
  "/tax": { title: "Tax Returns", subtitle: "Annual tax return preparation and filing" },
  "/vault": { title: "Password Vault", subtitle: "Secure credential storage for client portals" },
  "/users": { title: "Users & Access", subtitle: "Manage team accounts and access levels" },
  "/settings/2fa": { title: "Settings", subtitle: "Two-factor authentication" },
  "/support": { title: "Help & Support", subtitle: "Submit a support request or find answers" },
};

// ── Mobile sidebar ──
function MobileSidebar({
  visibleNav,
  pathname,
  open,
  onClose,
}: {
  visibleNav: NavItem[];
  pathname: string;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />
      {/* Drawer */}
      <div
        ref={ref}
        className="fixed top-0 left-0 z-50 h-full w-64 flex flex-col shadow-2xl md:hidden"
        style={{
          background: `linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%)`,
          color: "#ffffff",
        }}
      >
        <div className="px-5 pt-8 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white m-0">TAP</h2>
            <p className="text-xs mt-0.5 opacity-70">Associates, LLC &middot; Est. 1999</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-lg leading-none p-1"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            if (item.label === "---") {
              return <div key="sep-mobile" className="my-3 mx-2 border-t border-white/15" />;
            }
            const isActive = pathname === item.href;
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`block px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-white ${
                  isActive ? "bg-white/15" : "hover:bg-white/10"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              // Clear demo cookie
              document.cookie = "tap_demo_user=; path=/; max-age=0";
              // Clear Supabase auth cookies (common prefixes)
              document.cookie.split("; ").forEach(c => {
                const name = c.split("=")[0];
                if (name.includes("sb-") || name.includes("supabase")) {
                  document.cookie = name + "=; path=/; max-age=0";
                }
              });
              window.location.href = "/login";
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
        <div className="px-5 pb-6 pt-4 text-xs text-white/50">TAP Client Hub v1.0</div>
      </div>
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState("admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Hide sidebar on auth pages ──
  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth");

  // ── Filter nav items by role ──
  const [userModules, setUserModules] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tap_users");
      if (stored) {
        const users = JSON.parse(stored);
        const currentUser = users.find((u: any) => u.email === "tushar@tapallc.com");
        if (currentUser?.modules) {
          setUserModules(currentUser.modules as string[]);
        }
      }
    } catch {}
  }, []);
  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.role === "owner" && role !== "owner" && role !== "admin") return false;
    // If a non-owner user has module restrictions, hide items not in their module list
    if (userModules.length > 0 && role !== "owner" && role !== "admin") {
      return userModules.includes(item.label);
    }
    return true;
  });

  // ── Determine active page title ──
  const pageInfo = PAGE_TITLES[pathname] || PAGE_TITLES["/"];

  return (
    <html lang="en" className={`${publicSans.variable} ${fraunces.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: "var(--paper)" }}>
        {/* ── Desktop Sidebar (hidden on auth pages) ── */}
        {!isAuthPage && (
          <aside
            className="hidden md:flex sticky top-0 h-screen flex-col shrink-0 select-none"
            style={{
              width: "var(--sidebar-width)",
              background: `linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%)`,
              color: "#ffffff",
            }}
          >
            {/* Brand */}
            <div className="px-5 pt-8 pb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-white m-0">TAP</h2>
              <p className="text-xs mt-1 opacity-70 leading-relaxed">Associates, LLC &middot; Est. 1999</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
              {visibleNav.map((item) => {
                if (item.label === "---") {
                  return <div key="sep-desktop-1" className="my-3 mx-2 border-t border-white/15" />;
                }
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150 text-white ${
                      isActive ? "bg-white/15" : "hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="px-3 pb-3">
              <button
                onClick={() => {
                  document.cookie = "tap_demo_user=; path=/; max-age=0";
                  document.cookie.split("; ").forEach(c => {
                    const name = c.split("=")[0];
                    if (name.includes("sb-") || name.includes("supabase")) {
                      document.cookie = name + "=; path=/; max-age=0";
                    }
                  });
                  window.location.href = "/login";
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-150"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 pb-6 pt-4 text-xs text-white/50">TAP Client Hub v1.0</div>
          </aside>
        )}

        {/* ── Mobile sidebar drawer ── */}
        {!isAuthPage && (
          <MobileSidebar visibleNav={visibleNav} pathname={pathname} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar (hidden on auth pages) */}
          {!isAuthPage && (
            <header
              className="sticky top-0 z-10 flex items-center justify-between h-14 md:h-16 px-3 md:px-6 shrink-0"
              style={{
                backgroundColor: "var(--card)",
                borderBottom: `1px solid var(--line)`,
                boxShadow: "var(--shadow)",
              }}
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                {/* Hamburger */}
                <button
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--teal-soft)] transition-colors shrink-0"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
                >
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                    <rect y="0" width="20" height="2" rx="1" fill="var(--ink)" />
                    <rect y="7" width="20" height="2" rx="1" fill="var(--ink)" />
                    <rect y="14" width="20" height="2" rx="1" fill="var(--ink)" />
                  </svg>
                </button>

                <div className="min-w-0">
                  <h1 className="text-base md:text-lg font-semibold text-[var(--ink)] m-0 leading-tight truncate">
                    {pageInfo.title}
                  </h1>
                  <p className="hidden sm:block text-xs text-[var(--muted)] m-0">{pageInfo.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 md:gap-3">
                {/* Role selector */}
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="text-xs md:text-sm rounded-lg px-2 md:px-3 py-1.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer"
                >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>

                {/* Action buttons removed — per-page actions belong on each page, not in global header */}
              </div>
            </header>
          )}

          {/* Page content */}
          <main className={`flex-1 ${isAuthPage ? "" : "p-3 md:p-6"}`}>{children}</main>
        </div>
      </body>
    </html>
  );
}
