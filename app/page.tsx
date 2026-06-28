"use client";

import { useMemo, useState, useCallback } from "react";
import type { Client, ClientType, ServiceKey } from "@/lib/types";
import {
  SERVICE_META,
  filterClients,
  getGroups,
  getStaffOptions,
  deleteVaultEntriesByClient,
} from "@/lib/data";
import { useClientsState } from "@/hooks/use-clients-state";
import ClientSlideover from "@/components/client-slideover";
import ClientModal from "@/components/client-modal";
import { PageSkeleton } from "@/components/loading-skeleton";

type DisplayItem =
  | { kind: "group"; name: string; clients: Client[] }
  | { kind: "single"; client: Client };

export default function ClientsPage() {
  // ── State from Supabase API (backend filters by type) ──
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientType | "All">("All");
  const [staffFilter, setStaffFilter] = useState<string>("");
  const { clients, setClients, updateClient, deleteClient: deleteFromState, addClient, loading, stats } = useClientsState(typeFilter);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Compute type-specific stats and service metrics from loaded clients
  const clientStats = useMemo(() => {
    const mf = clients.filter(c => c.services.some(s => s.key === "financials" && s.enabled)).length;
    const behind = clients.filter(c =>
      c.services.some(s => {
        if (!s.enabled || !s.months) return false;
        const now = new Date().getMonth();
        return s.months[now] && s.months[now] !== "done" && s.months[now] !== "lock" && s.months[now] !== "na";
      })
    ).length;
    const finCount = clients.filter(c => c.services.some(s => s.key === "financials" && s.enabled)).length;
    const prCount = clients.filter(c => c.services.some(s => s.key === "payroll" && s.enabled)).length;
    const stxCount = clients.filter(c => c.services.some(s => s.key === "sales_tax" && s.enabled)).length;
    const t9Count = clients.filter(c => c.services.some(s => s.key === "1099s" && s.enabled)).length;
    const rendCount = clients.filter(c => c.services.some(s => s.key === "renditions" && s.enabled)).length;
    const taxCount = clients.filter(c => c.services.some(s => s.key === "tax_returns" && s.enabled)).length;
    return { ...stats, monthlyFinancials: mf, behindThisMonth: behind, finCount, prCount, stxCount, t9Count, rendCount, taxCount };
  }, [clients, stats]);
  const groups = useMemo(() => getGroups(clients), [clients]);
  const staffOptions = useMemo(() => getStaffOptions(clients), [clients]);

  const filteredClients = useMemo(
    () => filterClients(clients, { search, type: typeFilter, staff: staffFilter }),
    [clients, search, typeFilter, staffFilter],
  );

  // Group filtered clients: multi-client groups become one group card, singles stay as-is
  const displayItems = useMemo((): DisplayItem[] => {
    const grouped = new Map<string, Client[]>();
    const singles: Client[] = [];
    for (const c of filteredClients) {
      const g = (c.group || "").trim();
      // Treat "Unassigned" (case-insensitive) as no group — always show as individual card
      if (g && g.toLowerCase() !== "unassigned") {
        if (!grouped.has(g)) grouped.set(g, []);
        grouped.get(g)!.push(c);
      } else {
        singles.push(c);
      }
    }
    const items: DisplayItem[] = [];
    for (const [name, members] of grouped) {
      items.push({ kind: "group", name, clients: members });
    }
    // Single clients sorted by name, then group cards
    singles.sort((a, b) => a.name.localeCompare(b.name));
    for (const c of singles) items.push({ kind: "single", client: c });
    // Group cards sorted by name
    const groupItems = items.filter((i): i is { kind: "group"; name: string; clients: Client[] } => i.kind === "group");
    const singleItems = items.filter((i): i is { kind: "single"; client: Client } => i.kind === "single");
    groupItems.sort((a, b) => a.name.localeCompare(b.name));
    return [...groupItems, ...singleItems];
  }, [filteredClients]);

  const selectedClient = useMemo(
    () => (selectedClientId ? clients.find(c => c.id === selectedClientId) ?? null : null),
    [clients, selectedClientId],
  );

  // ── Handlers ──
  function openSlideover(id: string) {
    setSelectedClientId(id);
    setSlideoverOpen(true);
  }

  function closeSlideover() {
    setSlideoverOpen(false);
    setSelectedClientId(null);
  }

  function openAddModal() {
    setModalOpen(true);
  }

  const handleSlideoverSave = useCallback(async (updated: Client) => {
    // Optimistic local update
    updateClient(updated.id, updated);
    // Persist to API
    try {
      const res = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("PUT /api/clients failed:", res.status, errData);
      }
    } catch (e) {
      console.error("Failed to save client:", e);
    }
  }, [updateClient]);

  const handleSlideoverDelete = useCallback((clientId: string) => {
    deleteFromState(clientId);
    setSelectedClientId(null);
    // Cascade: timesheet entries removed via DB CASCADE on client delete
    // Cascade: remove vault entries for this client
    try {
      deleteVaultEntriesByClient(clientId);
    } catch {}
  }, [deleteFromState]);

  const handleModalSave = useCallback((data: Omit<Client, "id" | "cid">) => {
    const newClient: Client = {
      ...data,
      id: "c" + Date.now(),
      cid: "CID-" + Math.floor(1000 + Math.random() * 9000),
      status: "active",
    } as Client;
    addClient(newClient);
  }, [addClient]);



  return (
    <div className="space-y-6">
      {/* ── Loading state ── */}
      {loading ? (
        <PageSkeleton rows={6} />
      ) : (
        <>
          {/* ── Stat cards row ── */}
      <div className="stats" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <StatCard label="Total clients" value={clientStats.total} color="var(--ink)" />
        <StatCard label="Business" value={clientStats.business} color="var(--teal)" />
        <StatCard label="Personal" value={clientStats.personal} color="var(--blue)" />
        <StatCard label="Financials" value={clientStats.monthlyFinancials} color="var(--green)" />
        <StatCard label="Behind this month" value={clientStats.behindThisMonth} color="var(--amber)" />
      </div>

      {/* ── Service metrics stat cards ── */}
      <div className="stats" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <StatCard label="Financials" value={clientStats.finCount} color="var(--green)" />
        <StatCard label="Payroll" value={clientStats.prCount} color="var(--blue)" />
        <StatCard label="Sales Tax" value={clientStats.stxCount} color="var(--amber)" />
        <StatCard label="1099s" value={clientStats.t9Count} color="#7a5436" />
        <StatCard label="Renditions" value={clientStats.rendCount} color="#3a5a44" />
        <StatCard label="Tax Returns" value={clientStats.taxCount} color="#5a4a80" />
      </div>

      {/* ── Controls: Search + Filters + Actions ── */}
      <div className="controls" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "16px 0 4px" }}>
        {/* Search with magnifying glass */}
        <div className="search" style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <span className="mag" style={{ position: "absolute", left: 13, top: 11, opacity: 0.45 }}>🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client or group…"
            style={{
              width: "100%", padding: "11px 14px 11px 38px",
              border: "1px solid var(--line)", borderRadius: 11,
              background: "var(--card)", font: "inherit", fontSize: 14,
            }}
          />
        </div>

        {/* Type filter tabs */}
        <div className="seg" style={{ display: "flex", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 11, padding: 3 }}>
          {(["All", "Business", "Personal"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                all: "unset", cursor: "pointer", padding: "7px 13px", borderRadius: 8,
                fontSize: 13, fontWeight: typeFilter === t ? 600 : 500,
                background: typeFilter === t ? "var(--teal)" : "transparent",
                color: typeFilter === t ? "#fff" : "var(--muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Staff filter dropdown */}
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="pick"
          style={{
            padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 11,
            background: "var(--card)", font: "inherit", fontSize: "13.5px", color: "var(--ink)",
          }}
        >
          <option value="">All staff</option>
          {staffOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Action buttons */}
        <button onClick={openAddModal} className="btn" style={{
          all: "unset", cursor: "pointer", background: "var(--ink)", color: "#fff",
          padding: "10px 16px", borderRadius: 11, fontWeight: 600, fontSize: "13.5px",
          display: "inline-flex", gap: 7, alignItems: "center",
        }}>
          ＋ Add client
        </button>
      </div>

      {/* ── Count line ── */}
      <div className="count" style={{ color: "var(--muted)", fontSize: 13, margin: "12px 2px 6px" }}>
        {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} shown
      </div>

      {/* ── Client cards grid ── */}
      {displayItems.length > 0 ? (
        <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 }}>
          {displayItems.map((item) =>
            item.kind === "group" ? (
              <GroupCard
                key={item.name}
                groupName={item.name}
                clients={item.clients}
                onClientClick={(id) => openSlideover(id)}
              />
            ) : (
              <ClientCard
                key={item.client.id}
                client={item.client}
                onClick={() => openSlideover(item.client.id)}
              />
            )
          )}
        </div>
      ) : (
        /* ── Empty state ── */
        <div
          className="flex flex-col items-center justify-center py-20 px-6 rounded-xl text-center"
          style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--teal-soft)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[var(--ink)] mb-1">No clients found</h3>
          <p className="text-sm text-[var(--muted)] max-w-xs">
            {search
              ? `No results for "${search}". Try a different search term.`
              : "No clients match the current filters. Try adjusting your filters."}
          </p>
          {(search || typeFilter !== "All" || staffFilter) && (
            <button
              onClick={() => { setSearch(""); setTypeFilter("All"); setStaffFilter(""); }}
              className="mt-4 text-sm font-medium text-[var(--teal)] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Slide-over detail panel ── */}
      {selectedClient && (
        <ClientSlideover
          client={selectedClient}
          open={slideoverOpen}
          onClose={closeSlideover}
          onSave={handleSlideoverSave}
          onDelete={handleSlideoverDelete}
        />
      )}

      {/* ── Add Client modal ── */}
      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
      />
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Stat Card ──
// ── Stat Card (demo v7 exact) ──
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      className="statcard"
      style={{
        flex: 1, minWidth: 120,
        backgroundColor: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 13,
        padding: "13px 16px",
        boxShadow: "0 1px 2px rgba(33,31,26,0.04)",
      }}
    >
      <div className="sn" style={{
        fontFamily: '"Fraunces",Georgia,serif',
        fontWeight: 600, fontSize: 26, lineHeight: 1,
        color: color || "var(--ink)",
      }}>
        {value}
      </div>
      <div className="sl" style={{
        fontSize: 12, color: "var(--muted)", marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Group Card ──
// ══════════════════════════════════════════════
function GroupCard({
  groupName,
  clients,
  onClientClick,
}: {
  groupName: string;
  clients: Client[];
  onClientClick: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Collect unique locations and services across all group members
  const locations = [...new Set(clients.map((c) => `${c.city}, ${c.state}`).filter(Boolean))];
  const allServices = new Set<string>();
  clients.forEach((c) => c.services.filter((s) => s.enabled && s.key).forEach((s) => allServices.add(s.key!)));

  return (
    <div
      className="group p-[15px_16px] border"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--line)",
        borderRadius: "14px",
        boxShadow: "0 1px 2px rgba(33,31,26,0.04)",
        transition: "transform 0.14s, box-shadow 0.14s, border-color 0.14s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow)";
        e.currentTarget.style.borderColor = "#cfc7b5";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(33,31,26,0.04)";
        e.currentTarget.style.borderColor = "var(--line)";
      }}
    >
      {/* Top row: Group name + count badge + expand/collapse button */}
      <div className="flex items-start justify-between gap-2 mb-[3px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 p-0.5 rounded hover:bg-[var(--teal-soft)]/50 transition-colors"
            title={expanded ? "Collapse group" : "Expand group"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="2.5"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <h3 className="text-[16.5px] font-semibold text-[var(--ink)] leading-tight truncate"
            style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
            {groupName}
          </h3>
        </div>
        <span
          className="shrink-0 inline-flex text-[10.5px] font-bold px-[9px] py-[3px] rounded-[20px]"
          style={{
            backgroundColor: "var(--teal-soft)",
            color: "var(--teal)",
            letterSpacing: "0.02em",
          }}
        >
          {clients.length} entities
        </span>
      </div>

      {/* Locations */}
      <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mb-2 ml-[22px]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{locations.slice(0, 3).join(" · ")}{locations.length > 3 ? ` +${locations.length - 3} more` : ""}</span>
      </div>

      {/* Service pills */}
      <div className="flex flex-wrap gap-1.5 mb-3 ml-[22px]">
        {[...allServices].slice(0, 5).map((key) => {
          const meta = SERVICE_META[key as ServiceKey];
          if (!meta) return null;
          return (
            <span
              key={key}
              className="inline-flex text-[10.5px] font-bold px-2 py-[3px] rounded-[20px]"
              style={{ backgroundColor: meta.pillBg, color: meta.pillColor, letterSpacing: "0.02em" }}
              title={meta.label}
            >
              {meta.label}
            </span>
          );
        })}
        {allServices.size > 5 && (
          <span className="text-[10px] text-[var(--muted)]">+{allServices.size - 5} more</span>
        )}
        {allServices.size === 0 && (
          <span className="text-[10px] text-[var(--muted)] italic">No services</span>
        )}
      </div>

      {/* Expand button hint */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-[10px] text-[var(--muted)] hover:text-[var(--teal)] transition-colors text-left ml-[22px]"
      >
        {expanded ? "▲ Hide entities" : `▼ View ${clients.length} entities`}
      </button>

      {/* ── Inline expanded member list ── */}
      {expanded && (
        <div
          className="mt-3 pt-3 ml-0 border-t border-[var(--line)]"
          style={{ animation: "fadeIn 0.15s ease-out" }}
        >
          <div className="space-y-2">
            {clients.map((c) => (
              <div
                key={c.id}
                onClick={() => onClientClick(c.id)}
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-[var(--teal-soft)]/30 transition-colors border border-[var(--line)]"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-semibold text-[var(--ink)]">{c.name}</p>
                  <p className="text-[11px] text-[var(--muted)]">{c.city}, {c.state}</p>
                </div>
                <span
                  className="shrink-0 inline-flex text-[10.5px] font-bold px-[9px] py-[3px] rounded-[20px] uppercase tracking-[0.05em]"
                  style={{
                    backgroundColor: c.type === "Business" ? "var(--ink)" : "#dfe7e6",
                    color: c.type === "Business" ? "#fff" : "var(--teal-ink)",
                  }}
                >
                  {c.type === "Business" ? "BIZ" : "PERS"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Client Card (demo v7 exact) ──
// ══════════════════════════════════════════════

function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const enabledServices = client.services.filter((s) => s.enabled && s.key);

  // Get unique assignees across all enabled services
  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const svc of enabledServices) {
      const who = svc.processor || svc.assignedTo || "-";
      if (who && who !== "-") set.add(who);
    }
    return [...set];
  }, [client]);

  return (
    <div
      onClick={onClick}
      className="ccard group cursor-pointer"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: "15px 16px",
        boxShadow: "0 1px 2px rgba(33,31,26,0.04)",
        transition: ".14s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow)";
        e.currentTarget.style.borderColor = "#cfc7b5";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(33,31,26,0.04)";
        e.currentTarget.style.borderColor = "var(--line)";
      }}
    >
      {/* Name + Type badge */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div className="nm" style={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 600, fontSize: "16.5px", lineHeight: 1.2 }}>
          {client.name}
        </div>
        <span
          className="badge"
          style={{
            fontSize: "10.5px", fontWeight: 700, padding: "3px 9px", borderRadius: 20,
            textTransform: "uppercase", letterSpacing: "0.05em",
            backgroundColor: client.type === "Business" ? "var(--ink)" : "#dfe7e6",
            color: client.type === "Business" ? "#fff" : "var(--teal-ink)",
          }}
        >
          {client.type === "Business" ? "BIZ" : "PERS"}
        </span>
      </div>

      {/* Meta row: CID · group · city, state */}
      <div className="meta" style={{ color: "var(--muted)", fontSize: "12.5px", marginTop: 3 }}>
        <span className="mono" style={{ color: "#9a9484" }}>{client.cid || `TP|BS|${String(client.id).padStart(4,"0")}`}</span>
        {" · "}{client.group || "—"}{" · "}{client.city}, {client.state}
      </div>

      {/* Service pills */}
      <div className="pills" style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
        {enabledServices.map((svc) => {
          const key = svc.key!;
          const meta = SERVICE_META[key as ServiceKey];
          if (!meta) return null;
          const pillClass = key === "financials" ? "p-fin" : key === "payroll" ? "p-pr" : key === "sales_tax" ? "p-stx" : key === "tax_returns" ? "p-tax" : key === "1099s" ? "p-9" : key === "renditions" ? "p-rn" : "";
          const labels: Record<string, string> = { financials: "FINANCIALS", payroll: "PAYROLL", sales_tax: "SALES TAX", tax_returns: "TAX RTN", "1099s": "1099", renditions: "RENDITION" };
          return (
            <span key={key} className={`pill ${pillClass}`} style={{
              fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.02em", padding: "3px 8px", borderRadius: 20,
              backgroundColor: meta.pillBg, color: meta.pillColor,
            }}>
              {labels[key] || meta.label}
            </span>
          );
        })}
        {enabledServices.length === 0 && (
          <span className="pill" style={{ fontSize: "10.5px", fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "#eee", color: "#888" }}>
            No services
          </span>
        )}
      </div>

      {/* Handled by */}
      <div className="row2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
        <span className="assignee" style={{ fontSize: 12, color: "var(--muted)" }}>
          Handled by <b style={{ color: "var(--ink)", fontWeight: 600 }}>{assignees.length ? assignees.join(", ") : "—"}</b>
        </span>
      </div>
    </div>
  );
}
