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

export default function ClientsPage() {
  // ── State from Supabase API (with localStorage cache fallback) ──
  const { clients, setClients, updateClient, deleteClient: deleteFromState, addClient, loading } = useClientsState();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientType | "All">("All");
  const [staffFilter, setStaffFilter] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // ── Derived data ──
  const groups = useMemo(() => getGroups(clients), [clients]);
  const staffOptions = useMemo(() => getStaffOptions(clients), [clients]);
  const stats = useMemo(() => getStats(clients), [clients]);

  const filteredClients = useMemo(
    () => filterClients(clients, { search, type: typeFilter, staff: staffFilter }),
    [clients, search, typeFilter, staffFilter],
  );

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
    setEditingClient(null);
    setModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
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
    // Cascade: remove timesheet entries for this client
    try {
      const tsEntries = JSON.parse(localStorage.getItem("tap-timesheet-entries") || "[]");
      const filtered = tsEntries.filter((e: any) => e.clientId !== clientId);
      localStorage.setItem("tap-timesheet-entries", JSON.stringify(filtered));
    } catch {}
    // Cascade: remove vault entries for this client
    try {
      deleteVaultEntriesByClient(clientId);
    } catch {}
  }, [deleteFromState]);

  const handleModalSave = useCallback((data: Client | Omit<Client, "id" | "cid">) => {
    if ("id" in data && data.id) {
      // Edit existing
      updateClient(data.id, data as Client);
    } else {
      // Add new
      const newClient: Client = {
        ...data,
        id: "c" + Date.now(),
        cid: "CID-" + Math.floor(1000 + Math.random() * 9000),
        status: "active",
      } as Client;
      addClient(newClient);
    }
  }, [updateClient, addClient]);

  function handleExport() {
    console.log("Export to Excel — stub");
  }

  return (
    <div className="space-y-6">
      {/* ── Loading overlay ── */}
      {loading && (
        <div className="text-xs text-[var(--muted)] animate-pulse">Loading clients from database…</div>
      )}

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
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => openSlideover(client.id)}
            />
          ))}
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

      {/* ── Add/Edit modal ── */}
      <ClientModal
        open={modalOpen}
        client={editingClient}
        onClose={() => setModalOpen(false)}
        onSave={handleModalSave}
      />
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
