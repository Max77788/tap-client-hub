import assert from "node:assert/strict";
import { canAccessPathname, moduleForPathname } from "../lib/access-policy.ts";

assert.equal(moduleForPathname("/contacts"), "Clients");
assert.equal(
  canAccessPathname("staff", ["Clients"], "/contacts"),
  true,
  "A user with Clients access must be allowed to open the Contacts directory.",
);

console.log("contacts route access regression checks passed");
