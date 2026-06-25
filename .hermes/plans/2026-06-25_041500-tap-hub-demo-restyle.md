# Plan: Restyle TAP Client Hub to Match Demo Design

## Goal

Repixel the entire TAP Client Hub app to visually match the demo HTML design reference at `/mnt/HC_Volume_105739285/tap-client-hub-demo/TAP_Client_Hub_Demo_v7.html`.

**Source of truth file:** `TAP_Client_Hub_Demo_v7.html` — a 1492-line standalone HTML file with inline CSS + vanilla JS. Full audit at `tap-client-hub-demo/demo-vs-app-audit.md`.

## Current State Assessment

**Already matched to demo:**
- `globals.css` — CSS variables (--paper, --card, --ink, --muted, --line, --teal, etc.), card/stat/button/table base styles, Fraunces for headings, Public Sans for body
- `layout.tsx` — Google Fonts CDN Fraunces + Public Sans (no localFont), sidebar gradient, header bar, mobile drawer
- `app/page.tsx` — StatCard with Fraunces 26px numbers, GroupCard with Fraunces 16.5px titles, ClientCard with service pills, segmented filter control, card hover lift via inline mouse events
- Button classes — `.btn-primary` / `.btn-secondary` with 11px radius
- Table styles — `#faf7f0` header, `#efeade` borders, `#fcfaf4` hover

**Gaps vs demo reference (`demo-to-nextjs-styling-migration.md`):**
1. Search bars — use `pl-[14px]` instead of demo's `pl-[38px]` with search icon
2. Type badges (Business/Personal) — use teal-soft bg vs demo's `var(--ink)` bg for Business
3. Service pills — `font-size: 9px` / `10px` vs demo's `10.5px`
4. Border-radius flash — cards with `rounded-*` + Tailwind `transition-*` classes in className (see pitfall in supabase-admin-panel skill)
5. Sub-pages (workload, time, fin, pr, stx, t9, rend, tax, vault, users, login, 2fa) — may use inconsistent fonts, colors, card patterns
6. Mobile — card grids, table overflow, search bar sizing
7. Slideover components (client-slideover, client-modal, vault-modal) — not auditied vs demo

## Phase 1: Global CSS & Design Tokens

### 1.1 Audit and standardize font-size values

Check every `text-` class in all `.tsx` files and compare against demo reference:

| Demo element | Demo px | Current |
|---|---|---|
| Card title | 16.5px | `text-[16.5px]` ✓ |
| Stat number | 26px | `text-[26px]` ✓ |
| Stat label | 12px | `text-[12px]` ✓ |
| Meta text | 12.5px | varies |
| Service pill | 10.5px bold | `text-[9px]` `text-[10px]` `font-semibold` |
| Type badge | 10.5px bold | varies |
| Button label | 13.5px | `0.84375rem` (13.5px) ✓ |
| Table header | 11.5px | `0.71875rem` (11.5px) ✓ |
| Search text | 14px | `text-[14px]` ✓ |
| Nav item | 14px-15px | `text-sm` (14px) ✓ |

**Files:**
- `app/page.tsx` — service pills: change `font-semibold` to `font-bold`, size to `text-[10.5px]`
- `worklist-table.tsx` — service pills, cell stages, legend items
- `client-slideover.tsx` — section headers, field labels, meta info
- All sub-pages (workload, time, fin, pr, stx, t9, rend, tax, vault, users)

### 1.2 Add missing CSS variables

- Ensure `--teal-ink` is defined (exists in root)
- Ensure `--card-shadow` matches demo's `0 1px 2px rgba(33,31,26,0.04)`
- Verify all 5 soft-color vars exist (teal-soft, amber-soft, red-soft, green-soft, blue-soft)

### 1.3 Fix border-radius flash

Add a globals.css rule to prevent border-radius from animating on mount:

```css
* { border-radius: initial; }
```

Or add `will-change` suppression. Alternatively, audit all cards and replace Tailwind `rounded-*` + `transition-*` className combos with inline styles (as documented in the supabase-admin-panel skill).

**Audit command:** `rg 'rounded-.+transition' app/ components/ --include='*.tsx'` highlights problematic className strings.

### 1.4 Verify table styles cascade

Check that `table`, `th`, `td`, `tr:hover` globals.css styles are not overridden by page-level Tailwind classes.

## Phase 2: Layout & Navigation

### 2.1 Sidebar refinements

Current state: Desktop sidebar at 236px, dark gradient, white text active state.

