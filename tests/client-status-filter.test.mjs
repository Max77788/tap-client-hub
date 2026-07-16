import assert from "node:assert/strict";
import { filterClients } from "../lib/data.ts";

const clients = [
  {
    id: "active-legacy-inactive",
    cid: "CID-1",
    name: "Explicitly Active",
    type: "Business",
    status: "inactive",
    active: true,
    city: "Austin",
    group: "Alpha",
    address: "1 Main St",
    emails: [],
    phones: [],
    services: [],
  },
  {
    id: "default-active-legacy-inactive",
    cid: "CID-2",
    name: "Default Active",
    type: "Business",
    status: "inactive",
    city: "Austin",
    group: "Alpha",
    address: "2 Main St",
    emails: [],
    phones: [],
    services: [],
  },
  {
    id: "inactive-legacy-active",
    cid: "CID-3",
    name: "Explicitly Inactive",
    type: "Business",
    status: "active",
    active: false,
    city: "Austin",
    group: "Alpha",
    address: "3 Main St",
    emails: [],
    phones: [],
    services: [],
  },
];

const idsFor = (status) => filterClients(clients, { status }).map((client) => client.id);

assert.deepEqual(idsFor("All"), [
  "active-legacy-inactive",
  "default-active-legacy-inactive",
  "inactive-legacy-active",
]);
assert.deepEqual(idsFor("active"), [
  "active-legacy-inactive",
  "default-active-legacy-inactive",
]);
assert.deepEqual(idsFor("inactive"), ["inactive-legacy-active"]);

console.log("client status filter regression checks passed");
