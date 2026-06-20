# TAP Hub - Full CRUD & Entity Connections Implementation Plan

> **For Hermes:** Execute task-by-task. Commit after each task.
>
> **Goal:** Make adding/editing/deleting all entities functional with proper connections between them. Fix data persistence so changes survive reload and write back to source of truth.

**Architecture:** All mutable state lives in `app/page.tsx` `clients` array (localStorage-backed). Service pages, worklist tables, vault, and workload are read-only views of this array. The plan makes them read-write where appropriate.

**Strategy:** Minimal changes per file. Keep localStorage as persistence layer since Supabase integration is a separate project. Fix connections by propagating state changes through the component tree.

---

## Phase 1: Delete Client (Critical Missing CRUD)

### Task 1.1: Add delete button to client slideover

**Files:**
- Modify: `components/client-slideover.tsx`

**What:** Add a red "Delete Client" button in the slideover footer (only in edit mode), with a confirmation dialog.

**Code:**
```tsx
// In ClientSlideoverProps, add:
onDelete?: (clientId: string) => void;

// In footer, add delete button (before Close, only when editable):
{editable && (
  <button
    onClick={() => {
      if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
        onDelete?.(client.id);
        onClose();
      }
    }}
    className="text-sm font-medium px-4 py-2 rounded-lg border border-[var(--red)] text-[var(--red)] hover:bg-[var(--red-soft)] transition-colors mr-auto"
  >
    Delete Client
  </button>
)}
```

### Task 1.2: Wire delete handler in clients page

**Files:**
- Modify: `app/page.tsx`

**What:** Pass `onDelete` prop to ClientSlideover that removes client from state.

**Code:**
```tsx
// After handleSlideoverSave, add:
const handleSlideoverDelete = useCallback((clientId: string) => {
  setClients(prev => prev.filter(c => c.id !== clientId));
  setSelectedClientId(null);
}, []);

// In the slideover JSX, add:
<ClientSlideover
  ...
  onDelete={handleSlideoverDelete}
/>
```

**Verify:** Open a client, click Edit, click Delete Client, confirm → client vanishes from grid. Refresh page → client still gone (saved to localStorage).

---

## Phase 2: Vault CRUD (Add/Edit/Delete Credentials)

### Task 2.1: Add vault CRUD to data layer

**Files:**
- Modify: `lib/data.ts`

**What:** Expose `VAULT_ENTRIES` as mutable + add helper functions for CRUD. Store in localStorage.

**Code:**
```ts
// Replace `export const VAULT_ENTRIES` with:
const STORED_VAULT = typeof window !== "undefined"
  ? (() => { try { const r = localStorage.getItem("tap_vault"); return r ? JSON.parse(r) : null; } catch { return null; } })()
  : null;

export const VAULT_ENTRIES: VaultEntry[] = STORED_VAULT || ORIGINAL_VAULT_ENTRIES;

function saveVault() {
  if (typeof window !== "undefined") {
    localStorage.setItem("tap_vault", JSON.stringify(VAULT_ENTRIES));
  }
}

export function addVaultEntry(entry: VaultEntry) {
  VAULT_ENTRIES.push(entry);
  saveVault();
}

export function updateVaultEntry(id: string, updates: Partial<VaultEntry>) {
  const idx = VAULT_ENTRIES.findIndex(e => e.id === id);
  if (idx >= 0) {
    VAULT_ENTRIES[idx] = { ...VAULT_ENTRIES[idx], ...updates };
    saveVault();
  }
}

export function deleteVaultEntry(id: string) {
  const idx = VAULT_ENTRIES.findIndex(e => e.id === id);
  if (idx >= 0) {
    VAULT_ENTRIES.splice(idx, 1);
    saveVault();
  }
}
```

### Task 2.2: Add vault modal component (Add/Edit)

**Files:**
- Create: `components/vault-modal.tsx`

**What:** Modal with fields: Site, URL, Username, Password, Notes, Client (dropdown). Used for both Add and Edit modes.

### Task 2.3: Wire vault modal into vault page

**Files:**
- Modify: `app/vault/page.tsx`

**What:** Add "Add Credential" button → opens VaultModal. Add edit/delete icons per entry row.

---

## Phase 3: Users CRUD (Add/Edit/Delete Team Members)

### Task 3.1: Make MOCK_USERS mutable + localStorage persistence

**Files:**
- Modify: `app/users/page.tsx`

**What:** Same pattern as clients — load from localStorage, persist on change.

### Task 3.2: Add user modal & wire CRUD

**Files:**
- Modify: `app/users/page.tsx`

**What:** Add "Add User" button → modal with name, email, role, location, manager, modules. Edit: click row → opens modal pre-filled. Delete: trash icon with confirm.

---

## Phase 4: Fix Worklist → Client Service Persistence

### Task 4.1: Propagate worklist state changes back to clients

