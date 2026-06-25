"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { VaultEntry } from "@/lib/types";
import VaultModal from "@/components/vault-modal";
import { useClientsState } from "@/hooks/use-clients-state";
import { PageSkeleton } from "@/components/loading-skeleton";

export default function VaultPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Clients from Supabase
  const { clients: supabaseClients } = useClientsState();

  // Fetch credentials from Supabase on mount
  const loadCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/credentials");
      if (!res.ok) throw new Error("Failed to load credentials");
      const data = await res.json();
      setVaultEntries(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load credentials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  // Group entries by client
  const groupedEntries = useMemo(() => {
    const map = new Map<string, VaultEntry[]>();
    for (const entry of vaultEntries) {
      const clientName = entry.clientId
        ? supabaseClients.find((c) => c.id === entry.clientId)?.name || entry.groupLabel || "Unassigned"
        : entry.groupLabel || "Unassigned";
      if (!map.has(clientName)) map.set(clientName, []);
      map.get(clientName)!.push(entry);
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const filtered = new Map<string, VaultEntry[]>();
    for (const [clientName, entries] of map) {
      const matches = entries.filter((e) =>
        e.site.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        clientName.toLowerCase().includes(q)
      );
      if (matches.length > 0) filtered.set(clientName, matches);
    }
    return Array.from(filtered.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [searchQuery, vaultEntries, supabaseClients]);

  const totalEntries = useMemo(
    () => groupedEntries.reduce((sum, [, entries]) => sum + entries.length, 0),
    [groupedEntries],
  );

  function toggleClient(clientName: string) {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientName)) next.delete(clientName);
      else next.add(clientName);
      return next;
    });
  }

  // ── CRUD handlers (Supabase API) ──
  function handleAdd() { setEditingEntry(null); setModalOpen(true); }
  function handleEdit(entry: VaultEntry) { setEditingEntry(entry); setModalOpen(true); }

  async function handleDelete(entry: VaultEntry) {
    const clientName = entry.clientId
      ? supabaseClients.find((c) => c.id === entry.clientId)?.name || "Unassigned"
      : "Unassigned";
    if (!confirm(`Delete credential for "${entry.site}" (${clientName})?\n\nThis cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/credentials?id=${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadCredentials();
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  }

  const handleSave = useCallback(async (entry: VaultEntry | Omit<VaultEntry, "id">) => {
    setSaving(true);
    try {
      const hasId = "id" in entry && entry.id;
      const method = hasId ? "PUT" : "POST";
      const res = await fetch("/api/credentials", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      setModalOpen(false);
      await loadCredentials();
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  }, [loadCredentials]);

  const clientOptions = useMemo(
    () => supabaseClients.map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [supabaseClients],
  );

  // ── Locked state ──
  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-10 rounded-xl max-w-sm w-full" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--teal-soft)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--ink)] mb-1" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Restricted Area</h2>
          <p className="text-sm text-[var(--muted)] mb-6">This section contains sensitive credentials. Access is logged and restricted to authorized personnel.</p>
          <button onClick={() => setUnlocked(true)} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--teal)", color: "#ffffff" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /><line x1="12" y1="15" x2="12" y2="18" />
            </svg>
            Unlock
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <PageSkeleton rows={6} />;

  if (error && vaultEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 rounded-xl text-center" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--red-soft)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 className="text-base font-semibold text-[var(--ink)] mb-1">Failed to load credentials</h3>
        <p className="text-sm text-[var(--muted)]">{error}</p>
        <button onClick={loadCredentials} className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--teal)" }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <button onClick={handleAdd} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: "var(--teal)", color: "#ffffff" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add Credential
        </button>
      </div>

      <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: "var(--teal-soft)", border: "1px solid var(--teal)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
        <div><p className="text-sm font-semibold text-[var(--teal)]">Bank Logins</p><p className="text-xs text-[var(--ink)]">TAP Bank entries link to the secure banking portal. Click &ldquo;Open in TAP Bank&rdquo; to access full account details including routing and account numbers.</p></div>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal)" }}>{totalEntries} entries across {groupedEntries.length} clients</span>
        <button onClick={() => setUnlocked(false)} className="text-xs font-medium transition-colors hover:underline" style={{ color: "var(--muted)" }}>Lock vault</button>
      </div>

      <div className="relative">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by client, site, or email..." className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] outline-none focus:border-[var(--teal)] placeholder:text-[var(--muted)]/60" />
        {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>}
      </div>

      <div className="space-y-2">
        {groupedEntries.map(([clientName, entries]) => {
          const isExpanded = expandedClients.has(clientName);
          return (
            <div key={clientName} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}>
              <button onClick={() => toggleClient(clientName)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[var(--teal-soft)]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}><polyline points="9 18 15 12 9 6" /></svg>
                  <span className="text-sm font-semibold text-[var(--ink)]">{clientName}</span>
                </div>
                <span className="text-xs text-[var(--muted)]">{entries.length} credential{entries.length !== 1 ? "s" : ""}</span>
              </button>
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="px-5 py-2 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]" style={{ borderBottom: "1px solid var(--line)" }}>
                    <span className="flex-[2]">Portal / Site</span>
                    <span className="flex-[1.5]">Email</span>
                    <span className="flex-[1.5]">Password</span>
                    <span className="flex-1">Links / Notes</span>
                    <span className="shrink-0 w-[60px]"></span>
                  </div>
                  {entries.map((entry) => (
                    <VaultEntryRow key={entry.id} entry={entry} onEdit={() => handleEdit(entry)} onDelete={() => handleDelete(entry)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {groupedEntries.length === 0 && (
          <div className="text-center py-10 text-sm text-[var(--muted)]">
            No credentials found{searchQuery ? " matching your search" : ""}.<br />
            <button onClick={handleAdd} className="mt-2 text-[var(--teal)] font-medium hover:underline">Add your first credential</button>
          </div>
        )}
      </div>

      {saving && <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--teal)" }}>Saving…</div>}

      <VaultModal open={modalOpen} vaultEntry={editingEntry} clients={clientOptions} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>
  );
}

// ── Vault Entry Row ──
function VaultEntryRow({ entry, onEdit, onDelete }: { entry: VaultEntry; onEdit: () => void; onDelete: () => void }) {
  const isBank = entry.isBank || entry.site === "TAP Bank";
  return (
    <div className="px-5 py-3 flex items-center gap-4" style={{ borderBottom: "1px solid var(--line)" }}>
      <div className="flex-[2] min-w-0"><p className="text-sm font-bold text-[var(--ink)] truncate">{entry.site}</p></div>
      <div className="flex-[1.5] min-w-0"><p className="text-xs font-medium text-[var(--ink)] truncate">{entry.email || "—"}</p></div>
      <div className="flex-[1.5] min-w-0"><p className="text-xs font-mono text-[var(--ink)] truncate">{entry.password || "—"}</p></div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isBank ? (
          <a href="#" onClick={(e) => { e.preventDefault(); alert("TAP Bank integration — coming soon."); }} className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded" style={{ backgroundColor: "var(--teal-soft)", color: "var(--teal)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>Bank ↗
          </a>
        ) : entry.url ? (
          <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold hover:underline" style={{ color: "var(--teal)" }}>Open ↗</a>
        ) : null}
        {entry.notes && <span className="text-[10px] text-[var(--muted)] truncate" title={entry.notes}>{entry.notes}</span>}
      </div>
      <div className="flex items-center gap-0.5 ml-1 pl-2 shrink-0" style={{ borderLeft: "1px solid var(--line)" }}>
        <button onClick={onEdit} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--teal-soft)]/70" style={{ color: "var(--teal)" }} title="Edit credential">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--red-soft)]/70" style={{ color: "var(--red)" }} title="Delete credential">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
  );
}
