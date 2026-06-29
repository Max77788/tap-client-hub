"use client";

import { useState, useMemo, useEffect } from "react";
import { PageSkeleton } from "@/components/loading-skeleton";

interface User {
  id: string; name: string; email: string; username: string;
  role: string; location: string; mgr: string; modules: string[]; status: string;
  email_2fa_enabled?: boolean;
}

const MODULES_LIST = ["Clients", "Financials", "Payroll", "Sales Tax", "1099s", "Renditions", "Timesheet", "Vault", "Workload", "Users & Access"];
const ROLE_OPTIONS = ["Owner / Admin", "Manager", "Staff", "Offshore"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<User | "new" | null>(null);
  const [editForm, setEditForm] = useState<Partial<User & { password?: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Password change state
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

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

  function openModal(user: User | "new" | null) {
    setModalUser(user);
    setSaveError(null);
    setEditForm(user !== "new" ? {
      name: user.name, location: user.location, role: user.role,
      mgr: user.mgr, username: user.username, modules: [...user.modules],
      email: user.email,
    } : {
      name: "", location: "", role: "Staff", mgr: "—", username: "",
      email: "", password: "", modules: [],
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (modalUser !== "new") {
        // Update existing user
        const res = await fetch("/api/profiles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: modalUser.id,
            full_name: editForm.name,
            role: (editForm.role || "Staff").toLowerCase().replace(/ /g, "_"),
            location: editForm.location,
            reporting_manager: editForm.mgr === "—" ? null : editForm.mgr,
            modules: editForm.modules || [],
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update");
        }
      } else {
        // Create new user
        if (!editForm.email || !editForm.password || !editForm.name) {
          throw new Error("Name, email, and password are required");
        }
        const res = await fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: editForm.name,
            email: editForm.email,
            password: editForm.password,
            role: (editForm.role || "Staff").toLowerCase().replace(/ /g, "_"),
            location: editForm.location,
            reporting_manager: editForm.mgr === "—" ? null : editForm.mgr,
            modules: editForm.modules || [],
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create user");
        }
      }
      setModalUser(null);
      // Refresh list
      const res = await fetch("/api/profiles");
      if (res.ok) setUsers(await res.json());
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!passwordUser || !newPassword.trim()) return;
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      const res = await fetch(`/api/profiles/${passwordUser.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change password");
      }
      setPasswordSuccess("Password updated successfully.");
      setNewPassword("");
      setTimeout(() => { setPasswordUser(null); setPasswordSuccess(null); }, 1500);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
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
        <button className="btn" onClick={() => openModal("new")} style={{
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
            <tr><th>Name</th><th>Location</th><th>Role</th><th>Reports to</th><th>Modules</th><th>Username</th><th>2FA</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map(u => {
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
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
                      background: u.email_2fa_enabled ? "var(--green-soft)" : "var(--line)",
                      color: u.email_2fa_enabled ? "var(--green)" : "var(--muted)",
                    }}>
                      {u.email_2fa_enabled ? "✅ On" : "○ Off"}
                    </span>
                  </td>
                  <td><span className={`ustat`} style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: u.status === "Active" ? "var(--green-soft)" : "var(--amber-soft)", color: u.status === "Active" ? "var(--green)" : "var(--amber)" }}>{u.status}</span></td>
                  <td>
                    <span onClick={e => { e.stopPropagation(); setPasswordUser(u); setNewPassword(""); setPasswordError(null); setPasswordSuccess(null); }} style={{ cursor: "pointer", fontSize: 12, color: "var(--teal)", fontWeight: 600, whiteSpace: "nowrap" }}>🔑 Change password</span>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={9} className="empty">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ── User modal ── */}
      {modalUser !== null && (
        <>
          <div className="mscrim show" onClick={() => setModalUser(null)} />
          <div className="modal" style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 61, background: "var(--paper)", borderRadius: 18, width: 520,
            maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow)",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: '"Fraunces",Georgia,serif', fontSize: 22, fontWeight: 600, padding: "20px 24px 4px", margin: 0 }}>
              {modalUser === "new" ? "Add a user" : "Edit user"}
            </h2>
            <div className="msub" style={{ color: "var(--muted)", fontSize: 13, padding: "0 24px 14px", borderBottom: "1px solid var(--line)" }}>
              {modalUser === "new" ? "Provision a new login — the user signs in with their email and the password you set." : "Update their details and access."}
            </div>
            <div className="mform" style={{ padding: "18px 24px" }}>
              <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Full name</label>
              <input className="ef" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={editForm.name || ""} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />

              {modalUser === "new" && (
                <>
                  <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Email address</label>
                  <input className="ef" type="email" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={editForm.email || ""} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="user@tapallc.com" />

                  <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>Initial password</label>
                  <input className="ef" type="password" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={editForm.password || ""} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
                </>
              )}

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

              {saveError && (
                <div style={{ background: "var(--red-soft)", color: "var(--red)", padding: "10px 13px", borderRadius: 9, fontSize: 13, marginTop: 14, fontWeight: 600 }}>
                  {saveError}
                </div>
              )}

              {/* ── 2FA admin toggle ── */}
              {modalUser !== "new" && (
                <div className="twofa-admin" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Two-factor authentication</div>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                      {modalUser.email_2fa_enabled
                        ? "Email 2FA is active for this user."
                        : "Not enabled. Toggle to activate via admin override."}
                    </div>
                  </div>
                  <button
                    className="btn"
                    onClick={async () => {
                      const res = await fetch("/api/2fa/admin-toggle", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          target_user_id: modalUser.id,
                          enabled: !modalUser.email_2fa_enabled,
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setUsers(prev => prev.map(u =>
                          u.id === modalUser.id ? { ...u, email_2fa_enabled: data.enabled } : u
                        ));
                        setModalUser({ ...modalUser, email_2fa_enabled: data.enabled });
                      } else {
                        const data = await res.json();
                        alert(data.error || "Failed to toggle 2FA");
                      }
                    }}
                    style={{
                      all: "unset", cursor: "pointer",
                      background: modalUser.email_2fa_enabled ? "var(--red-soft)" : "var(--green-soft)",
                      color: modalUser.email_2fa_enabled ? "var(--red)" : "var(--green)",
                      padding: "7px 14px", borderRadius: 9, fontWeight: 600, fontSize: 12,
                      display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap",
                    }}
                  >
                    {modalUser.email_2fa_enabled ? "🔴 Disable 2FA" : "🟢 Enable 2FA"}
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, padding: "0 24px 22px", justifyContent: "flex-end" }}>
              <button className="btn alt" onClick={() => setModalUser(null)} disabled={saving} style={{ all: "unset", cursor: "pointer", background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)", padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px" }}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={saving} style={{ all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff", padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px" }}>{saving ? "Saving..." : "Save changes"}</button>
            </div>
          </div>
        </>
      )}

      {/* ── Password change modal ── */}
      {passwordUser !== null && (
        <>
          <div className="mscrim show" onClick={() => { setPasswordUser(null); setPasswordSuccess(null); }} />
          <div className="modal" style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 61, background: "var(--paper)", borderRadius: 18, width: 400,
            maxWidth: "90vw", boxShadow: "var(--shadow)",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: '"Fraunces",Georgia,serif', fontSize: 22, fontWeight: 600, padding: "20px 24px 4px", margin: 0 }}>
              Change password
            </h2>
            <div className="msub" style={{ color: "var(--muted)", fontSize: 13, padding: "0 24px 14px", borderBottom: "1px solid var(--line)" }}>
              Set a new password for <strong>{passwordUser.name}</strong> ({passwordUser.username || passwordUser.email}).
            </div>
            <div className="mform" style={{ padding: "18px 24px" }}>
              <label className="el" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", margin: "12px 0 4px", display: "block" }}>New password</label>
              <input className="ef" type="password" style={{ width: "100%", padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4 }} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" autoFocus />

              {passwordError && (
                <div style={{ background: "var(--red-soft)", color: "var(--red)", padding: "10px 13px", borderRadius: 9, fontSize: 13, marginTop: 14, fontWeight: 600 }}>
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div style={{ background: "var(--green-soft)", color: "var(--green)", padding: "10px 13px", borderRadius: 9, fontSize: 13, marginTop: 14, fontWeight: 600 }}>
                  {passwordSuccess}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, padding: "0 24px 22px", justifyContent: "flex-end" }}>
              <button className="btn alt" onClick={() => { setPasswordUser(null); setPasswordSuccess(null); }} disabled={passwordSaving} style={{ all: "unset", cursor: "pointer", background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)", padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px" }}>Cancel</button>
              <button className="btn" onClick={handleChangePassword} disabled={passwordSaving || !newPassword.trim()} style={{ all: "unset", cursor: "pointer", background: !newPassword.trim() ? "var(--line)" : "var(--ink)", color: "#fff", padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px" }}>{passwordSaving ? "Updating..." : "Update password"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