**Files:**
- Modify: `components/worklist-table.tsx`
- Modify: `app/tax/page.tsx` (and all service pages: `fin`, `pr`, `rend`, `stx`, `t9`)

**What:** The worklist table currently has its own local `worklistState` that never writes back to the client service data. When a user clicks a month cell to cycle the stage, it should:
1. Update the worklist state (already works)
2. Write the stage back to the client's service months array in the parent's clients state
3. The parent persists to localStorage

**Approach:** Add `onStageChange?: (clientId: string, monthIdx: number, newStage: WorklistStage) => void` callback to WorklistTableProps. Service pages pass a handler that updates the client in the main clients array.

**Code in service page (e.g., tax/page.tsx):**
```tsx
// Load clients from localStorage instead of static import
const [clients, setClients] = useState(() => {
  try {
    const saved = localStorage.getItem("tap_hub_clients");
    return saved ? JSON.parse(saved) : CLIENTS;
  } catch { return CLIENTS; }
});

function handleStageChange(clientId: string, monthIdx: number, newStage: WorklistStage) {
  setClients(prev => prev.map(c => {
    if (c.id !== clientId) return c;
    return {
      ...c,
      services: c.services.map((s: any) => {
        if (s.key !== "tax_returns") return s;
        const months = [...s.months];
        months[monthIdx] = mapWorklistStageToMonthStatus(newStage);
        return { ...s, months };
      })
    };
  }));
}

// Persist on change
useEffect(() => {
  localStorage.setItem("tap_hub_clients", JSON.stringify(clients));
}, [clients]);
```

**This pattern repeats for all 6 service pages.** Use a shared hook to reduce duplication.

### Task 4.2: Create shared `useClientsState` hook

**Files:**
- Create: `hooks/use-clients-state.ts`

**What:** Hook that loads clients from localStorage, provides setter that auto-persists, and returns the clients + update helpers.

### Task 4.3: Wire all service pages to shared hook

**Files:**
- Modify: `app/tax/page.tsx`, `app/fin/page.tsx`, `app/pr/page.tsx`, `app/rend/page.tsx`, `app/stx/page.tsx`, `app/t9/page.tsx`

**What:** Replace `import { CLIENTS } from "@/lib/data"` with `useClientsState()` hook.

---

## Phase 5: Fix Timesheet → Client/Staff Connection

### Task 5.1: Link timesheet entries to client/staff IDs instead of names

**Files:**
- Modify: `app/time/page.tsx`

**What:** Currently timesheet entries store `clientName` and `personName` as strings. If a client is renamed in the main page, timesheet entries become stale. Fix:
- Store `clientId` and `personId` alongside names
- Display names (look them up from the clients/staff arrays)
- When client is deleted, timesheet entries for that client become "Deleted Client"

---

## Phase 6: Connection Integrity

### Task 6.1: Fix vault → client linkage (use client ID, not name)

**Files:**
- Modify: `lib/data.ts` (vault entry type + helpers)
- Modify: `app/vault/page.tsx`

**What:** Vault entries currently match to clients by `clientName` string. Add optional `clientId` field. When displaying, use ID first, fall back to name matching.

### Task 6.2: Add "edited" tag to worklist cells when modified

**Files:**
- Modify: `components/worklist-table.tsx`

**What:** When a user clicks a cell and changes its stage, show a subtle "edited" indicator (tiny dot or different border) so they know it's been changed from the original import.

### Task 6.3: Cascade client delete to related data

**Files:**
- Modify: `app/page.tsx` (handleSlideoverDelete)

**What:** When deleting a client, also remove:
- Timesheet entries for that client (from localStorage)
- Vault entries for that client
- Worklist state entries for that client

---

## Phase 7: Polish & Edge Cases

### Task 7.1: Add undo toast for destructive actions

**Files:**
- Create: `components/toast.tsx` (or use simple state-based toast)

**What:** After deleting a client/entry/user, show a toast: "Client deleted. Undo?" that restores the item if clicked within 5 seconds.

### Task 7.2: Add empty states for all tables

**Files:**
- All pages

**What:** When no data exists (e.g., all clients deleted), show friendly empty states with "Add your first..." call-to-action.

### Task 7.3: Add client count to vault after delete cascade

**Verify:** Delete a client → vault entries for that client disappear. Delete last client with vault entries → vault shows empty state.

---

## Execution Order

1. Task 1.1-1.2: Delete Client (foundation — needed before connections make sense)
2. Task 4.2: Create `useClientsState` hook (shared infrastructure)
3. Task 4.3: Wire all 6 service pages
4. Task 4.1: Worklist persistence
5. Task 6.2: Edited tags
6. Task 2.1-2.3: Vault CRUD
7. Task 6.1: Vault → Client ID linkage
8. Task 3.1-3.2: Users CRUD
9. Task 5.1: Timesheet ID linkage
10. Task 6.3: Cascade delete
11. Task 7.1-7.3: Polish

**Total: ~15 tasks, ~2-5 min each**
