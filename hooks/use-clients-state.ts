"use client";

import { useState, useEffect, useCallback } from "react";
import type { Client, ServiceKey, MonthStatus } from "@/lib/types";
import { CLIENTS as INITIAL_CLIENTS } from "@/lib/data";

const STORAGE_KEY = "tap_hub_clients";
const DATA_VERSION = 2;

function loadClients(): Client[] {
  if (typeof window === "undefined") return INITIAL_CLIENTS as Client[];
  try {
    const storedVersion = localStorage.getItem("tap_hub_data_version");
    if (storedVersion === String(DATA_VERSION)) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return INITIAL_CLIENTS as Client[];
}

function saveClients(clients: Client[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    localStorage.setItem("tap_hub_data_version", String(DATA_VERSION));
  } catch {}
}

export function useClientsState() {
  const [clients, setClients] = useState<Client[]>(loadClients);

  // Persist on change
  useEffect(() => {
    saveClients(clients);
  }, [clients]);

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

  // Delete a client (with cascade handled by caller if needed)
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
  };
}