Demo reference: Check if active nav item should use white pill bg (current) or teal highlight. Review the demo reference for:
- Active state background (currently white pill — confirm)
- Hover state (currently 10% white overlay)
- Nav spacing, separator lines (rgba(255,255,255,0.14))
- Brand spacing and font

**Files:** `app/layout.tsx` (lines 198-277)

### 2.2 Top header bar

Current: 68px tall, card bg, border-bottom, page title with Fraunces 30px.

Demo reference: Check if the header should include:
- Action buttons directly in header (Add Client, Export)
- Search bar built into header (currently in page body)
- Role switcher placement

**Files:** `app/layout.tsx` (lines 288-333)

### 2.3 Mobile drawer

Current: 256px wide sidebar drawer, Fraunces brand, backdrop. Verify:
- Animation timing (duration, easing) matches demo
- Close button style
- Nav item touch targets (min 44px height)
- Logout button styling

**Files:** `app/layout.tsx` (lines 49-149, MobileSidebar component)

## Phase 3: Client Cards (Main Dashboard)

### 3.1 StatCard refinements

Already matches demo closely. Verify:
- Grid columns (2 cols mobile, 5 cols desktop) — current responsive grid looks correct
- Font sizes: 12px label, 26px number — ✓
- Spacing: `p-[13px_16px]`, `rounded-[13px]` — ✓

**Files:** `app/page.tsx` (StatCard component, lines 282-315)

### 3.2 ClientCard refinements

Current: 14px radius card, hover lift, service pills with status popover.

Gaps to fix:
- Service pill text size → change to `10.5px` with `font-bold`
- Type badge → match demo: Business = `var(--ink)` bg + white text, Personal = `#dfe7e6` bg + `var(--teal-ink)` text
- Status dot indicators (if any) → use the 5-color system from demo
- Border-radius flash → convert to inline style pattern

**Files:** `app/page.tsx` (ClientCard component, lines 475-661+)
**Ref:** `references/inline-service-status-pills.md`

### 3.3 GroupCard refinements

Current: Shows group name, entity count badge, locations, pills, expandable entity list.

Gaps:
- Entity count badge matches demo pill pattern? Currently `text-[10px] font-bold px-2 py-0.5 rounded-full`
- Service pills → same size fix as ClientCard (10.5px bold)
- Collapse/expand chevron animation timing
- Entity list items: font sizes, spacing, BIZ/PERS badges

**Files:** `app/page.tsx` (GroupCard component, lines 320-461)

### 3.4 Search bar

Current: `pl-[14px]` — no icon.

Demo reference: `padding: 11px 14px 11px 38px` with a search icon absolutely positioned at 14px from left.

Fix:
- Add search SVG icon inside a wrapper div
- Increase left padding to 38px
- Or: add inset search icon with negative margin / absolute positioning

**Files:** `app/page.tsx` (lines 148-156)
**Also applies to:** `worklist-table.tsx` (if it has its own search bar)

### 3.5 Segmented filter control

Already matches demo: 11px radius container, 8px radius active pill, teal active, muted inactive.

Check: Active pill font should be `font-semibold` (currently is). Verify mobile behavior.

**Files:** `app/page.tsx` (lines 159-173)

## Phase 4: Worklist Table

### 4.1 Stage picker

If month cells use a cycling click approach (current), replace with the floating bottom-sheet picker as documented in `references/worklist-stage-persistence-fix.md`:
- 6 stage buttons in 3-column grid
- Current stage highlighted
- Backdrop to dismiss
- Dark backdrop z-40, fixed bottom sheet z-50

**Files:** `components/worklist-table.tsx`
**Ref:** `references/worklist-stage-persistence-fix.md` (stage picker section)

### 4.2 Cell rendering

Match demo's month cell styling:
- Cell dimensions (min-width for readability)
- Color coding for stages (lock=gray, ip=blue, wc=amber, pp=teal, dn=green, na=light gray)
- Read-only cells (past months) → reduced opacity matching demo
- Current month highlight

**Files:** `components/worklist-table.tsx`

### 4.3 Table header and legend

- Sticky column (client name) on scroll
- Month header row with Fraunces styling
- Legend row (color → stage name mapping)

**Files:** `components/worklist-table.tsx`

### 4.4 Mobile horizontal scroll

Current: Likely already has `overflow-x-auto`. Verify min-width is set on `<table>` element (suggested: 800px).

**Files:** `components/worklist-table.tsx`

## Phase 5: All Sub-Pages

Each page needs a visual audit. Common pattern for every page:

```
5.1 [page]/page.tsx — Fraunces headings, demo card/table/stat patterns
```

