"use client";

import { useState, useMemo } from "react";
import { CLIENTS } from "@/lib/data";
import WorklistTable from "@/components/worklist-table";

export default function TaxPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const years = useMemo(
    () => [currentYear, currentYear - 1, currentYear - 2],
    [currentYear],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1
            className="text-xl font-semibold text-[var(--ink)] m-0"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            Tax Returns
          </h1>
          <p className="text-xs text-[var(--muted)] m-0 mt-0.5">
            Annual tax return preparation and filing (yearly)
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
      <WorklistTable serviceKey="tax_returns" clients={CLIENTS} year={year} />
    </div>
  );
}
