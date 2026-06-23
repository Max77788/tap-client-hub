"use client";

import { useMemo, useState, useCallback } from "react";
import type { Client, ClientType, ServiceKey } from "@/lib/types";
import {
  SERVICE_META,
  filterClients,
  getStats,
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
  // ── State from Supabase API ──
  const { clients, setClients, updateClient, deleteClient: deleteFromState, addClient, loading } = useClientsState();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientType | "All">("All");
  const [staffFilter, setStaffFilter] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── Derived data ──
  const groups = useMemo(() => getGroups(clients), [clients]);
  const staffOptions = useMemo(() => getStaffOptions(clients), [clients]);
  const stats = useMemo(() => getStats(clients), [clients]);

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
      if (g) {
        if (!grouped.has(g)) grouped.set(g, []);
        grouped.get(g)!.push(c);
      } else {
        singles.push(c);
      }
    }
    const items: DisplayItem[] = [];
    for (const [name, members] of grouped) {
      if (members.length >= 2) {
        items.push({ kind: "group", name, clients: members });
      } else {
        // Solo group member - show as single card
        singles.push(...members);
      }
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

  const handleSlideoverSave = useCallback((updated: Client) => {
    updateClient(updated.id, updated);
    setSelectedClientId(null); // force re-select to refresh slideover
    setTimeout(() => setSelectedClientId(updated.id), 0);
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

  function handleExport() {
    console.log("Export to Excel — stub");
  }

  return (
    <div className="space-y-6">
      {/* ── Loading state ── */}
      {loading ? (
        <PageSkeleton rows={6} />
      ) : (
        <>
          {/* ── Stat cards row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Clients" value={stats.total} />
        <StatCard label="Business" value={stats.business} color="var(--teal)" softColor="var(--teal-soft)" />
        <StatCard label="Personal" value={stats.personal} color="var(--blue)" softColor="var(--blue-soft)" />
        <StatCard label="Financials" value={stats.monthlyFinancials} color="var(--green)" softColor="var(--green-soft)" />
        <StatCard label="Behind This Month" value={stats.behindThisMonth} color="var(--red)" softColor="var(--red-soft)" alert={stats.behindThisMonth > 0} />
      </div>

      {/* ── Toolbar: Search + Filters + Actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[320px]">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-12 pr-5 py-4 rounded-lg border-[3px] border-[var(--line)] bg-[var(--card)] text-lg font-bold text-[var(--ink)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]/60"
          />
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--card)] p-0.5">
          {(["All", "Business", "Personal"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                typeFilter === t
                  ? "bg-[var(--teal)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Staff filter dropdown */}
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none"
        >
          <option value="">All Staff</option>
          {staffOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-[var(--teal)] text-white hover:opacity-90 transition-opacity"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Client
        </button>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--teal-soft)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* ── Results summary ── */}
      {filteredClients.length < clients.length && (
        <p className="text-xs text-[var(--muted)]">
          Showing {filteredClients.length} of {clients.length} clients
          {search ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* ── Client cards grid ── */}
      {displayItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayItems.map((item) =>
            item.kind === "group" ? (
              <GroupCard
                key={item.name}
                groupName={item.name}
                clients={item.clients}
                expanded={expandedGroups.has(item.name)}
                onToggle={() => {
                  setExpandedGroups((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.name)) next.delete(item.name);
                    else next.add(item.name);
                    return next;
                  });
                }}
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
// ══════════════════════════════════════════════
function StatCard({
  label,
  value,
  color,
  softColor,
  alert,
}: {
  label: string;
  value: number;
  color?: string;
  softColor?: string;
  alert?: boolean;
}) {
  return (
    <div
      className="relative p-4 rounded-xl flex flex-col justify-between overflow-hidden transition-transform hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow)",
      }}
    >
      {/* Accent bar */}
      {color && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
          style={{ backgroundColor: alert ? "var(--red)" : color }}
        />
      )}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1 leading-tight">
        {label}
      </p>
      <p
        className="text-2xl font-semibold m-0 leading-tight"
        style={{ color: alert ? "var(--red)" : "var(--ink)" }}
      >
        {value}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Group Card ──
// ══════════════════════════════════════════════
function GroupCard({
  groupName,
  clients,
  expanded,
  onToggle,
  onClientClick,
}: {
  groupName: string;
  clients: Client[];
  expanded: boolean;
  onToggle: () => void;
  onClientClick: (id: string) => void;
}) {
  // Collect unique locations and services across all group members
  const locations = [...new Set(clients.map((c) => `${c.city}, ${c.state}`).filter(Boolean))];
  const allServices = new Set<string>();
  clients.forEach((c) => c.services.filter((s) => s.enabled && s.key).forEach((s) => allServices.add(s.key!)));

  return (
    <div
      onClick={onToggle}
      className="group rounded-xl cursor-pointer transition-[transform,box-shadow] duration-200 hover:-translate-y-1 p-4"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 2px 8px rgba(26, 35, 64, 0.08), 0 12px 32px rgba(26, 35, 64, 0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow)";
      }}
    >
      {/* Top row: Group name + count badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[var(--ink)] leading-snug group-hover:text-[var(--teal)] transition-colors">
          {groupName}
        </h3>
        <span
          className="shrink-0 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: "var(--teal-soft)",
            color: "var(--teal)",
          }}
        >
          {clients.length} entities
        </span>
      </div>

      {/* Locations */}
      <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mb-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{locations.slice(0, 3).join(" · ")}{locations.length > 3 ? ` +${locations.length - 3} more` : ""}</span>
      </div>

      {/* Service pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[...allServices].slice(0, 5).map((key) => {
          const meta = SERVICE_META[key as ServiceKey];
          if (!meta) return null;
          return (
            <span
              key={key}
              className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: meta.pillBg, color: meta.pillColor }}
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

      {/* Expand chevron */}
      <div
        className="flex items-center justify-between pt-2"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <span className="text-[10px] text-[var(--muted)]">
          {expanded ? "Hide entities" : "Show entities"}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Expanded sub-entity list */}
      {expanded && (
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--line)" }}>
          {clients.map((c) => (
            <div
              key={c.id}
              onClick={(e) => { e.stopPropagation(); onClientClick(c.id); }}
              className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[var(--teal-soft)]/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--ink)] truncate">{c.name}</p>
                <p className="text-[10px] text-[var(--muted)]">{c.city}, {c.state}</p>
              </div>
              <span
                className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: c.type === "Business" ? "var(--teal-soft)" : "var(--blue-soft)",
                  color: c.type === "Business" ? "var(--teal)" : "var(--blue)",
                }}
              >
                {c.type === "Business" ? "BIZ" : "PERS"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Client Card ──
// ══════════════════════════════════════════════
function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const enabledServices = client.services.filter((s) => s.enabled);

  return (
    <div
      onClick={onClick}
      className="group p-4 rounded-xl cursor-pointer transition-[transform,box-shadow] duration-200 hover:-translate-y-1"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 2px 8px rgba(26, 35, 64, 0.08), 0 12px 32px rgba(26, 35, 64, 0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow)";
      }}
    >
      {/* Top row: Name + Type badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[var(--ink)] leading-snug line-clamp-1 group-hover:text-[var(--teal)] transition-colors">
          {client.name}
        </h3>
        <span
          className="shrink-0 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase"
          style={{
            backgroundColor: client.type === "Business" ? "var(--teal-soft)" : "var(--blue-soft)",
            color: client.type === "Business" ? "var(--teal)" : "var(--blue)",
          }}
        >
          {client.type === "Business" ? "BIZ" : "PERS"}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] mb-2">
        <span>{client.group}</span>
        <span aria-hidden>·</span>
        <span>{client.city}, {client.state}</span>
      </div>

      {/* Service pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {enabledServices.map((svc) => {
          const meta = svc.key ? SERVICE_META[svc.key] : null;
          if (!meta) return null;
          return (
            <span
              key={svc.key || svc.id}
              className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: meta.pillBg, color: meta.pillColor }}
            >
              {meta.label}
            </span>
          );
        })}
        {enabledServices.length === 0 && (
          <span className="text-[10px] text-[var(--muted)] italic">No services</span>
        )}
      </div>

      {/* Bottom row: arrow indicator */}
      <div
        className="flex items-center justify-end pt-2"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
          className="group-hover:translate-x-0.5 transition-transform"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}