### 5.1 Workload (`/workload`)

Current: Staff summary table with month-count heatmap.

Needs:
- Card wrapper for the workload table
- Fraunces for staff name headings
- Heatmap cell colors use demos green/amber/teal (already correct)
- Stat bar at top (X staff, Y clients, Z touchpoints)
- Responsive layout for mobile

**Files:** `app/workload/page.tsx`

### 5.2 Timesheet (`/time`)

Needs audit — likely table-based with person/date columns.

**Files:** `app/time/page.tsx`

### 5.3 Financials (`/fin`)

Needs audit — month-by-month tracking table.

**Files:** `app/fin/page.tsx`

### 5.4 Payroll (`/pr`)

Needs audit.

**Files:** `app/pr/page.tsx`

### 5.5 Sales Tax (`/stx`)

Needs audit.

**Files:** `app/stx/page.tsx`

### 5.6 1099s (`/t9`)

Needs audit.

**Files:** `app/t9/page.tsx`

### 5.7 Renditions (`/rend`)

Needs audit.

**Files:** `app/rend/page.tsx`

### 5.8 Tax Returns (`/tax`)

Needs audit.

**Files:** `app/tax/page.tsx`

### 5.9 Password Vault (`/vault`)

Card-based layout. Needs:
- Credential cards matching demo card pattern
- Search bar with icon
- Copy-to-clipboard interaction

**Files:** `app/vault/page.tsx`

### 5.10 Users & Access (`/users`)

Table of users with role badges. Needs:
- User name Fraunces, email Public Sans
- Role badges matching demo pill pattern
- Active/inactive status indicators

**Files:** `app/users/page.tsx`

## Phase 6: Slideovers & Modals

### 6.1 ClientSlideover

Current: Slideover panel with client details, services, settings.

Needs:
- Match demo's slideover width, header height
- Section spacing, divider lines
- Field labels (12px Public Sans semi-bold)
- Service cards inside slideover matching demo card pattern
- Save button styling (btn-primary)

**Files:** `components/client-slideover.tsx`
**Ref:** `references/inline-service-status-pills.md`

### 6.2 ClientModal

Current: Modal form for adding a client.

Needs:
- Match demo's modal styling
- Field styling (border, padding, font)
- Form layout (grid rows)
- Cancel/Save button positioning

**Files:** `components/client-modal.tsx`

### 6.3 VaultModal

Current: Modal form for vault credentials.

Needs:
- Same modal styling pattern as ClientModal
- Field grouping
- Copy/eye toggle styling

**Files:** `components/vault-modal.tsx`

## Phase 7: Login & Auth Pages

### 7.1 Login page

Current: Centered card with email/password form and demo login option.

Needs:
- Card styling matching demo (14px radius, proper shadow and padding)
- Branding (TAP logo/mark at top)
- Form field consistency (10px radius, 1px line border)
- Demo login button styling (btn-secondary or distinct style)
- 2FA challenge screen styling

**Files:** `app/login/page.tsx`

### 7.2 2FA Settings

Current: 2FA setup/enable/disable form.

Needs:
- Card wrapper, matching demo
- Status badge (Enabled = green pill, Disabled = red pill)
- Field styling

**Files:** `app/settings/2fa/page.tsx`

## Phase 8: Transitions & Micro-interactions

### 8.1 Card hover lift

Already implemented with inline `onMouseEnter`/`onMouseLeave` handlers. Verify:
- Transition duration: 0.14s (demo value) — currently 0.14s ✓
- TranslateY: -2px ✓
- Box-shadow upgrade from card-shadow to shadow ✓
- Border-color change to `#cfc7b5` ✓

### 8.2 Button hover

`btn-primary`: `opacity: 0.9` on hover ✓
`btn-secondary`: `opacity: 0.9` on hover ✓

Verify there's no double-animation (both Tailwind `hover:` and inline `onMouseEnter`).

### 8.3 Table row hover

`tbody tr:hover { background: #fcfaf4; }` — already in globals.css. Verify this isn't overridden by page-level `hover:` classes.

### 8.4 Sidebar nav hover

Current: `onMouseEnter`/`onMouseLeave` for background color. Verify:
- Transition: `transition-colors` on className
- Duration matches demo feel

## Phase 9: Mobile Optimization

### 9.1 Card grid responsiveness

Current: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
Check if breakpoints match demo's intended layout.

### 9.2 Table horizontal scroll

Verify all data tables have `overflow-x-auto` wrapper. Especially:
- Worklist table (12 months wide + client name)
- All sub-page tables (fin, pr, stx, t9, rend, tax)

