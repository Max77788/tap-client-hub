# TAP Client Hub — dataset (v7) — REBUILT from the CORRECT files

Source of truth (confirmed):
- clients            <- 'Client List' sheet, TO_DO_LIST_REVISED_2025__New_v1_1.xlsx
- tax returns / financials / renditions / 1099s
                     <- 'Service Frequency' sheet (cols D-J), same file. Assignee = col J.
- payroll            <- PAYROLL_SPREADSHEET__Janeth_V1.xlsx
- sales tax          <- SALES_TAX_2026Sam_V1.xlsx
- vault              <- 'Usernames & Password' sheet
- annual filings     <- 'State-Renewals' sheet
Everything joins on the integer Client ID (name is the fallback). UUIDs wired across files.

## v7 model changes (this rebuild)
- clients: DROPPED entity_type (entity now lives once, on the tax-return row).
- client_services: ADDED filing_state (text) + return_type (enum: C-corp, S-corp,
  SMLLC, Partnership, Trust, Non-profit, Retirement Plan, 1040); reuses due_month for
  the filing month; DROPPED current_stage (redundant with work_periods).
- The 3 tax-return fields (filing_state, return_type, due_month) are NOT in any Excel
  file -> they come through BLANK; the firm fills them in the app.

## Row counts
| Table | Rows |
|---|---|
| clients | 940 |
| services | 8 |
| profiles | 9 |
| client_services | 1234  (TAX 940, FIN 162, PR 64, STX 58, REND 5, T9 5) |
| sales_tax_registration | 58 |
| credentials | 226 |
| annual_filing | 19 |
| work_periods / period_counts / service_comments | 0 (no monthly-status source in these files) |
| client_service_billing / time_entries / audit_log | 0 (app-generated) |
| _UNMATCHED_review | 30 |

## Redacted (load from source into the vault; never routed through this export)
- credentials.vault_ref (portal passwords) | sales_tax bank_account_ref / bank_routing_ref
- payroll EFTPS password / PIN (not extracted) | annual_filing identifying# / passwords

## Findings to act on
1. ASSIGNEE COVERAGE: the 'Service Frequency' Assigned-to column (J) is filled for only
   531 of 940 clients (56%). 409 tax-return clients have NO assignee in the source.
   Names present (Tushar, Sam, Amruta, Sanket, Lizette) all resolved cleanly.
2. SALES TAX: 23 rows are unmatched -> mostly SECONDARY state registrations where the
   source left the ID# blank on continuation rows (e.g. Kalcorp-Georgia, Maxbox-LA/Parish,
   RPBS-Michigan/Colorado, FF&E-Connecticut) plus a few junk/header rows. 2 have a real
   ID# not in the client list (867, 821). See _UNMATCHED_review.csv.
3. PAYROLL: 7 rows unmatched (ID/name not found in Client List).
4. Tax-return state/type/month are blank by design (not in source).

## Load order
services, profiles, clients -> client_services -> sales_tax_registration -> credentials, annual_filing
