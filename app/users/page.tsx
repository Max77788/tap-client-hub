"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Staff Accountant" | "Admin";
  location: string;
  status: "Active" | "Inactive";
}

// ── Mock user data ──
const MOCK_USERS: User[] = [
  {
    id: "u1",
    name: "Terry Anderson",
    email: "terry@tap-associates.com",
    role: "Owner",
    location: "Austin, TX",
    status: "Active",
  },
  {
    id: "u2",
    name: "Lindsay Brooks",
    email: "lindsay@tap-associates.com",
    role: "Manager",
    location: "Dallas, TX",
    status: "Active",
  },
  {
    id: "u3",
    name: "Misty Cole",
    email: "misty@tap-associates.com",
    role: "Staff Accountant",
    location: "San Antonio, TX",
    status: "Active",
  },
  {
    id: "u4",
    name: "Jill Dawson",
    email: "jill@tap-associates.com",
    role: "Staff Accountant",
    location: "Fort Worth, TX",
    status: "Active",
  },
  {
    id: "u5",
    name: "Aaron Edwards",
    email: "aaron@tap-associates.com",
    role: "Staff Accountant",
    location: "Houston, TX",
    status: "Active",
  },
  {
    id: "u6",
    name: "Paula Rivers",
    email: "paula@tap-associates.com",
    role: "Admin",
    location: "Austin, TX",
    status: "Active",
  },
  {
    id: "u7",
    name: "Debra Wilson",
    email: "debra@tap-associates.com",
    role: "Staff Accountant",
    location: "Plano, TX",
    status: "Inactive",
  },
];

// ── Role badge colors ──
const ROLE_STYLES: Record<string, { bg: string; fg: string }> = {
  Owner: { bg: "var(--amber-soft)", fg: "var(--amber)" },
  Manager: { bg: "var(--teal-soft)", fg: "var(--teal)" },
  "Staff Accountant": { bg: "var(--blue-soft)", fg: "var(--blue)" },
  Admin: { bg: "var(--green-soft)", fg: "var(--green)" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<User["role"]>("Staff Accountant");
  const [formLocation, setFormLocation] = useState("");

  function handleAddUser() {
    if (!formName || !formEmail || !formLocation) return;
    const newUser: User = {
      id: crypto.randomUUID(),
      name: formName,
      email: formEmail,
      role: formRole,
      location: formLocation,
      status: "Active",
    };
    setUsers((prev) => [...prev, newUser]);
    setModalOpen(false);
    setFormName("");
    setFormEmail("");
    setFormRole("Staff Accountant");
    setFormLocation("");
  }

  function toggleStatus(userId: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "Active" ? ("Inactive" as const) : ("Active" as const) }
          : u,
      ),
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold text-[var(--ink)] m-0"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            Users & Access
          </h1>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            Manage team accounts and access levels
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--teal)",
            color: "#ffffff",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add User
        </button>
      </div>

      {/* ── Users table ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          boxShadow: "var(--shadow)",
        }}
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-[var(--teal-soft)] transition-colors"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-semibold text-[var(--ink)]">
                        {user.name}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {user.email}
                      </p>
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
                  <td className="px-5 py-3 text-[var(--muted)]">
                    {user.location}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold`}
                      style={{
                        color:
                          user.status === "Active"
                            ? "var(--green)"
                            : "var(--muted)",
                      }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            user.status === "Active"
                              ? "var(--green)"
                              : "var(--line)",
                        }}
                      />
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: "var(--line)",
                        color: "var(--muted)",
                      }}
                    >
                      {user.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add User Modal ── */}
      {modalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 transition-opacity"
            style={{ backgroundColor: "rgba(26, 35, 64, 0.4)" }}
            onClick={() => setModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-xl p-6"
              style={{
                backgroundColor: "var(--card)",
                boxShadow: "0 4px 24px rgba(26, 35, 64, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-[var(--ink)] mb-5">
                Add New User
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="jane@tap-associates.com"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Role
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as User["role"])}
                    className="w-full text-sm rounded-lg px-3 py-2.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff Accountant">Staff Accountant</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Austin, TX"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  style={{
                    color: "var(--muted)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={!formName || !formEmail || !formLocation}
                  className="text-sm font-semibold px-5 py-2 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--teal)",
                    color: "#ffffff",
                  }}
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
