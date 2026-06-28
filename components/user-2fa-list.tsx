"use client";

import { useState, useEffect } from "react";

interface User2faInfo {
  id: string;
  full_name: string;
  email_2fa_enabled: boolean;
}

export default function User2faList() {
  const [users, setUsers] = useState<User2faInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/2fa/admin-toggle");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setUsers(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently fail — no admin rights
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function toggle(userId: string, currentState: boolean) {
    setTogglingId(userId);
    try {
      const res = await fetch("/api/2fa/admin-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: userId, enabled: !currentState }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, email_2fa_enabled: !currentState } : u
        ));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to toggle 2FA");
      }
    } catch {
      alert("Network error");
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return <div style={{ color: "var(--muted)", fontSize: 13, padding: 8 }}>Loading 2FA statuses...</div>;
  }

  if (users.length === 0) {
    return <div style={{ color: "var(--muted)", fontSize: 13, padding: 8 }}>No users found or not authorized.</div>;
  }

  return (
    <table>
      <thead>
        <tr><th>User</th><th>2FA Status</th><th></th></tr>
      </thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <td style={{ fontWeight: 600 }}>{u.full_name}</td>
            <td>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                background: u.email_2fa_enabled ? "var(--green-soft)" : "var(--line)",
                color: u.email_2fa_enabled ? "var(--green)" : "var(--muted)",
              }}>
                {u.email_2fa_enabled ? "✅ On" : "○ Off"}
              </span>
            </td>
            <td>
              <button
                disabled={togglingId === u.id}
                onClick={() => toggle(u.id, u.email_2fa_enabled)}
                style={{
                  all: "unset", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  color: "var(--teal)", whiteSpace: "nowrap",
                }}
              >
                {togglingId === u.id ? "..." : u.email_2fa_enabled ? "Disable" : "Enable"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
