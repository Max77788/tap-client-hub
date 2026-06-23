"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
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
        <div className="relative flex-[2] min-w-[280px]">
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
            className="w-full pl-[38px] pr-[14px] py-[11px] rounded-[11px] border border-[var(--line)] bg-[var(--card)] text-[14px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)] placeholder:text-[var(--muted)]"
          />
        </div>

        {/* Type filter tabs */}
        <div className="flex items-center rounded-[11px] border border-[var(--line)] bg-[var(--card)] p-[3px]">
          {(["All", "Business", "Personal"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-[13px] font-medium px-[13px] py-[7px] rounded-[8px] transition-colors ${
                typeFilter === t
                  ? "bg-[var(--teal)] text-white font-semibold"
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

        {/* Action buttons */}
        <button
          onClick={openAddModal}
          className="btn-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Client
        </button>

        <button
          onClick={handleExport}
          className="btn-secondary"
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
        <p className="text-[13px] text-[var(--muted)]">
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
      className="p-[13px_16px] rounded-[13px] flex flex-col justify-between border"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--line)",
        boxShadow: "0 1px 2px rgba(33,31,26,0.04)",
      }}
    >
      <p className="text-[12px] text-[var(--muted)] mb-1 leading-tight" style={{ fontFamily: '"Public Sans", sans-serif' }}>
        {label}
      </p>
      <p
        className="text-[26px] font-semibold m-0 leading-none"
        style={{ fontFamily: '"Fraunces", Georgia, serif', color: alert ? "var(--red)" : "var(--ink)" }}
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
  onClientClick,
}: {
  groupName: string;
  clients: Client[];
  onClientClick: (id: string) => void;
}) {
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
      {/* Top row: Group name + count badge */}
      <div className="flex items-start justify-between gap-2 mb-[3px]">
        <h3 className="text-[16.5px] font-semibold text-[var(--ink)] leading-tight"
          style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
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
          // Compute aggregate: use the worst status across clients with this service
          const stages = clients
            .flatMap((c) => c.services.filter((s) => s.enabled && s.key === key))
            .map((s) => (s as any).currentStage || "not_started");
          const worstPriority: Record<string, number> = { not_started: 0, in_progress: 1, done: 2, delayed: 3 };
          let worstStage = "not_started";
          let worstPri = 0;
          for (const st of stages) {
            const pri = worstPriority[st] ?? 0;
            if (pri > worstPri) { worstPri = pri; worstStage = st; }
          }
          const statusOpt = STATUS_OPTIONS.find((o) => o.value === worstStage) || STATUS_OPTIONS[0];
          return (
            <span
              key={key}
              className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: statusOpt.bg, color: statusOpt.color }}
              title={`${meta.label}: ${statusOpt.label} (${stages.length} clients)`}
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

      {/* Static entity list - always visible */}
      <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--line)" }}>
        {clients.map((c) => (
          <div
            key={c.id}
            onClick={(e) => { e.stopPropagation(); onClientClick(c.id); }}
            className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[var(--teal-soft)]/30 transition-colors"
          >
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold text-[var(--ink)]" style={{ wordBreak: "break-word" }}>{c.name}</p>
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
    </div>
  );
}

// ══════════════════════════════════════════════
// ── Client Card ──
// ══════════════════════════════════════════════

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started", color: "var(--muted)", bg: "#e8eaf0" },
  { value: "in_progress", label: "In Progress", color: "var(--blue)", bg: "var(--blue-soft)" },
  { value: "done", label: "Done", color: "var(--green)", bg: "var(--green-soft)" },
  { value: "delayed", label: "Delayed", color: "var(--red)", bg: "var(--red-soft)" },
] as const;

function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const enabledServices = client.services.filter((s) => s.enabled);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const svc of enabledServices) {
      map[svc.key || svc.id] = (svc as any).currentStage || "not_started";
    }
    return map;
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync external state changes
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const svc of enabledServices) {
      map[svc.key || svc.id] = (svc as any).currentStage || "not_started";
    }
    setServiceStatuses(map);
  }, [client.services]);

  // Close popover on outside click
  useEffect(() => {
    if (!openPopover) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPopover]);

  const handleStatusChange = async (svc: any, newStatus: string) => {
    const key = svc.key || svc.id;
    setServiceStatuses((prev) => ({ ...prev, [key]: newStatus }));
    setOpenPopover(null);

    if (!svc.csId) return; // No server ID yet
    const period = new Date().toISOString().slice(0, 7);
    await fetch("/api/work-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_service_id: svc.csId,
        period,
        stage: newStatus,
      }),
    });
  };

  const getStatusStyle = (key: string) => {
    const s = serviceStatuses[key] || "not_started";
    const opt = STATUS_OPTIONS.find((o) => o.value === s) || STATUS_OPTIONS[0];
    return { backgroundColor: opt.bg, color: opt.color };
  };

  return (
    <div
      onClick={onClick}
      className="group p-[15px_16px] cursor-pointer border"
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
      {/* Top row: Name + Type badge */}
      <div className="flex items-start justify-between gap-2 mb-[3px]">
        <h3 className="text-[16.5px] font-semibold text-[var(--ink)] leading-tight"
          style={{ fontFamily: '"Fraunces", Georgia, serif', wordBreak: "break-word" }}>
          {client.name}
        </h3>
        <span
          className="shrink-0 inline-flex text-[10.5px] font-bold px-[9px] py-[3px] rounded-[20px] uppercase tracking-[0.05em]"
          style={{
            backgroundColor: client.type === "Business" ? "var(--ink)" : "#dfe7e6",
            color: client.type === "Business" ? "#fff" : "var(--teal-ink)",
          }}
        >
          {client.type === "Business" ? "BIZ" : "PERS"}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 text-[12.5px] text-[var(--muted)] mb-[11px]">
        <span>{client.group}</span>
        <span aria-hidden>·</span>
        <span>{client.city}, {client.state}</span>
      </div>

      {/* Service pills */}
      <div className="flex flex-wrap gap-[5px] mb-3">
        {enabledServices.map((svc) => {
          const meta = svc.key ? SERVICE_META[svc.key] : null;
          if (!meta) return null;
          const key = svc.key || svc.id;
          const statusStyle = getStatusStyle(key);
          const isOpen = openPopover === key;

          return (
            <span key={key} style={{ position: "relative" }}>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPopover(isOpen ? null : key);
                }}
                className="inline-flex text-[10.5px] font-bold px-2 py-[3px] rounded-[20px] cursor-pointer transition-all"
                style={{
                  ...statusStyle,
                  letterSpacing: "0.02em",
                }}
                title={STATUS_OPTIONS.find((o) => o.value === (serviceStatuses[key] || "not_started"))?.label}
              >
                {meta.label}
              </span>

              {isOpen && (
                <div
                  ref={popoverRef}
                  className="absolute z-50 bottom-full left-0 mb-1 p-1 rounded-lg shadow-lg flex flex-col gap-0.5 min-w-[110px]"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--line)",
                    boxShadow: "0 4px 16px rgba(26,35,64,0.16)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleStatusChange(svc, opt.value)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded text-left hover:opacity-80 transition-opacity ${
                        serviceStatuses[key] === opt.value ? "ring-1 ring-inset" : ""
                      }`}
                      style={{
                        backgroundColor: opt.bg,
                        color: opt.color,
                      }}
                    >
                      {opt.label}
                      {serviceStatuses[key] === opt.value && " ✓"}
                    </button>
                  ))}
                </div>
              )}
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
