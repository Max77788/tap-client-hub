"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
  mgr: string;
  modules: string[];
  status: string;
}

const MODULES = [
  "Clients", "Financials", "Payroll", "Sales Tax", "1099s",
  "Renditions", "Timesheet", "Vault", "Workload", "Users & Access",
];

const ROLE_OPTIONS = ["Owner / Admin", "Manager", "Staff", "Offshore"];
const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  Active: { bg: "var(--green-soft)", fg: "var(--green)" },
  "Invite sent": { bg: "var(--amber-soft)", fg: "var(--amber)" },
  "Reset required": { bg: "var(--red-soft)", fg: "var(--red)" },
  Inactive: { bg: "var(--red-soft)", fg: "var(--red)" },
};

// ── Mock users (real TAP Associates team) ──
const MOCK_USERS: User[] = [
  { id: "u1", name: "Tushar Patil", email: "tushar@tapallc.com", role: "Owner / Admin", location: "US", mgr: "—", modules: [...MODULES], status: "Active" },
  { id: "u2", name: "Lizette Esparza", email: "accounts4@tapallc.com", role: "Manager", location: "US", mgr: "Tushar Patil", modules: [...MODULES], status: "Active" },
  { id: "u3", name: "Janeth Noguera", email: "admin2@tapallc.com", role: "Staff", location: "US", mgr: "Lizette Esparza", modules: ["Clients","Payroll","Sales Tax","Business Taxes","Personal Taxes","Renditions","1099s","Annual Reports","Timesheet","Vault","Users & Access","Support"], status: "Active" },
  { id: "u4", name: "Shilpa Kulkarni", email: "accounts2@tapallc.com", role: "Staff", location: "US", mgr: "Lizette Esparza", modules: ["Clients","Financials","Payroll","Business Taxes","Personal Taxes","1099s","Timesheet","Vault","Users & Access","Support"], status: "Active" },
  { id: "u5", name: "Bonnie Edwards", email: "admin@tapallc.com", role: "Staff", location: "US", mgr: "Lizette Esparza", modules: ["Clients","Renditions","Annual Reports","Timesheet","Vault","Users & Access","Billing","Support"], status: "Active" },
  { id: "u6", name: "Sam Patil", email: "accounts@tapallc.com", role: "Offshore/India", location: "India", mgr: "Lizette Esparza", modules: ["Clients","Financials","Sales Tax","1099s","Timesheet","Vault","Users & Access","Billing","Support"], status: "Active" },
  { id: "u7", name: "Amruta Patil", email: "accounts3@tapallc.com", role: "Offshore/India", location: "India", mgr: "Lizette Esparza", modules: ["Clients","Financials","Payroll","Sales Tax","1099s","Timesheet","Vault","Users & Access"], status: "Active" },
  { id: "u8", name: "Alvaro Ortega", email: "tax2@tapallc.com", role: "Staff", location: "US", mgr: "Lizette Esparza", modules: ["Clients","Business Taxes","Vault","Users & Access","Support"], status: "Active" },
  { id: "u9", name: "Sanket Panchasara", email: "tax@tapallc.com", role: "Offshore/India", location: "India", mgr: "Lizette Esparza", modules: ["Clients","Financials","Timesheet","Vault","Users & Access","Support"], status: "Active" },
];

