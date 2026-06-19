# Ben Meeting Implementation Plan — TAP Hub

**Date:** 2026-06-19
**Source:** Fathom recording — Max / Ben Project update (40 min)
**Priority:** ASAP — Ben wants to meet again tomorrow (Saturday)

## Summary of Changes

Ben walked through the demo and requested specific changes. Here's the breakdown:

---

## Step 1: Expand "Add Client" Service Configuration

### 1a. Add service-aware frequency dropdowns
Each service type has specific allowed cadences. Add a `frequency` picker below each enabled service checkbox:

| Service | Allowed Cadences |
|---------|-----------------|
| Financials | Monthly, Quarterly, Yearly |
| Payroll | Weekly, Bi-Weekly, Monthly |
| Sales Tax | Monthly (fixed) |
| 1099s | Yearly (fixed, no cadence picker) |
| Renditions | Yearly (fixed) |
| Tax Returns | Yearly (fixed) |

For fixed-frequency services, show a label instead of a dropdown (e.g. "Yearly").

### 1b. Add Expected 1099s count field
When 1099s is enabled, show a number input: "Expected 1099s / year"

### 1c. Add Processor field per service
Already exists as `processor` in EMPTY_SERVICES. Expose it when service is enabled. Options: ADP, QuickBooks, Toast, TaxDome, Manual, etc.

### 1d. Make "Assigned to" dropdown more prominent
Already implemented. Keep as-is but make it a required-looking field.

### 1e. Remove "Primary Assigned Staff" field
Ben explicitly said: "So you can remove the primary assigned staff here. That's not needed." Each service has its own assigned person now.

**Files:** `components/client-modal.tsx`

---

## Step 2: Timesheet — Add Service/Module Picker

### 2a. Add service dropdown between Person and Notes
Users need to select which module they're working on: Financials, Payroll, Sales Tax, 1099s, Renditions, Tax Returns. This tracks per-module time.

Add to `TimeEntry` interface: `serviceKey?: string`

### 2b. Rename "What are you working on?" to "Notes"
Ben said: "What are you working on is not optional. Just make them notes." So:
- Placeholder: "Notes"
- Remove "(optional note)" wording

### 2c. Add visual separator between metrics cards and entries table
Ben liked the demo's separator line. Add a horizontal rule or section divider.

**Files:** `app/time/page.tsx`

---

## Step 3: Password Vault — Add Search Bar

### 3a. Add client/site search
Ben: "So might as well make it searchable." Add a search input above the accordion that filters by client name, site, username, and notes.

**Files:** `app/vault/page.tsx`

---

## Step 4: Tax Returns Module Visibility

### 4a. Verify Tax Returns has its own page
`tax_returns` exists in SERVICE_META but may not have a dedicated page. Check if there's a `/tax` route or if it needs creation.

**Files:** Check `app/` directory for tax-related pages

---

## Step 5: Types & Data Updates

### 5a. Update ServiceConfig / EMPTY_SERVICES
Add `expectedAnnual?: number` for 1099s tracking. Ensure all new fields are typed.

### 5b. Update TimeEntry
Add `serviceKey?: string` field for module tracking.

**Files:** `lib/types.ts`, `lib/data.ts`

---

## Verification
- Build check: `cd tap-client-hub && npm run build` (if node_modules available)
- Visual check: open Add Client modal → enable each service → verify fields appear
- Timesheet: start timer with service selected → verify entry shows module
- Vault: type in search → verify filtering works
