import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("opening a contact writes its identifier into the Contacts URL", () => {
  const page = readFileSync(new URL("../app/contacts/page.tsx", import.meta.url), "utf8");
  assert.match(page, /useSearchParams/, "Contacts must read the selected contact from the URL");
  assert.match(page, /searchParams\.get\("contact"\)/, "Contacts must restore the contact identifier after refresh");
  assert.match(page, /router\.push\(`\/contacts\?contact=\$\{encodeURIComponent\(client\.id\)\}`\)/, "opening a row must put its ID in the URL");
  assert.match(page, /router\.push\("\/contacts"\)/, "closing a profile must clear the selected-contact URL");
});
