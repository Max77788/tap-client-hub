import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const groupCardStart = source.indexOf("function GroupCard(");
const groupCardEnd = source.indexOf("// ── Client Card ──", groupCardStart);

assert.notEqual(groupCardStart, -1, "GroupCard must exist");
assert.notEqual(groupCardEnd, -1, "GroupCard boundary must exist");

const groupCard = source.slice(groupCardStart, groupCardEnd);
const modalStart = groupCard.indexOf("{popupOpen && (");
const entityMapStart = groupCard.indexOf("clients.map((c) => {", modalStart);
const entityMapEnd = groupCard.indexOf("              })}", entityMapStart);

assert.notEqual(modalStart, -1, "GroupCard popup/modal must exist");
assert.notEqual(entityMapStart, -1, "GroupCard modal must render entity tiles");
assert.notEqual(entityMapEnd, -1, "GroupCard modal entity-tile boundary must exist");

// Keep this contract scoped to GroupCard's popup entity tile, not ClientCard.
const modalEntityTile = groupCard.slice(entityMapStart, entityMapEnd);

assert.match(
  modalEntityTile,
  /<span\s+className=\{`badge\s+\$\{c\.type\s*===\s*"Business"\s*\?\s*"b-biz"\s*:\s*"b-per"\}`\}\s*>\s*\{c\.type\s*===\s*"Business"\s*\?\s*"BIZ"\s*:\s*"PERS"\}\s*<\/span>/,
  "each GroupCard modal entity tile must retain its BIZ/PERS type badge",
);
assert.match(
  modalEntityTile,
  /\{\s*c\.active\s*===\s*false\s*&&\s*\(\s*<span\b[\s\S]*?>\s*INACTIVE\s*<\/span>\s*\)\s*\}/,
  "the GroupCard modal INACTIVE badge must be structurally controlled by c.active === false",
);

console.log("GroupCard inactive indicator regression check passed");
