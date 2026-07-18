# TAP Hub support form Resend integration

## Task
Replace the support page's mailto-only flow with direct server-side delivery through the existing Resend-backed `/api/send-email` route.

## Recipients
Every support request must be delivered to both fixed recipients:
- mmatronin@gmail.com
- ben@aifusioniqlabs.com

The browser must not be allowed to choose recipients or sender addresses.

## Scope
Likely files:
- `app/support/page.tsx`
- `app/api/send-email/route.ts`
- a focused regression test under `tests/`

Do not modify the existing unrelated dirty files: `app/api/clients/route.ts`, `app/page.tsx`, `components/client-modal.tsx`, `components/client-slideover.tsx`, or their current untracked tests.

## Functional requirements
1. The support page submits directly to `/api/send-email` with JSON rather than opening a mail client.
2. Preserve all current support fields: reporter name, account/firm, app area, summary, urgent flag, what happened, expected result, reproduction steps, and screenshot confirmation.
3. Require at least reporter name, summary, and what happened before submission. Return clear inline validation.
4. Add sending, success, and error UI states. Disable the send button while a request is in flight. A successful request must show that the ticket was sent to the support team.
5. Keep the copy-request fallback, but make it list both support recipients.
6. Update stale page copy that says an email client will open or a screenshot can be attached there. Keep screenshot confirmation as context only and state clearly that screenshots should be sent separately if needed, unless implementing file upload is in scope (it is not).
7. The API route must use `process.env.RESEND_API_KEY`, call the Resend emails endpoint with Bearer auth, and send from the existing verified sender `TAP Hub <notifications@email.mom-ai-agency.site>`.
8. The API route must hard-code the two support recipients and must not accept arbitrary `to` or `from` values from the client, preventing an open relay.
9. Build safe, readable HTML server-side from structured support fields. Escape all user-supplied values before interpolation. Include urgency visibly in subject/body.
10. Return useful 400 errors for invalid input, 500/502 errors for configuration or Resend failures, and `{ sent: true }` on success without exposing secrets.

## Acceptance checks
- Focused regression test proves both fixed recipients, no client-selected recipients/sender, Bearer auth, required-field validation, escaped user input, and support page fetch wiring/states.
- `node tests/regression-api-contracts.mjs` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- `git diff --check` passes.
- Complete diff contains no changes to the unrelated dirty files listed above.
