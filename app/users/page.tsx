"use client";

import { useState, useMemo, useEffect } from "react";
import { PageSkeleton } from "@/components/loading-skeleton";

interface User {
  id: string; name: string; email: string; username: string;
  role: string; location: string; mgr: string; modules: string[]; status: string;
}

const MODULES_LIST = ["Clients", "Financials", "Payroll", "Sales Tax", "1099s", "Renditions", "Timesheet", "Vault", "Workload", "Users & Access"];
const ROLE_OPTIONS = ["Owner / Admin", "Manager", "Staff", "Offshore"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profiles");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) { setUsers(Array.isArray(data) ? data : []); setLoading(false); }
      } catch (err: any) {
        if (!cancelled) { setError(err.message); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    total: users.length,
    managers: users.filter(u => u.role === "Manager").length,
    offshore: users.filter(u => u.role === "Offshore").length,
    pending: users.filter(u => u.status !== "Active").length,
  }), [users]);

  function openModal(user: User | null) {
    setModalUser(user);
    setEditForm(user ? { name: user.name, location: user.location, role: user.role, mgr: user.mgr, username: user.username, modules: [...user.modules] } : { name: "", location: "", role: "Staff", mgr: "—", username: "", modules: [] });
  }

  if (loading) return <PageSkeleton rows={6} />;
  if (error) return <div className="panel" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" }}><div className="empty" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Failed to load users. <button onClick={() => window.location.reload()} style={{ all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600 }}>Retry</button></div></div>;

  return (
    <div>
      {/* ── Info banner ── */}
      <div className="vault-note" style={{
        background: "var(--amber-soft)", border: "1px solid #ead9b6", color: "#7a5210",
        borderRadius: 13, padding: "13px 16px", marginBottom: 14, fontSize: 13, display: "flex", gap: 10,
      }}>
        <span>🔐</span>
        <div>
          <b>How logins work.</b> You provision the account and choose exactly what each person can open; the system emails a one-time setup link and the user sets their own password on first login. Passwords are stored encrypted — never shown back, even to you — and the India web door also requires a second factor.
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          [stats.total, "Users", "var(--ink)"],
          [stats.managers, "Managers", "var(--blue)"],
          [stats.offshore, "Offshore", "var(--teal)"],
          [stats.pending, "Pending invites", "var(--amber)"],
        ].map(([v, l, c]) => (
          <div key={l as string} className="statcard" style={{ flex: 1, minWidth: 120, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 13, padding: "13px 16px", boxShadow: "0 1px 2px rgba(33,31,26,0.04)" }}>
            <div style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: 26, lineHeight: 1, color: c as string }}>{v as number}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{l as string}</div>
          </div>
        ))}
      </div>

      {/* ── Count line ── */}
      <div className="count" style={{ color: "var(--muted)", fontSize: 13, margin: "12px 2px 6px" }}>
        Click a user to edit their access · use ＋ Add user to provision a new login
      </div>

      {/* ── Add button ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button className="btn" onClick={() => openModal(null)} style={{
          all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff",
          padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px",
          display: "inline-flex", gap: 7, alignItems: "center",
        }}>
          ＋ Add user
        </button>
      </div>

      {/* ── Users table ── */}
      <div className="panel" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden", overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Location</th><th>Role</th><th>Reports to</th><th>Modules</th><th>Username</th><th>Status</th></tr>
          </thead>
          <tbody>
            {users.map(u => {
              const chips = u.modules.length > 4
                ? [...u.modules.slice(0, 4).map(m => `<span class="uchip">${m}</span>`), `<span class="uchip">+${u.modules.length - 4}</span>`]
                : u.modules.map(m => `<span class="uchip">${m}</span>`);
              const sc = u.status === "Active" ? "act" : "inv";
              return (
                <tr key={u.id} onClick={() => openModal(u)} style={{ cursor: "pointer" }}>
                  <td className="lname">{u.name}</td>
                  <td>{u.location}</td>
                  <td><span className="urole" style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--blue-soft)", color: "var(--blue)" }}>{u.role}</span></td>
                  <td>{u.mgr}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                      {u.modules.slice(0, 4).map(m => (
                        <span key={m} className="uchip" style={{ display: "inline-block", background: "var(--teal-soft)", color: "var(--teal-ink)", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, margin: "2px 3px 0 0" }}>{m}</span>
                      ))}
                      {u.modules.length > 4 && <span className="uchip" style={{ display: "inline-block", background: "var(--teal-soft)", color: "var(--teal-ink)", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, margin: "2px 3px 0 0" }}>+{u.modules.length - 4}</span>}
                    </div>
                  </td>
                  <td className="mono">{u.username}</td>
                  <td><span className={`ustat ${sc}`} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: u.status === "Active" ? "var(--green-soft)" : "var(--amber-soft)", color: u.status === "Active" ? "var(--green)" : "var(--amber)" }}>{u.status}</span></td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={7} className="empty">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ── User modal ── */}
      {modalUser !== null && (
        <>
          <div className="mscrim show" onClick={() => setModalUser(null)} />
          <div className="modal" style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 61, background: "var(--paper)", borderRadius: 18, width: 480,
            maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow)",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: '"Fraunces",Georgia,serif', fontSize: 22, fontWeight: 600, padding: "20px 24px 4px", margin: 0 }}>
              {modalUser ? "Edit user" : "Add a user"}
            </h2>
            <div className="msub" style={{ color: "var(--muted)", fontSize: 13, padding: "0 24px 14px", borderBottom: "1px solid var(--line)" }}>
              Set who they are, what they can open, and who they report to.
            </div>
            <div className="mform" style={{ padding: "18px 24px" }}>
              <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Full name</label>
              <input className="ef" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={editForm.name || ""} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />

              <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Location</label>
              <input className="ef" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={editForm.location || ""} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Houston, TX or Pune, India" />

              <div className="two-ef" style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Role</label>
                  <select className="ef" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={editForm.role || ""} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                    {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Reports to</label>
                  <select className="ef" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={editForm.mgr || ""} onChange={e => setEditForm(p => ({ ...p, mgr: e.target.value }))}>
                    <option>—</option>
                    {users.filter(x => /Manager|Owner/.test(x.role)).map(x => <option key={x.id}>{x.name}</option>)}
                  </select>
                </div>
              </div>

              <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Username</label>
              <input className="ef" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={editForm.username || ""} onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} placeholder="auto from first name if blank" />

              <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Modules they can access</label>
              <div className="modgrid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 7, marginTop: 6 }}>
                {MODULES_LIST.map(m => (
                  <label key={m} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)" }}>
                    <input type="checkbox" checked={(editForm.modules || []).includes(m)} onChange={e => {
                      setEditForm(p => ({
                        ...p,
                        modules: e.target.checked ? [...(p.modules || []), m] : (p.modules || []).filter(x => x !== m),
                      }));
                    }} style={{ width: "auto" }} />
                    {m}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, padding: "0 24px 22px", justifyContent: "flex-end" }}>
              <button className="btn alt" onClick={() => setModalUser(null)} style={{ all: "unset", cursor: "pointer", background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)", padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px" }}>Cancel</button>
              <button className="btn" onClick={() => setModalUser(null)} style={{ all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff", padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px" }}>Save changes</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
