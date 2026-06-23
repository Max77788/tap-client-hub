"use client";

import { useState, useEffect, useCallback } from "react";
import type { Client, ServiceKey, MonthStatus } from "@/lib/types";

export function useClientsState() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch from Supabase API on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchFromSupabase() {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (!cancelled && data.clients?.length > 0) {
          setClients(data.clients);
        } else if (!cancelled) {
          setError("No clients returned from API");
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load clients");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFromSupabase();
    return () => { cancelled = true; };
  }, []);

  // Update a specific client
  const updateClient = useCallback((clientId: string, updates: Partial<Client>) => {
    setClients(prev =>
      prev.map(c => (c.id === clientId ? { ...c, ...updates } : c))
    );
  }, []);

  // Update a specific service month status for a client
  const updateServiceMonth = useCallback(
    (clientId: string, serviceKey: ServiceKey, monthIdx: number, status: MonthStatus) => {
      setClients(prev =>
        prev.map(c => {
          if (c.id !== clientId) return c;
          return {
            ...c,
            services: c.services.map(s => {
              if (s.key !== serviceKey) return s;
              const months = [...s.months as MonthStatus[]];
              months[monthIdx] = status;
              return { ...s, months };
            }),
          };
        })
      );
    },
    []
  );

  // Delete a client
  const deleteClient = useCallback((clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  }, []);

  // Add a client
  const addClient = useCallback((client: Client) => {
    setClients(prev => [...prev, client]);
  }, []);

  return {
    clients,
    setClients,
    updateClient,
    updateServiceMonth,
    deleteClient,
    addClient,
    loading,
    error,
  };
}
