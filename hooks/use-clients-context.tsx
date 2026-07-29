"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { Client, ServiceKey } from "@/lib/types";

type WorklistStage = "" | "ip" | "wc" | "pp" | "dl" | "dn" | "na";

interface ClientsContextValue {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  loading: boolean;
  error: string | null;
  stats: { total: number; business: number; personal: number };
  refresh: (typeFilter?: string) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => void;
  updateServiceMonth: (clientId: string, serviceKey: ServiceKey, monthIdx: number, wStage: WorklistStage, csId?: string) => Promise<void>;
  deleteClient: (id: string) => void;
  addClient: (client: Client) => void;
}

const ClientsContext = createContext<ClientsContextValue | null>(null);

const STAGE_TO_WP: Record<WorklistStage, string> = {
  "": "not_started", ip: "in_progress", wc: "waiting_client",
  pp: "prepared", dl: "delayed", dn: "done", na: "na",
};

const STAGE_TO_MONTH: Record<WorklistStage, string> = {
  "": "lock", ip: "in_progress", wc: "waiting",
  pp: "billed", dl: "delayed", dn: "done", na: "na",
};

// ── In-flight request deduplication ──
let inflightPromise: Promise<void> | null = null;
let inflightType: string | null = null;

export function ClientsProvider({ children, enabled = true, lite = false }: { children: ReactNode; enabled?: boolean; lite?: boolean }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, business: 0, personal: 0 });
  const [typeFilter, setTypeFilter] = useState("All");
  const fetchedRef = useRef<boolean | null>(null);

  const fetchFromSupabase = useCallback(async (type?: string) => {
    const filter = type || "All";
    try {
      const params = new URLSearchParams();
      if (filter !== "All") params.set("type", filter.toLowerCase());
      if (lite) params.set("fields", "lite");
      const query = params.toString();
      const url = query ? `/api/clients?${query}` : "/api/clients";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      if (data.clients) {
        setClients(data.clients);
      }
      if (data.stats) {
        setStats(data.stats);
      }
      setError(null);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to load clients");
      }
    } finally {
      setLoading(false);
    }
  }, [lite]);

  // Deduplicate concurrent fetch requests
  const refresh = useCallback(async (type?: string) => {
    const targetType = type || typeFilter;
    if (inflightPromise && inflightType === targetType) {
      return inflightPromise;
    }
    setLoading(true);
    inflightType = targetType;
    inflightPromise = fetchFromSupabase(targetType).then(() => {
      inflightPromise = null;
      inflightType = null;
    });
    return inflightPromise;
  }, [fetchFromSupabase, typeFilter]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (fetchedRef.current !== lite) {
      fetchedRef.current = lite;
      setLoading(true);
      fetchFromSupabase(typeFilter);
    }
  }, [enabled, fetchFromSupabase, typeFilter]);

  const updateClient = useCallback((clientId: string, updates: Partial<Client>) => {
    setClients(prev =>
      prev.map(c => (c.id === clientId ? { ...c, ...updates } : c))
    );
  }, []);

  const updateServiceMonth = useCallback(
    async (clientId: string, serviceKey: ServiceKey, monthIdx: number, wStage: WorklistStage, csId?: string) => {
      const monthStatus = STAGE_TO_MONTH[wStage];

      // Optimistic local update
      setClients(prev =>
        prev.map(c => {
          if (c.id !== clientId) return c;
          return {
            ...c,
            services: c.services.map(s => {
              if (csId) {
                if (s.csId !== csId) return s;
              } else {
                if (s.key !== serviceKey) return s;
              }
              const months = [...s.months as any[]];
              months[monthIdx] = monthStatus;
              return { ...s, months };
            }),
          };
        })
      );

      // Persist to Supabase
      try {
        const client = clients.find(c => c.id === clientId);
        if (!client) return;
        const svc = csId
          ? client.services.find(s => s.csId === csId)
          : client.services.find(s => s.key === serviceKey);
        if (!svc?.csId) return;

        const now = new Date();
        const period = `${now.getFullYear()}-${String(monthIdx + 1).padStart(2, "0")}`;
        const stage = STAGE_TO_WP[wStage];

        await fetch("/api/work-periods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_service_id: svc.csId, period, stage }),
        });
      } catch (e) {
        console.error("Failed to persist stage change:", e);
      }
    },
    [clients]
  );

  const deleteClient = useCallback((clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, []);

  const addClient = useCallback((client: Client) => {
    setClients(prev => [...prev, client]);
  }, []);

  return (
    <ClientsContext.Provider value={{
      clients, setClients, loading, error, stats,
      refresh, updateClient, updateServiceMonth,
      deleteClient, addClient,
    }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used within a ClientsProvider");
  return ctx;
}
