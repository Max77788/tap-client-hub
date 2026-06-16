"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  location: string;
  status: "Active" | "Inactive";
}

const ROLE_STYLES: Record<string, { bg: string; fg: string }> = {
  admin: { bg: "var(--amber-soft)", fg: "var(--amber)" },
  manager: { bg: "var(--teal-soft)", fg: "var(--teal)" },
  staff: { bg: "var(--blue-soft)", fg: "var(--blue)" },
  offshore: { bg: "var(--green-soft)", fg: "var(--green)" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadUsers() {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, location, active")
        .order("full_name");

      if (!error && profiles) {
        setUsers(
          profiles.map((p) => ({
            id: p.id,
            name: p.full_name,
            email: "", // email lives in auth.users — not exposed via profiles RLS
            role: p.role,
            location: p.location || "",
            status: p.active ? "Active" : "Inactive",
          }))
        );
      }
      setLoading(false);
    }
    loadUsers();
  }, [supabase]);

  async function toggleStatus(userId: string, currentStatus: string) {
    const newActive = currentStatus !== "Active";
    const { error } = await supabase
      .from("profiles")
      .update({ active: newActive })
      .eq("id", userId);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: newActive ? "Active" : "Inactive" }
            : u
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold text-[var(--ink)] m-0"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            Users & Access
          </h1>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            Team accounts managed via Supabase Auth
          </p>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Location
                </th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[var(--muted)]">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[var(--muted)]">
                    No users found. Create auth users in Supabase dashboard.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[var(--teal-soft)] transition-colors"
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{user.name}</p>
                        {user.email && (
                          <p className="text-xs text-[var(--muted)]">{user.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: ROLE_STYLES[user.role]?.bg || "var(--teal-soft)",
                          color: ROLE_STYLES[user.role]?.fg || "var(--teal)",
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--muted)]">{user.location}</td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                        style={{
                          color: user.status === "Active" ? "var(--green)" : "var(--muted)",
                        }}
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              user.status === "Active" ? "var(--green)" : "var(--line)",
                          }}
                        />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => toggleStatus(user.id, user.status)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                        style={{ borderColor: "var(--line)", color: "var(--muted)" }}
                      >
                        {user.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
