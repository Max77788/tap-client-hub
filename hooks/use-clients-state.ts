"use client";

import { useState, useEffect, useCallback } from "react";
import type { Client, ClientType, ServiceKey } from "@/lib/types";

type WorklistStage = "" | "ip" | "wc" | "pp" | "dn" | "na";

export function useClientsState(typeFilter: ClientType | "All" = "All") {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, business: 0, personal: 0 });

  useEffect(() => {
    let cancelled = false;
    async function fetchFromSupabase() {
      try {
        let url = "/api/clients";
        if (typeFilter !== "All") {
          url += `?type=${typeFilter.toLowerCase()}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (cancelled) return;

        if (data.clients) {
          setClients(data.clients);
        } else {
          setError("No clients returned from API");
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFromSupabase();
    return () => { cancelled = true; };
  }, [typeFilter]);

  const updateClient = useCallback((clientId: string, updates: Partial<Client>) => {
    setClients(prev =>
      prev.map(c => (c.id === clientId ? { ...c, ...updates } : c))
    );
  }, []);

  // Map WorklistStage → work_period stage for API
  const STAGE_TO_WP: Record<WorklistStage, string> = {
    "": "not_started", ip: "in_progress", wc: "waiting_client",
    pp: "prepared", dn: "done", na: "na",
  };

  // Map WorklistStage → MonthStatus for local months array
  const STAGE_TO_MONTH: Record<WorklistStage, string> = {
    "": "lock", ip: "in_progress", wc: "waiting",
    pp: "billed", dn: "done", na: "na",
  };

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

  return {
    clients, setClients, updateClient, updateServiceMonth,
    deleteClient, addClient, loading, error, stats,
  };
}