// ── User Modal ──
function UserModal({ user, onClose, onSave, onDelete }: {
  user: User | null;
  onClose: () => void;
  onSave: (u: User) => void;
  onDelete?: (id: string) => void;
}) {
  const [name, setName] = useState(user?.name || "");
  const [location, setLocation] = useState(user?.location || "");
  const [role, setRole] = useState(user?.role || "Staff");
  const [mgr, setMgr] = useState(user?.mgr || "—");
  const [username, setUsername] = useState(user?.email?.split("@")[0] || "");
  const [modules, setModules] = useState<string[]>(user?.modules || []);
  const isEdit = !!user;

  const toggleModule = (m: string) => {
    setModules((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: user?.id || "u" + Date.now(),
      name: name.trim(),
      email: username.trim() + "@tapallc.com",
      role, location, mgr, modules,
      status: isEdit ? user!.status : "Invite sent",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--paper)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold px-6 pt-5 pb-1" style={{ fontFamily: "Fraunces, Georgia, serif", color: "var(--ink)" }}>
          {isEdit ? "Edit user" : "Add a user"}
        </h2>
        <p className="text-sm text-[var(--muted)] px-6 pb-4 border-b border-[var(--line)]">
          Set who they are, what they can open, and who they report to.
        </p>

        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Full name</label>
            <input className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] bg-white text-sm text-[var(--ink)]" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lizette" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Location</label>
            <input className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] bg-white text-sm text-[var(--ink)]" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Houston, TX or Pune, India" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Role</label>
              <select className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] bg-white text-sm text-[var(--ink)]" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Reports to</label>
              <select className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] bg-white text-sm text-[var(--ink)]" value={mgr} onChange={(e) => setMgr(e.target.value)}>
                <option>—</option>
                {MOCK_USERS.filter((u) => ["Owner / Admin", "Manager"].includes(u.role)).map((u) => (
                  <option key={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Username</label>
            <input className="w-full px-3 py-2.5 rounded-lg border border-[var(--line)] bg-white text-sm text-[var(--ink)]" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="auto from first name if blank" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Modules they can access</label>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-[var(--ink)] cursor-pointer">
                  <input type="checkbox" checked={modules.includes(m)} onChange={() => toggleModule(m)} />
                  {m}
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl flex gap-2 text-sm mt-3" style={{ backgroundColor: "var(--amber-soft)", border: "1px solid #ead9b6", color: "#7a5210" }}>
            <span>✉️</span>
            <div>On save, {isEdit ? "changes take effect at their next login" : "a one-time setup link is emailed and they set their own password on first login"}. You never see or store their password.</div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2">
          {isEdit && onDelete && (
            <button onClick={() => onDelete(user!.id)} className="px-4 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "var(--red-soft)", backgroundColor: "var(--red-soft)", color: "var(--red)" }}>
              Remove
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-[var(--line)] text-[var(--ink)] bg-white">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2.5 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: "var(--teal)" }}>
            {isEdit ? "Save changes" : "Create user"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Users Page ──
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const stats = useMemo(() => ({
    total: users.length,
    managers: users.filter((u) => u.role === "Manager").length,
    offshore: users.filter((u) => u.role === "Offshore").length,
    pending: users.filter((u) => u.status !== "Active").length,
  }), [users]);

  const handleSave = (u: User) => {
    const existing = users.find((x) => x.id === u.id);
    if (existing) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
    } else {
      setUsers((prev) => [...prev, u]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((x) => x.id !== id));
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--ink)] m-0" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
            Users & Access
          </h1>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            Who can get into the platform, what they can see, and who they report to
          </p>
        </div>
        <button
          onClick={() => { setSelectedUser(null); setModalOpen(true); }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: "var(--teal)" }}
        >
          + Add user
        </button>
      </div>

      {/* Info banner */}
      <div className="p-4 rounded-xl flex gap-3 text-sm" style={{ backgroundColor: "var(--amber-soft)", border: "1px solid #ead9b6", color: "#7a5210" }}>
        <span>🔐</span>
        <div>
          <b>How logins work.</b> You provision the account and choose exactly what each person can open; the system emails a one-time setup link and the user sets their own password on first login. Passwords are stored encrypted — never shown back, even to you — and the India web door also requires a second factor.
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Users" value={stats.total} color="var(--ink)" />
        <StatCard label="Managers" value={stats.managers} color="var(--blue)" />
        <StatCard label="Offshore" value={stats.offshore} color="var(--teal)" />
        <StatCard label="Pending invites" value={stats.pending} color="var(--amber)" />
      </div>

      <p className="text-sm text-[var(--muted)]">
        Click a user to edit their access · use + Add user to provision a new login
      </p>

      {/* Users table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)", backgroundColor: "#faf7f0" }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Location</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Reports to</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Modules</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Username</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const st = STATUS_STYLES[u.status] || { bg: "var(--blue-soft)", fg: "var(--blue)" };
                const displayModules = u.modules.length > 4
                  ? [...u.modules.slice(0, 4), `+${u.modules.length - 4}`]
                  : u.modules;
                return (
                  <tr
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setModalOpen(true); }}
                    className="cursor-pointer hover:bg-[var(--teal-soft)] transition-colors"
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    <td className="px-5 py-3 font-semibold text-[var(--ink)]">{u.name}</td>
                    <td className="px-5 py-3 text-[var(--muted)]">{u.location}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "var(--blue-soft)", color: "var(--blue)" }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--muted)]">{u.mgr}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {displayModules.map((m) => (
                          <span key={m} className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal-ink)" }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--muted)]">{u.email.split("@")[0]}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: st.bg, color: st.fg }}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <UserModal
          user={selectedUser}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={selectedUser ? handleDelete : undefined}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)", borderLeft: `3px solid ${color}` }}>
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <p className="text-2xl font-bold m-0 leading-tight" style={{ color }}>{value}</p>
    </div>
  );
}
