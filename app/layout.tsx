"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import "./globals.css";

interface NavItem {
  label: string;
  href: string;
  icon?: string;
  role?: "owner" | "all";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Clients", href: "/", icon: "👥" },
  { label: "Team Workload", href: "/workload", icon: "⚖️" },
  { label: "Timesheet", href: "/time", icon: "⏱️" },
  { label: "---", href: "" },
  { label: "Financials", href: "/fin", icon: "📊" },
  { label: "Payroll", href: "/pr", icon: "💵" },
  { label: "Sales Tax", href: "/stx", icon: "🧾" },
  { label: "1099s", href: "/t9", icon: "📄" },
  { label: "Renditions", href: "/rend", icon: "🏠" },
  { label: "Tax Returns", href: "/tax", icon: "📋" },
  { label: "---", href: "" },
  { label: "Password Vault", href: "/vault", icon: "🔒" },
  { label: "Users & Access", href: "/users", icon: "🪪", role: "owner" },
  { label: "---", href: "" },
  { label: "Settings", href: "/settings/2fa" },
  { label: "Help & Support", href: "/support", icon: "🛟" },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Clients", subtitle: "Active client accounts and engagement tracking" },
  "/workload": { title: "Team Workload", subtitle: "Per-person workload distribution and service mix" },
  "/time": { title: "Timesheet", subtitle: "Live time tracking by person and client" },
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
      <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />
      <div
        ref={ref}
        className="fixed top-0 left-0 z-50 h-full w-64 flex flex-col shadow-2xl md:hidden"
        style={{
          background: "linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%)",
          color: "#eef2fb",
        }}
      >
        <div className="px-4 pt-[22px] pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white m-0" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>TAP</h2>
            <p className="text-[10.5px] uppercase tracking-[0.13em] font-medium mt-1.5" style={{ color: "#9fb0d8", fontFamily: '"Public Sans", sans-serif' }}>Associates, LLC · Est. 1999</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#c4cee8] hover:text-white text-lg leading-none p-1"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-[3px] overflow-y-auto" style={{ marginTop: 6 }}>
          {visibleNav.map((item, i) => {
            if (item.label === "---") {
              return <div key={`sep-m-${i}`} className="mx-1.5 my-3 border-t" style={{ borderColor: "rgba(255,255,255,0.14)" }} />;
            }
            const isActive = pathname === item.href;
            return (
              <a
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-[11px] px-3 py-[10px] rounded-[10px] font-medium transition-colors"
                style={{
                  color: isActive ? "var(--teal-ink)" : "#c4cee8",
                  backgroundColor: isActive ? "#fff" : "transparent",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                }}
              >
                {item.icon && (
                  <span
                    style={{
                      display: "inline-flex",
                      width: 18,
                      justifyContent: "center",
                      fontSize: 15,
                      opacity: 0.9,
                    }}
                  >
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
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
            className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-sm font-medium text-[#c4cee8] hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
        <div className="px-4 pb-[22px] pt-4 text-[11px]" style={{ color: "#8a9bc6" }}>TAP Client Hub v1.0</div>
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
  const [userEmail, setUserEmail] = useState("");

  const isAuthPage = pathname === "/login" || pathname.startsWith("/auth");

  // Read email from cookie
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)tap_demo_email=([^;]*)/);
    if (match) {
      setUserEmail(decodeURIComponent(match[1]));
    }
  }, []);

  const [userModules, setUserModules] = useState<string[]>([]);
  useEffect(() => {
    async function loadUserModules() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) return;
        const users = await res.json();
        const currentUser = Array.isArray(users) ? users.find((u: any) => u.email === "tushar@tapallc.com") : null;
        if (currentUser?.modules) {
          setUserModules(currentUser.modules as string[]);
        }
      } catch {}
    }
    loadUserModules();
  }, []);

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.role === "owner" && role !== "owner" && role !== "admin") return false;
    if (userModules.length > 0 && role !== "owner" && role !== "admin") {
      return userModules.includes(item.label);
    }
    return true;
  });

  const pageInfo = PAGE_TITLES[pathname] || PAGE_TITLES["/"];

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: "var(--paper)" }}>
        {/* ── Desktop Sidebar ── */}
        {!isAuthPage && (
          <aside
            className="hidden md:flex sticky top-0 h-screen flex-col shrink-0 select-none"
            style={{
              width: "var(--sidebar-width)",
              background: "linear-gradient(180deg, var(--sidebar-start) 0%, var(--sidebar-end) 100%)",
              color: "#eef2fb",
              padding: "22px 16px",
            }}
          >
            {/* Brand */}
            <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600, fontSize: 24, color: "#fff", lineHeight: 1 }}>
              TAP
              <div style={{ display: "block", fontFamily: '"Public Sans", sans-serif', fontWeight: 500, fontSize: "10.5px", letterSpacing: "0.13em", textTransform: "uppercase", color: "#9fb0d8", marginTop: 6 }}>
                Associates, LLC · Est. 1999
              </div>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-[3px] flex-1" style={{ marginTop: 28 }}>
              {visibleNav.map((item, i) => {
                if (item.label === "---") {
                  return <div key={`sep-${i}`} className="mx-1.5 my-3 border-t" style={{ borderColor: "rgba(255,255,255,0.14)" }} />;
                }
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-[11px] px-3 py-[10px] rounded-[10px] font-medium transition-colors"
                    style={{
                      color: isActive ? "var(--teal-ink)" : "#c4cee8",
                      backgroundColor: isActive ? "#fff" : "transparent",
                      fontWeight: isActive ? 600 : 500,
                      fontSize: 14,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.10)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {item.icon && (
                      <span
                        style={{
                          display: "inline-flex",
                          width: 18,
                          justifyContent: "center",
                          fontSize: 15,
                          opacity: 0.9,
                        }}
                      >
                        {item.icon}
                      </span>
                    )}
                    <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="pb-3">
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
            className="flex items-center gap-2 px-3 py-[10px] rounded-[10px] text-sm font-medium transition-colors w-full"
                style={{ color: "#c4cee8" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#c4cee8"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9 }}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>

            {/* Footer */}
            <div className="text-[11px]" style={{ color: "#8a9bc6", lineHeight: 1.5 }}>
              TAP Client Hub v1.0
            </div>
          </aside>
        )}

        {/* ── Mobile sidebar drawer ── */}
        {!isAuthPage && (
          <MobileSidebar visibleNav={visibleNav} pathname={pathname} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          {!isAuthPage && (
            <header
              className="flex items-end justify-between shrink-0"
              style={{
                padding: "22px 32px 0",
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
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
                  <h1 className="text-[30px] font-semibold text-[var(--ink)] m-0 leading-tight truncate" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                    {pageInfo.title}
                  </h1>
                  <p className="hidden sm:block text-[13.5px] text-[var(--muted)] m-0 mt-[3px]">{pageInfo.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {userEmail && (
                  <span className="hidden sm:block text-[12px] text-[var(--muted)] max-w-[160px] truncate">
                    {userEmail}
                  </span>
                )}
                <div className="rolepick hidden sm:flex items-center gap-2">
                  <span className="text-[12px] text-[var(--muted)]">Viewing as</span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="text-[13px] rounded-[10px] px-3 py-[9px] border border-[var(--line)] bg-white text-[var(--ink)] cursor-pointer"
                    style={{ appearance: "none", paddingRight: 30 }}
                  >
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
            </header>
          )}

          {/* Page content */}
          <main className={`flex-1 ${isAuthPage ? "" : "px-8 py-[18px]"}`}>{children}</main>
        </div>
      </body>
    </html>
  );
}
