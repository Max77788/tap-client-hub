# Sub-Pages Visual Audit — Workload, Time, Vault, Users, Support

**Source of truth:** `/mnt/HC_Volume_105739285/tap-client-hub-demo/TAP_Client_Hub_Demo_v7.html`
**App:** `/home/max/projects/tap-client-hub/`

---

## 1. WORKLOAD PAGE — `app/workload/page.tsx`

### Section Header (`.sect2`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Font family | Fraunces | Not used — no `.sect2` equivalent | ✗ |
| Font size | 18px | Not present | ✗ |
| Font weight | 600 | Not present | ✗ |
| Margin | 26px 0 10px | Not present | ✗ |
| **File/Line:** | | | **`app/workload/page.tsx` — Section header missing entirely (no "By team", "Workload by estimated effort", "Service mix by person" section dividers)** |

### Insight Box (`.insight`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Present? | Yes — between stats and sections | Missing entirely | ✗ |
| Background | var(--amber-soft) | — | ✗ |
| Border | 1px solid #ead9b6 | — | ✗ |
| Color | #6b4a12 | — | ✗ |
| Border-radius | 14px | — | ✗ |
| **File/Line:** | | | **`app/workload/page.tsx` — Insight box not implemented** |

### Staff Rows (`.wrow`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Layout | `grid 170px 1fr 120px` | `<table>` with cols: 18%/8%/8%/24%/12×3.5% | ✗ Completely different |
| Gap | 14px | N/A (table) | ✗ |
| Border-bottom | 1px solid #efeade | `borderBottom: "1px solid var(--line)"` (#dde2ec) | ✗ Color mismatch (#efeade vs #dde2ec) |
| Padding | 10px 0 | `td: 12px 14px` (line 165-166 via globals.css) | ✗ |
| **File/Line:** | | | **Lines 140-236** |

### Name Font (`.wname`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Font weight | 600 | `font-semibold` (line 172) | ✓ |
| Font size | 14px | `font-semibold` (inherits 13.5px from table/globals) | ✗ 13.5px vs 14px |
| Sub font size | 11.5px | `text-[10px]` (line 174) | ✗ 10px vs 11.5px |
| Sub font weight | 500 | Not specified (inherits) | ✗ |
| **File/Line:** | | | **Lines 172-174** |

### Load Bar (`.wtrack`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Present? | Yes — visual progress bars | Not implemented — only shows number | ✗ Missing entirely |
| Height | 22px | — | ✗ |
| Border-radius | 7px | — | ✗ |
| Background | #efeade | — | ✗ |
| **File/Line:** | | | **App shows no bar graphic — lines 177-179** |

### Load Number (`.wload b`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Font family | Fraunces | Not Fraunces — just `font-semibold` (line 177) | ✗ |
| Font size | 19px | `font-semibold` (inherits ~13.5px) | ✗ |
| **File/Line:** | | | **Line 177-178** |

### Diff Label (`.wdiff`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Present? | Yes — `d-hi`/`d-lo`/`d-mid` class | Not implemented | ✗ Missing |
| Font size | 11px 600 | — | ✗ |
| Colors | amber/green/muted | — | ✗ |
| **File/Line:** | | | **No diff labels in app** |

### Workload Stat Cards
| Property | Demo | App | Match? |
|---|---|---|---|
| Stat 1 | "Team members" (count of staff) | "Team Members" | ✓ Near match |
| Stat 2 | "Clients" (total) | "Total Clients" | ✓ |
| Stat 3 | "Busiest" (person name) | "Busiest Person" (touchpoints, not name) | ✗ Shows number not name |
| Stat 4 | "Unassigned" (count) | "Touchpoints / yr" (total touches) | ✗ Different metric |
| **File/Line:** | | | **Lines 110-118** |

---

## 2. TIME/TIMESHEET PAGE — `app/time/page.tsx`

