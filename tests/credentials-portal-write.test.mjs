import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const route = read("../app/api/credentials/route.ts");

// Isolate the create (POST) and edit (PUT) handlers so each assertion
// proves the legacy `portal` column is written in that specific payload.
const postStart = route.indexOf("export async function POST");
const putStart = route.indexOf("export async function PUT");
const deleteStart = route.indexOf("export async function DELETE");
assert.notEqual(postStart, -1, "credentials route must define a POST handler");
assert.notEqual(putStart, -1, "credentials route must define a PUT handler");
assert.notEqual(deleteStart, -1, "credentials route must define a DELETE handler");

const postHandler = route.slice(postStart, putStart);
const putHandler = route.slice(putStart, deleteStart);

assert.match(
  postHandler,
  /\.insert\(\{[\s\S]*?portal:\s*body\.site\.trim\(\),[\s\S]*?\}\)\s*\.select\(\)/,
  "Credential create must persist the legacy portal column derived from the normalized site value",
);
assert.match(
  putHandler,
  /\.update\(\{[\s\S]*?portal:\s*body\.site\.trim\(\),[\s\S]*?\}\)\s*\.eq\(["']id["']/,
  "Credential edit must persist the legacy portal column derived from the normalized site value",
);

console.log("Credentials portal write-payload regression checks passed");
