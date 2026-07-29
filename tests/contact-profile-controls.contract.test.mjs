import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("contact profile controls have real favorite, edit, and overflow behavior", () => {
  const page = readFileSync(new URL("../app/contacts/page.tsx", import.meta.url), "utf8");

  assert.match(page, /localStorage\.setItem\(`tap-contact-favorite-/, "favorite must persist per contact in the browser");
  assert.match(page, /aria-pressed=\{favorite\}/, "favorite control must expose its state");
  assert.match(page, /method: "PATCH"/, "Edit must save through the dedicated contacts API");
  assert.match(page, /Copy email/, "overflow menu must offer a working email action");
  assert.match(page, /Copy phone/, "overflow menu must offer a working phone action");
  assert.match(page, /navigator\.clipboard\.writeText/, "overflow copy actions must use the clipboard");
});
