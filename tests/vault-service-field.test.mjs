import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const modal = read("../components/vault-modal.tsx");
const route = read("../app/api/credentials/route.ts");
const types = read("../lib/types.ts");

assert.match(types, /export interface VaultEntry[\s\S]*?service\?: string;/, "VaultEntry must expose the service field");
assert.match(modal, /service: ""/, "New credentials must initialize an empty service field");
assert.match(modal, /service: vaultEntry\.service \|\| ""/, "Edit credentials must load the saved service field");
assert.match(modal, /<Field label="Service">[\s\S]*?update\("service", e\.target\.value\)/, "Credential modal must render an editable Service field");
assert.match(route, /service: c\.service_type \|\| ""/, "Credentials GET must map service_type to service");
assert.match(route, /service_type: body\.service\?\.trim\(\) \|\| null/g, "Credential create and edit must persist service to service_type");
assert.match(route, /service: created\.service_type \|\| ""/, "Credential create response must return service");
assert.match(route, /service: updated\.service_type \|\| ""/, "Credential edit response must return service");

console.log("Password Vault service field regression checks passed");