### 9.3 Search bar mobile sizing

Current search bar has `min-w-[280px]`. Verify on small screens (320px-375px).

### 9.4 Touch targets

iOS: `font-size: 16px` on inputs to prevent zoom (already in globals.css media query).
Min touch target: 44px for all interactive elements (nav items, buttons).

### 9.5 Mobile top bar

Current: Hides subtitle on small screens, hamburger appears.
Hides New Client and Export buttons. Verify this is sufficient.

**Files:** `app/layout.tsx`

## Phase 10: Verification & Build

### 10.1 Build check

```bash
npm run build   # catches type errors and lint issues
```

### 10.2 Visual audit by page

- [ ] `/login` — card, form fields, buttons
- [ ] `/` (Clients) — stat cards, search bar, filters, client cards, group cards
- [ ] `/workload` — staff cards with month heatmap
- [ ] `/time` — timesheet table
- [ ] `/fin` — financial tracking table
- [ ] `/pr` — payroll table
- [ ] `/stx` — sales tax table
- [ ] `/t9` — 1099 table
- [ ] `/rend` — rendition table
- [ ] `/tax` — tax returns table
- [ ] `/vault` — credential cards
- [ ] `/users` — user table with role badges
- [ ] `/settings/2fa` — 2FA settings card
- [ ] Mobile viewport — drawer, cards, tables scroll, form inputs

### 10.3 Git commit & Vercel deploy

```bash
git add -A
git commit -m "style: restyle entire app to match demo design - Fraunces/Public Sans, 14px cards, 11px buttons, pill badges, warm tables"
git push
# Vercel auto-deploys via GitHub integration
```

### 10.4 Post-deploy verification

```bash
curl -s "https://api.vercel.com/v2/deployments?projectId=tap-client-hub&limit=1" \
  -H "Authorization: Bearer <token>" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['deployments'][0]['readyState'])"
```

## Files Changing (Summary)

| File | Changes |
|---|---|
| `app/globals.css` | Border-radius flash fix, minor size tweaks |
| `app/layout.tsx` | Minor header/nav refinements |
| `app/page.tsx` | Search icon, type badges, pill sizes, border-radius fix |
| `components/worklist-table.tsx` | Stage picker, cell styling, mobile scroll |
| `components/client-slideover.tsx` | Demo-matched section styling, field sizes |
| `components/client-modal.tsx` | Demo modal styling |
| `components/vault-modal.tsx` | Demo modal styling |
| `app/workload/page.tsx` | Card wrapper, Fraunces headings |
| `app/time/page.tsx` | Demo table/card styling |
| `app/fin/page.tsx` | Demo table/card styling |
| `app/pr/page.tsx` | Demo table/card styling |
| `app/stx/page.tsx` | Demo table/card styling |
| `app/t9/page.tsx` | Demo table/card styling |
| `app/rend/page.tsx` | Demo table/card styling |
| `app/tax/page.tsx` | Demo table/card styling |
| `app/vault/page.tsx` | Demo card + search styling |
| `app/users/page.tsx` | Demo table + badge styling |
| `app/login/page.tsx` | Demo card styling |
| `app/settings/2fa/page.tsx` | Demo card styling |

## Risks & Open Questions

1. **No live demo HTML to compare against** — The reference `demo-to-nextjs-styling-migration.md` describes pixel values but there's no standalone demo file on disk. Some visual decisions may require eyeballing vs a screenshot.
2. **Border-radius flash** — The fix (inline styles vs Tailwind transition classes) is mechanical but needs careful per-element auditing. Missing one instance causes continued flashes.
3. **Sub-page tables** — Some pages may use `<table>` (which inherits globals.css styles), others may use div-based pseudo-tables. Need to check each.
4. **ClientCard service pill state management** — The inline service pill popover needs to stay functional after restyling. Don't break state wiring while changing CSS.
5. **Stage picker replacement** — If the cycling click approach is still active on month cells, replacing with the bottom-sheet picker is a functional change, not just visual. Plan accordingly.

## Execution Order (Recommended)

```
Phase 1 (CSS tokens)  →  Phase 3 (Cards)  →  Phase 4 (Worklist table)  →  Phase 5 (Sub-pages)  →  Phase 6 (Slideovers)  →  Phase 7 (Auth)  →  Phase 9 (Mobile)
                             ↓                                                    ↓
                        Phase 2 (Layout)  ←  combined with                      Phase 8 (Transitions)  →  Phase 10 (Verify)
```