### Timer Box (`.tw-timer`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Background | var(--card) | var(--card) (line 206) | ✓ |
| Border-radius | 16px | `rounded-xl` = 12px (line 206) | ✗ 16px vs 12px |
| Padding | 18px 20px | `p-5` = 20px all sides (line 206) | ✗ 20px vs 18px/20px |
| Flex wrap | `flex-wrap:wrap` | `flex flex-col` (line 206) | ✗ Different layout |
| **File/Line:** | | | **Line 206** |

### Field Label
| Property | Demo | App | Match? |
|---|---|---|---|
| Font size | 11px | `text-[10px]` (lines 209, 217, 225, 244) | ✗ 10px vs 11px |
| Font weight | 700 | `font-semibold` = 600 | ✗ 600 vs 700 |
| Letter-spacing | 0.05em | `tracking-wider` ≈ 0.05em | ✓ |
| Text transform | uppercase | uppercase | ✓ |
| **File/Line:** | | | **Lines 209, 217, 225, 236, 244** |

### Timer Select
| Property | Demo | App | Match? |
|---|---|---|---|
| Padding | 9px 11px | `px-3 py-2.5` = 12px 10px (lines 211, 219, 227) | ✗ 12px/10px vs 9px/11px |
| Border-radius | 9px | `rounded-lg` = 8px (lines 211, 219, 227) | ✗ 8px vs 9px |
| **File/Line:** | | | **Lines 211, 219, 227** |

### Clock Display
| Property | Demo | App | Match? |
|---|---|---|---|
| Font size | 40px | `text-[28px]` (line 245) | ✗ 28px vs 40px |
| Font weight | 800 | `font-bold` = 700 | ✗ 700 vs 800 |
| Tabular nums | `font-variant-numeric:tabular-nums` | `tabular-nums` (line 245) | ✓ |
| Letter-spacing | 1px | Not present | ✗ Missing |
| Default color | var(--muted) | Not set — uses `text-[var(--ink)]` (line 245) | ✗ ink vs muted |
| Running color | var(--green) | Adds `text-[var(--green)]` (line 245) | ✓ |
| **File/Line:** | | | **Lines 245-247** |

### Timer Button (`.tw-go`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Background | var(--green) | var(--green) (line 252) | ✓ |
| Padding | 13px 24px | `px-5 py-2.5` = 20px 10px (line 251) | ✗ 20px/10px vs 24px/13px |
| Border-radius | 12px | `rounded-lg` = 8px (line 251) | ✗ 8px vs 12px |
| Font size | 15px | `text-sm` = 14px (line 251) | ✗ 14px vs 15px |
| Font weight | 700 | `font-bold` = 700 | ✓ |
| Stop state bg | var(--red) | `bg-[var(--red)]` (line 251) | ✓ |
| **File/Line:** | | | **Lines 249-255** |

### Edit Marker (`.edited`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Present? | Yes — shows "edited" tag on modified entries | Not implemented for display | ✗ Missing |
| Font size | 10px italic muted | — | ✗ |
| **File/Line:** | | | **`app/time/page.tsx` — entry.edited is tracked (line 79) but never rendered visually** |

### Timer Layout Structure
| Property | Demo | App | Match? |
|---|---|---|---|
| Who/Client/Task layout | `display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px` (single flex row) | `flex flex-col sm:flex-row gap-3` (line 207) — wraps on mobile | ✗ Different layout approach |
| **File/Line:** | | | **Lines 207-232** |

---

## 3. VAULT PAGE — `app/vault/page.tsx`

