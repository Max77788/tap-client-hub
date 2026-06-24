"use client";

import { useState, useMemo, useEffect } from "react";
import { PageSkeleton } from "@/components/loading-skeleton";

// ── Types ──
interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  location: string;
  mgr: string;
  modules: string[];
  status: string;
}

const ROLE_OPTIONS = ["Owner / Admin", "Manager", "Staff", "Offshore"];
const LOCATION_OPTIONS = ["US", "India"];
const STATUS_OPTIONS = ["Active", "Invite sent", "Reset required", "Inactive"];

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  Active: { bg: "var(--green-soft)", fg: "var(--green)" },
  "Invite sent": { bg: "var(--amber-soft)", fg: "var(--amber)" },
  "Reset required": { bg: "var(--red-soft)", fg: "var(--red)" },
  Inactive: { bg: "var(--red-soft)", fg: "var(--red)" },
};

// ── Inline SVG icons ──
function PencilIcon() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 3L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>); }

// ── Main Users Page ──
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ user: User | null; password: string; saving: boolean; message: string }>({ user: null, password: "", saving: false, message: "" });

  // Fetch from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error("Failed to load users");
        const data = await res.json();
        if (!cancelled) {
          setUsers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load users");
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(
    () => ({
      total: users.length,
      managers: users.filter((u) => u.role === "Manager").length,
      offshore: users.filter((u) => u.role === "Offshore").length,
      pending: users.filter((u) => u.status !== "Active").length,
    }),
    [users]
  );

  async function handlePasswordChange(user: User) {
    if (passwordModal.user?.id === user.id && passwordModal.message) {
      setPasswordModal({ user: null, password: "", saving: false, message: "" });
      return;
    }
    setPasswordModal({ user, password: "", saving: false, message: "" });
  }

  async function submitPasswordChange() {
    if (!passwordModal.user || !passwordModal.password) return;
    setPasswordModal((prev) => ({ ...prev, saving: true, message: "" }));
    try {
      const res = await fetch(`/api/profiles/${passwordModal.user.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordModal.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setPasswordModal((prev) => ({ ...prev, saving: false, password: "", message: "Password changed successfully!" }));
      setTimeout(() => setPasswordModal({ user: null, password: "", saving: false, message: "" }), 2000);
    } catch (err: any) {
      setPasswordModal((prev) => ({ ...prev, saving: false, message: err.message || "Failed to change password" }));
    }
  }

  if (loading) return <PageSkeleton rows={6} />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 rounded-xl text-center" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--red-soft)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 className="text-base font-semibold text-[var(--ink)] mb-1">Failed to load users</h3>
        <p className="text-sm text-[var(--muted)]">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--teal)" }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Users" value={stats.total} color="var(--ink)" />
        <StatCard label="Managers" value={stats.managers} color="var(--blue)" />
        <StatCard label="Offshore" value={stats.offshore} color="var(--teal)" />
        <StatCard label="Pending invites" value={stats.pending} color="var(--amber)" />
      </div>

      {/* Users table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)", backgroundColor: "#faf7f0" }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Username</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Location</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Reports to</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Modules</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--line)" }} className="hover:bg-[var(--teal-soft)]/30 transition-colors">
                  <td className="px-5 py-3 font-semibold text-[var(--ink)]">{u.name}</td>
                  <td className="px-5 py-3 text-[var(--muted)] text-sm font-mono">{u.username}</td>
                  <td className="px-5 py-3 text-[var(--muted)]">{u.location}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: u.role === "Owner / Admin" ? "var(--teal-soft)" : u.role === "Manager" ? "var(--blue-soft)" : "var(--green-soft)", color: u.role === "Owner / Admin" ? "var(--teal)" : u.role === "Manager" ? "var(--blue)" : "var(--green)" }}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3 text-[var(--muted)]">{u.mgr}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: STATUS_STYLES[u.status]?.bg || "var(--line)", color: STATUS_STYLES[u.status]?.fg || "var(--muted)" }}>{u.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.modules.slice(0, 3).map((m) => (
                        <span key={m} className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal)" }}>{m}</span>
                      ))}
                      {u.modules.length > 3 && <span className="text-[10px] text-[var(--muted)]">+{u.modules.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handlePasswordChange(u)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--teal)",
                        color: "var(--teal)",
                        backgroundColor: "transparent",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--teal-soft)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      Change Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <div className="p-12 text-center text-[var(--muted)]">No users found</div>}
        <div className="px-5 py-2 text-xs text-[var(--muted)] border-t border-[var(--line)]">{users.length} users from Supabase</div>
      </div>

      {/* Password Change Modal */}
      {passwordModal.user && (
        <>
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(26,35,64,0.4)" }}
            onClick={() => setPasswordModal({ user: null, password: "", saving: false, message: "" })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative w-full max-w-sm rounded-xl shadow-2xl pointer-events-auto p-6"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "var(--shadow)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-[var(--ink)] mb-1">Change Password</h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Set new password for <strong>{passwordModal.user.name}</strong>
              </p>
              {passwordModal.message ? (
                <div className="space-y-3">
                  <div
                    className="text-xs font-medium px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: passwordModal.message.includes("success") ? "var(--green-soft)" : "var(--red-soft)",
                      color: passwordModal.message.includes("success") ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {passwordModal.message}
                  </div>
                  <button
                    onClick={() => setPasswordModal({ user: null, password: "", saving: false, message: "" })}
                    className="w-full text-sm font-semibold px-4 py-2 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 transition-opacity"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="password"
                    value={passwordModal.password}
                    onChange={(e) => setPasswordModal((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="New password"
                    className="w-full text-sm rounded-lg px-3 py-2 border outline-none"
                    style={{
                      borderColor: "var(--line)",
                      backgroundColor: "var(--card)",
                      color: "var(--ink)",
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordModal({ user: null, password: "", saving: false, message: "" })}
                      className="flex-1 text-sm font-medium px-4 py-2 rounded-lg border"
                      style={{
                        borderColor: "var(--line)",
                        color: "var(--ink)",
                        backgroundColor: "transparent",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitPasswordChange}
                      disabled={passwordModal.saving || !passwordModal.password}
                      className="flex-1 text-sm font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50"
                      style={{
                        backgroundColor: passwordModal.saving ? "var(--muted)" : "var(--teal)",
                      }}
                    >
                      {passwordModal.saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Stat Card ──
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-xl flex flex-col" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">{label}</p>
      <p className="text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}
