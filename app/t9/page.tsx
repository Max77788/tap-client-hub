"use client";

import { useState, useMemo } from "react";
import { CLIENTS } from "@/lib/data";
import WorklistTable, { getT9ExpectedCount } from "@/components/worklist-table";

export default function T9Page() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const years = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2],
    [currentYear],
  );

  // Aggregate expected 1099s across all clients with 1099 service
  const t9Clients = useMemo(
    () => CLIENTS.filter((c) => c.services.find((s) => s.key === "1099s")?.enabled),
    [],
  );

  const totalExpected = useMemo(
    () => t9Clients.reduce((sum, c) => sum + getT9ExpectedCount(c.id), 0),
    [t9Clients],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1
            className="text-xl font-semibold text-[var(--ink)] m-0"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            1099s
          </h1>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            Annual 1099 issuance tracking with expected/actual counts per client
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-sm rounded-lg px-3 py-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] cursor-pointer outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary stat */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          className="p-3 rounded-lg flex flex-col"
          style={{
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow)",
            borderLeft: "3px solid #8b6914",
          }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Total Expected 1099s
          </span>
          <span className="text-xl font-bold leading-tight text-[#8b6914]">
            {totalExpected}
          </span>
        </div>
        <div
          className="p-3 rounded-lg flex flex-col"
          style={{
            backgroundColor: "var(--card)",
            boxShadow: "var(--shadow)",
            borderLeft: "3px solid var(--teal)",
          }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Clients with 1099s
          </span>
          <span className="text-xl font-bold leading-tight text-[var(--teal)]">
            {t9Clients.length}
          </span>
        </div>
      </div>

      <WorklistTable
        serviceKey="1099s"
        clients={CLIENTS}
        year={year}
        variant="t9"
      />

      {/* T9-specific legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--muted)]">
        <span>
          Cells show <strong className="text-[var(--ink)]">actual / expected</strong> 1099 count
        </span>
        <span>
          Progress bars indicate completion percentage per month
        </span>
        <span className="italic">
          1099s are typically due by January 31 of the following year (tracked in Oct-Nov)
        </span>
      </div>
    </div>
  );
}