### Lock Screen
| Property | Demo | App | Match? |
|---|---|---|---|
| Icon size | 46px (🔒 emoji) | 28px SVG (line 134) | ✗ 28px vs 46px |
| Icon container | N/A (emoji) | `w-16 h-16` = 64px circle with teal-soft bg (line 133) | ✗ Different approach |
| h2 font size | 24px | `text-xl` = 20px (line 138) | ✗ 20px vs 24px |
| h2 font family | Default (Fraunces via globals.css) | Explicit `Fraunces, Georgia, serif` (line 138) | ✓ |
| Button style | `.btn` class (var(--ink) bg, #fff text) | `var(--teal)` bg, white text (line 140) | ✗ teal vs ink/dark |
| Description text | Present — about permission lists | Present — about sensitive credentials (line 139) | ✓ Content differs but OK |
| **File/Line:** | | | **Lines 133-145** |

### Vault Note
| Property | Demo | App | Match? |
|---|---|---|---|
| Background | var(--amber-soft) | var(--teal-soft) (line 176) | ✗ teal-soft vs amber-soft |
| Border | 1px solid #ead9b6 | 1px solid var(--teal) (line 176) | ✗ Different color |
| Text color | #7a5210 | var(--teal) / var(--ink) for text (lines 177-179) | ✗ Different colors |
| Border-radius | 13px | `rounded-xl` = 12px (line 176) | ✗ 12px vs 13px |
| Font size | 13px | `text-sm` = 14px for heading, `text-xs` = 12px for body (lines 178-179) | ✗ |
| **File/Line:** | | | **Lines 176-179** |

### Group Blocks (`.vgroup`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Border-radius | 13px | `rounded-xl` = 12px (line 196) | ✗ 12px vs 13px |
| Summary chevron | CSS `::before` with "▸" | Inline SVG with rotation (line 199) | ✓ Different but functional equivalent |
| Count badge | `var(--teal-soft)` bg, 999px radius | `var(--teal-soft)` bg, `rounded-full` (line 202) | ✓ |
| **File/Line:** | | | **Lines 196-227** |

### Login Rows
| Property | Demo | App | Match? |
|---|---|---|---|
| Structure | `<table>` with `<th>` header row | `<div>` with flex layout (line 240) | ✗ Div-based vs table |
| Column header row | Yes — Portal/Username/Password | Yes — Portal/Site/Email/Password/Links/Notes (lines 206-211) | ✓ Functional |
| Show/Hide passwords | Yes — `rev()` function hides with •••••••• | **No** — passwords always visible in plain text (line 243) | ✗ **Missing** |
| Row border-bottom | 1px solid var(--line) | `borderBottom: "1px solid var(--line)"` (line 240) | ✓ |
| **File/Line:** | | | **Lines 240-263** |

### Vault Search
| Demo | App | Match? |
|---|---|---|
| No search in demo vault | Has search bar (lines 186-190) | ✗ Added feature (not in demo) |

---

## 4. USERS PAGE — `app/users/page.tsx`

### Note Banner
| Property | Demo | App | Match? |
|---|---|---|---|
| Present? | Yes — `.vault-note` at top with 🔐 icon | **Not present** | ✗ Missing |
| Background | var(--amber-soft) | — | ✗ |
| Border-radius | 13px | — | ✗ |
| **File/Line:** | | | **No banner on users page** |

### User Chips (`.uchip`) — module labels
| Property | Demo | App | Match? |
|---|---|---|---|
| Font size | 11px | `text-[10px]` (line 156) | ✗ 10px vs 11px |
| Font weight | 600 | `font-semibold` = 600 | ✓ |
| Border-radius | 999px | `rounded` (not full pill) (line 156) | ✗ `rounded` ≈ 4px vs 999px |
| Background | var(--teal-soft) | var(--teal-soft) (line 156) | ✓ |
| Text color | var(--teal-ink) | var(--teal) (line 156) | ✗ teal-ink vs teal |
| Padding | 2px 8px | `px-1.5 py-0.5` = 6px 2px (line 156) | ✗ |
| **File/Line:** | | | **Lines 155-158** |

### Status Badges (`.ustat`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Active bg/fg | var(--green-soft) / var(--green) | var(--green-soft) / var(--green) (line 24) | ✓ |
| Invite sent bg/fg | var(--amber-soft) / var(--amber) | var(--amber-soft) / var(--amber) (line 25) | ✓ |
| Reset required bg/fg | N/A (not in demo data) | var(--red-soft) / var(--red) (line 26) | ✓ |
| Inactive bg/fg | N/A (not in demo data) | var(--red-soft) / var(--red) (line 27) | ✓ |
| Font size | 11px 700 | `text-xs font-semibold` = 12px 600 (line 151) | ✗ 12px vs 11px, 600 vs 700 |
| Border-radius | 999px | `rounded` (line 151) | ✗ Not full pill |
| Padding | 3px 9px | `px-2 py-0.5` = 8px 2px (line 151) | ✗ |
| **File/Line:** | | | **Lines 23-28 (definition), 151 (usage)** |

### Role Badges (`.urole`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Background | var(--blue-soft) | Varies by role: teal-soft/blue-soft/green-soft (line 147) | ✗ Demo has single blue style |
| Text color | var(--blue) | Varies by role: teal/blue/green (line 147) | ✗ |
| Font size | 11px 700 | `text-xs font-semibold` = 12px 600 (line 147) | ✗ 12px vs 11px, 600 vs 700 |
| Border-radius | 999px | `rounded` (line 147) | ✗ Not full pill |
| **File/Line:** | | | **Line 147** |

### Module Grid (`.modgrid`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Present? | Yes — 2-col grid with 7px gap in add/edit modal | **Not present** — no module editing UI | ✗ Missing |
| **File/Line:** | | | **No module grid in app's users page** |

### User Table Columns
| Property | Demo | App | Match? |
|---|---|---|---|
| Name | ✓ | ✓ | ✓ |
| Location | ✓ | N/A — app shows "Username" here | ✗ Different columns |
| Role | ✓ | ✓ | ✓ |
| Reports to | ✓ | ✓ | ✓ |
| Modules | ✓ | ✓ | ✓ |
| Username | ✓ | N/A — app doesn't show username in table | ✗ Missing |
| Status | ✓ | ✓ | ✓ |
| Actions | ✗ (no actions column) | "Change Password" button column | ✗ Added feature |
| **File/Line:** | | | **Lines 130-138** |

---

## 5. SUPPORT PAGE — `app/support/page.tsx`

### Grid Layout (`.supgrid`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Display | `display:flex` | CSS Grid | ✗ Flex vs Grid |
| Gap | 16px | `gap-6` = 24px (line 89) | ✗ 24px vs 16px |
| Main flex ratio | `flex:2` (66.6%) | `lg:col-span-2` (66.6%) | ✓ Equivalent |
| Side flex ratio | `flex:1` (33.3%) | 1 column (33.3%) | ✓ Equivalent |
| **File/Line:** | | | **Line 89** |

### Panel Padding
| Property | Demo | App | Match? |
|---|---|---|---|
| Padding | 20px 22px | `p-6` = 24px (line 93) | ✗ 24px vs 20px/22px |
| **File/Line:** | | | **Lines 92-97** |

### Section Header (`.suph`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Text | "Open a support ticket" | "Submit a Support Request" (line 101) | ✗ Different text |
| Font family | Fraunces | Not Fraunces — just `text-sm font-semibold` (line 99) | ✗ **Missing Fraunces** |
| Font size | 21px | `text-sm` = 14px (line 99) | ✗ 14px vs 21px |
| Font weight | 600 | `font-semibold` = 600 | ✓ |
| **File/Line:** | | | **Lines 99-101** |

### Subject Box (`.subjbox`)
| Property | Demo | App | Match? |
|---|---|---|---|
| Background | #f3f6fc | var(--teal-soft) (line 221) | ✗ Different color |
| Border | 1px dashed #c3cde6 | **No border** (line 221) | ✗ **Missing dashed border** |
| Border-radius | 11px | `rounded-lg` = 8px (line 220) | ✗ 8px vs 11px |
| Label font | 10.5px 700 uppercase | `text-[10px] font-semibold uppercase tracking-wider` (line 223) | ✗ 10px vs 10.5px |
| **File/Line:** | | | **Lines 219-229** |

### Contact Cards
| Property | Demo | App | Match? |
|---|---|---|---|
| Card border | 1px solid var(--line) | **No border on contact section** (line 290-293) | ✗ **Missing border** |
| Card border-radius | 11px | `rounded-xl` = 12px (line 290) | ✗ 12px vs 11px |
| Icon size | 34px box (`.ci`) | 16px SVG icons (lines 301, 326) | ✗ 16px vs 34px |
| Icon border-radius | 9px | N/A (no icon box) | ✗ |
| Icon background | var(--teal-soft) | N/A (no icon box) | ✗ |
| Flex layout | `display:flex;align-items:center;gap:12px` | `flex items-start gap-3` (line 300) | ✗ `items-start` vs `items-center`, `gap-3`=12px vs gap=12px ✓ |
| Padding | 11px 12px | N/A (no card per contact) | ✗ |
| **File/Line:** | | | **Lines 289-350** |

### Steps
| Property | Demo | App | Match? |
|---|---|---|---|
| Flex gap | 11px | `gap-3` = 12px (line 386) | ✗ 12px vs 11px |
| Border-bottom | 1px solid #eef1f6 | **No bottom border** (line 386) | ✗ **Missing border** |
| Circle size | 24px | `w-6 h-6` = 24px (line 388) | ✓ |
| Circle background | var(--teal) | var(--teal-soft) (line 390) | ✗ teal-soft vs teal |
| Circle text color | #fff | var(--teal) (line 391) | ✗ teal vs white |
| Circle font | 12px 700 | `text-xs font-bold` = 12px 700 (line 388) | ✓ |
| **File/Line:** | | | **Lines 386-405** |

### Urgency Row
| Property | Demo | App | Match? |
|---|---|---|---|
| Background | #fff | No special background | ✗ |
| Border | 1px solid var(--line), 10px radius | No border | ✗ |
| Padding | 11px 13px | N/A — plain `<label>` with `gap-2` (line 166) | ✗ |
| **File/Line:** | | | **Lines 166-176** |

### Shot/Screenshot Note
| Property | Demo | App | Match? |
|---|---|---|---|
| Present? | Yes — amber-soft, 12px radius | **Not present** | ✗ **Missing** |
| **File/Line:** | | | **No screenshot note in app** |

### Good/Bad Subject Examples
| Property | Demo | App | Match? |
|---|---|---|---|
| Present? | Yes — colored examples in sidebar | Different — simpler quoted examples (line 420-434) | ✗ Different content and styling |
| Good examples color | var(--green), 12.5px | `text-[var(--muted)]` on teal-soft bg (lines 427-433) | ✗ |
| Bad examples | ✓ (✗ prefix) | Not present | ✗ Missing |

---

## Summary of Key Mismatches

### WORKLOAD (`app/workload/page.tsx`)
| Issue | File:Line | Demo | App | Severity |
|---|---|---|---|---|
| No section headers (sect2) | `app/workload/page.tsx:106-243` | Fraunces 18px 600 section dividers | No Fraunces section headers | HIGH |
| No insight box | `app/workload/page.tsx` | amber-soft insight box with load ratio info | Not implemented | MED |
| Table instead of grid bars | `app/workload/page.tsx:140` | Grid 170px 1fr 120px (.wrow) | Full `<table>` with month columns | HIGH |
| No load bars | `app/workload/page.tsx:177` | .wtrack: 22px, 7px radius, colored segments | Just numbers, no visual bars | HIGH |
| Load number not Fraunces | `app/workload/page.tsx:177` | Fraunces 19px | `font-semibold` ~13.5px | MED |
| No diff labels | `app/workload/page.tsx` | .wdiff: 11px 600, amber/green/muted | Not implemented | LOW |
| Name sub text 10px vs 11.5px | `app/workload/page.tsx:174` | 11.5px 500 | `text-[10px]` | LOW |

### TIME (`app/time/page.tsx`)
| Issue | File:Line | Demo | App | Severity |
|---|---|---|---|---|
| Timer radius 12px vs 16px | `app/time/page.tsx:206` | `border-radius:16px` | `rounded-xl` = 12px | LOW |
| Timer padding 20px vs 18px/20px | `app/time/page.tsx:206` | `padding:18px 20px` | `p-5` = 20px all sides | LOW |
| Field labels 10px 600 vs 11px 700 | `app/time/page.tsx:209,217,225,236,244` | 11px 700 | `text-[10px] font-semibold` | MED |
| Clock display 28px vs 40px | `app/time/page.tsx:245` | 40px 800 tabular-nums | `text-[28px] font-bold` | HIGH |
| Timer button padding/radius different | `app/time/page.tsx:251` | 13px 24px padding, 12px radius, 15px font | 10px 20px, 8px radius, 14px font | MED |
| No edited marker | `app/time/page.tsx:79` | `.edited`: 10px italic muted | `entry.edited` tracked but never rendered | MED |

### VAULT (`app/vault/page.tsx`)
| Issue | File:Line | Demo | App | Severity |
|---|---|---|---|---|
| Lock screen icon 28px vs 46px | `app/vault/page.tsx:134` | 46px emoji | 28px SVG | MED |
| Lock screen h2 20px vs 24px | `app/vault/page.tsx:138` | 24px | `text-xl` = 20px | MED |
| Lock button teal vs ink | `app/vault/page.tsx:140` | var(--ink) bg | var(--teal) bg | MED |
| Vault note teal-soft vs amber-soft | `app/vault/page.tsx:176` | amber-soft, #ead9b6 border | teal-soft, var(--teal) border | HIGH |
| No show/hide password | `app/vault/page.tsx:243` | `••••••••` with show/hide button | Passwords always visible | HIGH |
| Group radius 12px vs 13px | `app/vault/page.tsx:196` | 13px | `rounded-xl` = 12px | LOW |

### USERS (`app/users/page.tsx`)
| Issue | File:Line | Demo | App | Severity |
|---|---|---|---|---|
| No note banner | `app/users/page.tsx` | amber-soft, 13px radius | Not present | MED |
| Module chips 10px vs 11px | `app/users/page.tsx:156` | 11px | `text-[10px]` | LOW |
| Module chips `rounded` vs `999px` | `app/users/page.tsx:156` | 999px | `rounded` (~4px) | MED |
| Role badges 600 vs 700 weight | `app/users/page.tsx:147` | 700 | `font-semibold` = 600 | LOW |
| No module grid | `app/users/page.tsx` | 2-col grid 7px gap in edit modal | Not implemented | HIGH |
| Different table columns | `app/users/page.tsx:130-138` | Name, Location, Role, Reports to, Modules, Username, Status | Name, Username, Location, Role, Reports to, Status, Modules, Actions | MED |

### SUPPORT (`app/support/page.tsx`)
| Issue | File:Line | Demo | App | Severity |
|---|---|---|---|---|
| Section header not Fraunces 21px | `app/support/page.tsx:99` | Fraunces 21px 600 | `text-sm font-semibold` (14px) | HIGH |
| Panel padding 24px vs 20px 22px | `app/support/page.tsx:93` | 20px 22px | `p-6` = 24px | LOW |
| Subject box wrong colors/no border | `app/support/page.tsx:220` | #f3f6fc bg, dashed #c3cde6 border | teal-soft bg, no border | MED |
| Contact cards no border | `app/support/page.tsx:290` | 1px solid var(--line) border | No border | MED |
| Contact icons 16px vs 34px | `app/support/page.tsx:301,326` | 34px icon boxes | 16px SVGs | MED |
| Steps missing border-bottom | `app/support/page.tsx:386` | `border-bottom:1px solid #eef1f6` | No bottom border | LOW |
| Steps circle colors reversed | `app/support/page.tsx:388-391` | teal bg, white text | teal-soft bg, teal text | LOW |
| No screenshot note | `app/support/page.tsx` | amber-soft shot-note | Not present | MED |
| No urgency card styling | `app/support/page.tsx:166` | White bg, border, 10px radius | Plain `<label>` | LOW |
| Grid gap 24px vs 16px | `app/support/page.tsx:89` | 16px | `gap-6` = 24px | LOW |
