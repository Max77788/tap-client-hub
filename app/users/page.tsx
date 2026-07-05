"use client";

import { useState, useMemo, useEffect } from "react";
import { PageSkeleton } from "@/components/loading-skeleton";

interface User {
  id: string; name: string; email: string; username: string;
  role: string; location: string; mgr: string; modules: string[]; status: string;
  email_2fa_enabled?: boolean;
}

interface CurrentUser {
  id: string; name: string; role: string;
}

const MODULES_LIST = ["Clients", "Financials", "Payroll", "Sales Tax", "1099s", "Renditions", "Timesheet", "Vault", "Workload", "Users & Access"];
const ROLE_OPTIONS = ["Owner / Admin", "Manager", "Staff", "Offshore"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalUser, setModalUser] = useState<User | "new" | null>(null);
  const [editForm, setEditForm] = useState<Partial<User & { password?: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Load current user (for owner check) ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCurrentUser(data);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setOwnerLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Load all users ──
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
    if (!ownerLoading) load();
    return () => { cancelled = true; };
  }, [ownerLoading]);

  const isOwner = currentUser?.role === "owner" || currentUser?.role === "admin";

  const stats = useMemo(() => ({
    total: users.length,
    managers: users.filter(u => u.role === "Manager").length,
    offshore: users.filter(u => u.role === "Offshore").length,
    pending: users.filter(u => u.status !== "Active").length,
  }), [users]);

  function openModal(user: User | "new" | null) {
    setModalUser(user);
    setSaveError(null);
    setDeleteConfirm(null);
    if (user === "new") {
      setEditForm({
        name: "", location: "", role: "Staff", mgr: "—", username: "",
        email: "", password: "", modules: [],
      });
    } else if (user) {
      setEditForm({
        name: user.name, location: user.location, role: user.role,
        mgr: user.mgr, username: user.username, modules: [...user.modules],
        email: user.email,
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (modalUser !== "new") {
        const res = await fetch("/api/profiles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: modalUser!.id,
            full_name: editForm.name,
            role: (editForm.role === "Owner / Admin" ? "admin" : (editForm.role || "Staff").toLowerCase().replace(/ /g, "_")),
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
            role: (editForm.role === "Owner / Admin" ? "admin" : (editForm.role || "Staff").toLowerCase().replace(/ /g, "_")),
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
      const res = await fetch("/api/profiles");
      if (res.ok) setUsers(await res.json());
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/profiles/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      setModalUser(null);
      setDeleteConfirm(null);
      const reloadRes = await fetch("/api/profiles");
      if (reloadRes.ok) setUsers(await reloadRes.json());
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  // ── Loading / Not-owner states ──
  if (ownerLoading) return <PageSkeleton rows={6} />;
  if (!isOwner) {
    return (
      <div className="panel" style={{
        background: "var(--card)", border: "1px solid var(--line)",
        borderRadius: 16, overflow: "hidden",
      }}>
        <div className="empty" style={{
          padding: 60, textAlign: "center", color: "var(--muted)", fontSize: 15,
        }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Owner access only</div>
          <div style={{ fontSize: 13 }}>Only an Owner or Admin can manage users and access.</div>
        </div>
      </div>
    );
  }

  if (loading) return <PageSkeleton rows={6} />;
  if (error) return (
    <div className="panel" style={{
      background: "var(--card)", border: "1px solid var(--line)",
      borderRadius: 16, overflow: "hidden",
    }}>
      <div className="empty" style={{
        padding: 40, textAlign: "center", color: "var(--muted)",
      }}>
        Failed to load users.{' '}
        <button onClick={() => window.location.reload()} style={{
          all: "unset", cursor: "pointer", color: "var(--teal)", fontWeight: 600,
        }}>Retry</button>
      </div>
    </div>
  );

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
          <div key={l as string} className="statcard" style={{
            flex: 1, minWidth: 120, background: "var(--card)",
            border: "1px solid var(--line)", borderRadius: 13,
            padding: "13px 16px", boxShadow: "0 1px 2px rgba(33,31,26,0.04)",
          }}>
            <div style={{
              fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600,
              fontSize: 26, lineHeight: 1, color: c as string,
            }}>{v as number}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{l as string}</div>
          </div>
        ))}
      </div>

      {/* ── Count line ── */}
      <div className="count" style={{
        color: "var(--muted)", fontSize: 13, margin: "12px 2px 6px",
      }}>
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
      <div className="panel" style={{
        background: "var(--card)", border: "1px solid var(--line)",
        borderRadius: 16, overflow: "hidden", overflowX: "auto",
      }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Role</th>
              <th>Reports to</th>
              <th>Modules</th>
              <th>Username</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} onClick={() => openModal(u)} style={{ cursor: "pointer" }}>
                <td className="lname">{u.name}</td>
                <td>{u.location}</td>
                <td>
                  <span className="urole" style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 9px",
                    borderRadius: 999, background: "var(--blue-soft)", color: "var(--blue)",
                  }}>{u.role}</span>
                </td>
                <td>{u.mgr}</td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {u.modules.slice(0, 4).map(m => (
                      <span key={m} className="uchip" style={{
                        display: "inline-block", background: "var(--teal-soft)",
                        color: "var(--teal-ink)", fontSize: 11, fontWeight: 600,
                        padding: "2px 8px", borderRadius: 999, margin: "2px 3px 0 0",
                      }}>{m}</span>
                    ))}
                    {u.modules.length > 4 && (
                      <span className="uchip" style={{
                        display: "inline-block", background: "var(--teal-soft)",
                        color: "var(--teal-ink)", fontSize: 11, fontWeight: 600,
                        padding: "2px 8px", borderRadius: 999, margin: "2px 3px 0 0",
                      }}>+{u.modules.length - 4}</span>
                    )}
                  </div>
                </td>
                <td className="mono">{u.username}</td>
                <td>
                  <span className="ustat" style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 9px",
                    borderRadius: 999, whiteSpace: "nowrap",
                    background: u.status === "Active" ? "var(--green-soft)" : "var(--amber-soft)",
                    color: u.status === "Active" ? "var(--green)" : "var(--amber)",
                  }}>{u.status}</span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={7} className="empty">No users found</td></tr>
            )}
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
            <h2 style={{
              fontFamily: '"Fraunces",Georgia,serif', fontSize: 22, fontWeight: 600,
              padding: "20px 24px 4px", margin: 0,
            }}>
              {modalUser === "new" ? "Add a user" : "Edit user"}
            </h2>
            <div className="msub" style={{
              color: "var(--muted)", fontSize: 13, padding: "0 24px 14px",
              borderBottom: "1px solid var(--line)",
            }}>
              {modalUser === "new"
                ? "Provision a new login — the user signs in with their email and the password you set."
                : "Update their details and access. Their username and email are set on creation."
              }
            </div>
            <div className="mform" style={{ padding: "18px 24px" }}>
              {/* Full name */}
              <label className="el" style={{
                fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                textTransform: "uppercase", color: "var(--muted)",
                margin: "12px 0 4px", display: "block",
              }}>Full name</label>
              <input className="ef" style={{
                width: "100%", padding: "9px 11px", border: "1px solid var(--line)",
                borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4,
              }} value={editForm.name || ""} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />

              {/* Email + Password (new user only) */}
              {modalUser === "new" && (
                <>
                  <label className="el" style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                    textTransform: "uppercase", color: "var(--muted)",
                    margin: "12px 0 4px", display: "block",
                  }}>Email address</label>
                  <input className="ef" type="email" style={{
                    width: "100%", padding: "9px 11px", border: "1px solid var(--line)",
                    borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4,
                  }} value={editForm.email || ""} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="user@tapallc.com" />

                  <label className="el" style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                    textTransform: "uppercase", color: "var(--muted)",
                    margin: "12px 0 4px", display: "block",
                  }}>Initial password</label>
                  <div style={{ position: "relative", marginBottom: 4 }}>
                    <input className="ef" type={showPassword ? "text" : "password"} style={{
                      width: "100%", padding: "9px 40px 9px 11px", border: "1px solid var(--line)",
                      borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", boxSizing: "border-box",
                    }} value={editForm.password || ""} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Location */}
              <label className="el" style={{
                fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                textTransform: "uppercase", color: "var(--muted)",
                margin: "12px 0 4px", display: "block",
              }}>Location</label>
              <input className="ef" style={{
                width: "100%", padding: "9px 11px", border: "1px solid var(--line)",
                borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4,
              }} value={editForm.location || ""} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Houston, TX or Pune, India" />

              {/* Role + Reports to */}
              <div className="two-ef" style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="el" style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                    textTransform: "uppercase", color: "var(--muted)",
                    margin: "12px 0 4px", display: "block",
                  }}>Role</label>
                  <select className="ef" style={{
                    width: "100%", padding: "9px 11px", border: "1px solid var(--line)",
                    borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4,
                  }} value={editForm.role || ""} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                    {ROLE_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="el" style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                    textTransform: "uppercase", color: "var(--muted)",
                    margin: "12px 0 4px", display: "block",
                  }}>Reports to</label>
                  <select className="ef" style={{
                    width: "100%", padding: "9px 11px", border: "1px solid var(--line)",
                    borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4,
                  }} value={editForm.mgr || ""} onChange={e => setEditForm(p => ({ ...p, mgr: e.target.value }))}>
                    <option>—</option>
                    {users.filter(x => /Manager|Owner/.test(x.role)).map(x => <option key={x.id}>{x.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Username (readonly for edit, shown for both) */}
              <label className="el" style={{
                fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                textTransform: "uppercase", color: "var(--muted)",
                margin: "12px 0 4px", display: "block",
              }}>Username</label>
              {modalUser === "new" ? (
                <input className="ef" style={{
                  width: "100%", padding: "9px 11px", border: "1px solid var(--line)",
                  borderRadius: 9, font: "inherit", fontSize: 14, background: "#fff", marginBottom: 4,
                }} value={editForm.username || ""} onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} placeholder="Auto-generated from email" />
              ) : (
                <div style={{
                  padding: "9px 11px", border: "1px solid var(--line)",
                  borderRadius: 9, fontSize: 14, background: "var(--card)",
                  color: "var(--muted)", marginBottom: 4,
                }}>
                  {editForm.username || "—"} <span style={{ fontSize: 11, color: "var(--muted)" }}>(set on creation)</span>
                </div>
              )}

              {/* Modules checkboxes */}
              <label className="el" style={{
                fontSize: 11, fontWeight: 700, letterSpacing: ".05em",
                textTransform: "uppercase", color: "var(--muted)",
                margin: "16px 0 4px", display: "block",
              }}>Modules they can access</label>
              <div className="modgrid" style={{
                display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 7, marginTop: 6,
              }}>
                {MODULES_LIST.map(m => (
                  <label key={m} style={{
                    display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)",
                  }}>
                    <input type="checkbox" checked={(editForm.modules || []).includes(m)}
                      onChange={e => {
                        setEditForm(p => ({
                          ...p,
                          modules: e.target.checked
                            ? [...(p.modules || []), m]
                            : (p.modules || []).filter(x => x !== m),
                        }));
                      }}
                      style={{ width: "auto" }} />
                    {m}
                  </label>
                ))}
              </div>

              {/* Note about setup link (edit mode) */}
              {modalUser !== "new" && (
                <div style={{
                  background: "var(--blue-soft)", color: "var(--blue)",
                  padding: "10px 13px", borderRadius: 9, fontSize: 12, marginTop: 16,
                  lineHeight: 1.5,
                }}>
                  🔗 <b>Setup link.</b> The user logs in via <strong>portal.tapallc.com</strong>. Their one-time setup link was emailed at account creation. If they need a new one, reset their password — the system sends a fresh setup email automatically.
                </div>
              )}

              {saveError && (
                <div style={{
                  background: "var(--red-soft)", color: "var(--red)",
                  padding: "10px 13px", borderRadius: 9, fontSize: 13, marginTop: 14, fontWeight: 600,
                }}>
                  {saveError}
                </div>
              )}

              {/* Delete confirmation */}
              {deleteConfirm && (
                <div style={{
                  background: "var(--red-soft)", color: "var(--red)",
                  padding: "14px", borderRadius: 9, fontSize: 13, marginTop: 14,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    ⚠️ Delete this user?
                  </div>
                  <div style={{ marginBottom: 10, lineHeight: 1.5, color: "var(--ink)" }}>
                    This permanently removes <strong>{deleteConfirm}</strong> and all their access. This cannot be undone.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => setDeleteConfirm(null)}
                      disabled={deleting}
                      style={{
                        all: "unset", cursor: "pointer", background: "var(--card)",
                        color: "var(--ink)", border: "1px solid var(--line)",
                        padding: "7px 14px", borderRadius: 9, fontWeight: 600, fontSize: 12,
                      }}>
                      Cancel
                    </button>
                    <button className="btn" onClick={() => handleDelete((modalUser as User).id)}
                      disabled={deleting}
                      style={{
                        all: "unset", cursor: "pointer", background: "var(--red)",
                        color: "#fff", padding: "7px 14px", borderRadius: 9, fontWeight: 600, fontSize: 12,
                      }}>
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{
              display: "flex", gap: 10, marginTop: 16, padding: "0 24px 22px",
              justifyContent: "space-between",
            }}>
              {/* Left: Delete button (edit mode only) */}
              {modalUser !== "new" && !deleteConfirm && (
                <button className="btn alt" onClick={() => setDeleteConfirm((modalUser as User).name)}
                  style={{
                    all: "unset", cursor: "pointer", background: "transparent",
                    color: "var(--red)", padding: "10px 16px", borderRadius: 11,
                    fontWeight: 600, fontSize: "13.5px", marginRight: "auto",
                  }}>
                  🗑 Delete user
                </button>
              )}
              {/* Spacer when no delete button */}
              {modalUser !== "new" && !deleteConfirm && <div style={{ flex: 1 }} />}

              {/* Right: Cancel + Save */}
              <button className="btn alt" onClick={() => setModalUser(null)} disabled={saving}
                style={{
                  all: "unset", cursor: "pointer", background: "var(--card)",
                  color: "var(--ink)", border: "1px solid var(--line)",
                  padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px",
                }}>
                Cancel
              </button>
              <button className="btn" onClick={handleSave} disabled={saving || !!deleteConfirm}
                style={{
                  all: "unset", cursor: "pointer",
                  background: saving || deleteConfirm ? "var(--line)" : "var(--ink)",
                  color: "#fff", padding: "10px 16px", borderRadius: 11,
                  fontWeight: 600, fontSize: "13.5px",
                }}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
