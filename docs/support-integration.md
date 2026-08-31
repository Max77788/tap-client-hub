# Support Integration API (v1)

Shared, firm-wide support system for AI FusionIQ Labs. TAP Hub hosts the
support database and exposes a versioned, server-side API that other FusionIQ
apps (`carry-ops`, `transact-ops`, …) use to create and track support tickets.

> **Server-side only.** This API must be called from an app's **server/API
> backend only** — never from browser/client code. It requires a secret API key
> (`SUPPORT_API_KEYS_JSON`) that must never ship to the client. Do not put an
> API key in frontend bundles, environment variables exposed to the browser, or
> any client-side code.

---

## 1. Data model

| Table | Purpose |
| --- | --- |
| `support_apps` | Registry of apps that may open tickets. `key` (stable), `display_name`, `active`, `metadata`, timestamps. Seeded with `tap-hub`, `carry-ops`, `transact-ops`. |
| `support_tickets` | The ticket (existing TAP columns preserved + new shared columns). |
| `support_ticket_messages` | Conversation. `author_type` in `reporter`/`agent`/`system`, `visibility` in `public`/`internal`. Blank bodies are rejected. |
| `support_ticket_events` | Audit stream. `event_type`, actor fields, `from_status`/`to_status`, `metadata`. |
| `support_ticket_attachments` | Attachment **metadata only** (no file storage behavior). |

New `support_tickets` columns: `source_app_key`, `external_reference`,
`reporter_user_id`, `category`, `client_context` (JSONB), `metadata` (JSONB),
`last_activity_at`, `first_response_at`, `closed_at`, and `external_id`.

### Ticket identifiers

- `ticket_number` — **unchanged** TAP-only numeric id (rendered `TAP-000042` in
  the TAP UI). Existing semantics are preserved.
- `external_id` — **new** firm-wide id (`AIF-000001`, `AIF-000002`, …), unique
  across every app. Populated from the sequence
  `support_tickets_external_id_seq` via a column default; existing rows are
  backfilled once. This is the id external apps should use to correlate
  tickets across the firm.

### Timestamp maintenance (database triggers)

- `support_tickets_maintain_trigger` — keeps `updated_at`/`last_activity_at`
  current and keeps `closed_at` coherent with `status` (set on close, cleared
  on reopen).
- `support_ticket_messages_notify_trigger` — any message bumps
  `last_activity_at`; the first `agent` message sets `first_response_at`.

### Security / isolation

- Row-Level Security is enabled on all tables. Server routes use the Supabase
  **service role**, which bypasses RLS. `anon`/`authenticated` are granted
  read-only access to the `support_apps` registry only; ticket data is
  service-role only.
- App isolation is enforced **in the query**, not just in RLS: every
  ticket read/write is scoped to `source_app_key = <authenticated app>`. A
  ticket owned by another app is indistinguishable from a missing ticket
  (`404`), so existence is never leaked across apps.
- The API never returns internal (`visibility = 'internal'`) messages or
  sensitive profile references (`reporter_profile_id`, `assigned_to`).

---

## 2. API key setup

Set one environment variable on the TAP Hub deployment (server-side):

```
SUPPORT_API_KEYS_JSON='{"carry-ops":"<random-secret>","transact-ops":"<random-secret>"}'
```

- It is a JSON object mapping a **source app key** (must exist and be active in
  `support_apps`) to that app's **secret**.
- Generate a strong random secret per app (e.g. `openssl rand -hex 32`). Never
  commit real secrets to the repository or `.env` files that are tracked.
- The source app of a request is determined **entirely** by the API key — the
  request body cannot override it.

The app then authenticates with:

```
Authorization: Bearer [APP_API_KEY]
```

Secrets are compared with a constant-time digest comparison
(`crypto.timingSafeEqual`) to avoid timing side-channels.

---

## 3. Endpoints

All endpoints require the `Authorization: Bearer [APP_API_KEY]` header and are
served from `/api/support/v1/...`.

### POST `/api/support/v1/tickets`

Create a ticket.

```jsonc
{
  "title": "Reports fail to export",           // required
  "description": "Clicking export returns 500…", // required
  "reporterName": "Ada Lovelace",              // required
  "reporterEmail": "ada@example.com",          // optional
  "reporterUserId": "user_123",                // optional (your own user id)
  "externalReference": "order_99123",          // optional (your correlation id)
  "priority": "urgent",                        // optional; "normal" otherwise
  "category": "reports",                       // optional
  "clientContext": { "plan": "pro" },          // optional JSON object
  "metadata": { "channel": "api" }             // optional JSON object
}
```

Response `201`:

```json
{
  "ticket": {
    "id": "6e9c4d4e-…-uuid",
    "number": "AIF-000042",
    "status": "open",
    "createdAt": "2026-08-31T12:00:00.000Z"
  }
}
```

Errors: `400` (validation), `401`/`403`/`404` (auth / inactive / unknown app),
`500` (server).

### GET `/api/support/v1/tickets/[id]`

Fetch a ticket **owned by the authenticated app** plus its **public** messages.
`[id]` may be the ticket UUID (from creation) or the `external_id`
(`AIF-000042`).

Response `200`:

```jsonc
{
  "ticket": {
    "id": "6e9c4d4e-…-uuid",
    "number": "AIF-000042",
    "status": "open",
    "priority": "normal",
    "category": "reports",
    "title": "Reports fail to export",
    "description": "Clicking export returns 500…",
    "externalReference": "order_99123",
    "reporterName": "Ada Lovelace",
    "reporterEmail": "ada@example.com",
    "clientContext": { "plan": "pro" },
    "createdAt": "2026-08-31T12:00:00.000Z",
    "updatedAt": "…",
    "lastActivityAt": "…",
    "firstResponseAt": null,
    "closedAt": null
  },
  "messages": [
    { "id": "…", "authorType": "reporter", "authorName": "Ada Lovelace", "body": "…", "visibility": "public", "createdAt": "…" }
  ]
}
```

Internal messages and sensitive profile fields are never returned.

### POST `/api/support/v1/tickets/[id]/messages`

Append a **public reporter** message to the authenticated app's ticket.

```jsonc
{
  "body": "Still failing on v2.1 as well",   // required, non-blank
  "metadata": { "channel": "api" }           // optional JSON object
}
```

Response `201`:

```json
{
  "message": {
    "id": "…",
    "authorType": "reporter",
    "authorName": "Ada Lovelace",
    "body": "Still failing on v2.1 as well",
    "visibility": "public",
    "createdAt": "…"
  }
}
```

---

## 4. Deployment / migration steps

1. Apply the migration
   `migrations/20260831_shared_support_system.sql` to the `tap_hub_project`
   schema. It is idempotent (safe to re-run) and issues
   `notify pgrst, 'reload schema'` so PostgREST picks up the new tables/grants.
2. Set `SUPPORT_API_KEYS_JSON` in the TAP Hub server environment (see §2) and
   restart/deploy.
3. For each external app, add a row in `support_apps` (or confirm it was
   seeded) and issue that app a secret via `SUPPORT_API_KEYS_JSON`.
4. External apps call the API from their server backend only.

---

## 5. Example call (server-side)

```bash
curl -X POST https://<tap-hub>/api/support/v1/tickets \
  -H "Authorization: Bearer [APP_API_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Reports fail to export",
    "description": "Clicking export returns 500",
    "reporterName": "Ada Lovelace",
    "reporterEmail": "ada@example.com"
  }'
```
