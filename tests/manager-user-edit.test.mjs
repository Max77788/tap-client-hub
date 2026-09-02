import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

const profilesRoute = read("app/api/profiles/route.ts");
const deleteRoute = read("app/api/profiles/[id]/route.ts");
const accessServer = read("lib/access-server.ts");
const usersPage = read("app/users/page.tsx");

// ── Endpoint wiring ──
// Ordinary managers can only reach PATCH. POST and DELETE stay behind the
// explicit user-management capability.
assert.match(profilesRoute, /requireUserProfileEditAccess\(\)/, "PATCH must use the manager-aware edit guard");
assert.match(profilesRoute, /requireUserManagementAccess\(\)/, "POST must require explicit user-management access");
assert.match(deleteRoute, /requireUserManagementAccess\(\)/, "DELETE must require explicit user-management access");

// ── Access-server guard ──
// Managers with Users & Access get edit access. A manager with an explicit
// can_manage_users grant gets the full user-management surface.
assert.match(accessServer, /export async function requireUserProfileEditAccess/);
assert.match(accessServer, /identity\.role === "manager" && identity\.modules\.includes\("Users & Access"\)/);
assert.match(accessServer, /identity\.canManageUsers/);
assert.match(accessServer, /canManageUsers\(role, profile\?\.can_manage_users\)/);
assert.match(accessServer, /allowEditClientData: userManager \|\| profile\?\.allow_edit_client_data === true/);

// ── Manager edit branch is an explicit, safe allowlist ──
// Slice out the manager branch (from `if (isManagerEdit)` up to the owner/admin comment)
// and prove it never writes privileged fields.
const managerBranch = profilesRoute.slice(
  profilesRoute.indexOf("if (isManagerEdit)"),
  profilesRoute.indexOf("// ── Owner/Admin full edit"),
);
assert.ok(managerBranch.length > 0, "manager edit branch must exist in PATCH handler");
assert.match(managerBranch, /isPowerUser\(targetRole\)/, "manager branch must refuse Owner/Admin targets");
assert.match(managerBranch, /Managers cannot edit Owner\/Admin accounts/);
assert.match(managerBranch, /sanitizeManagerModules\(targetRole, target\.modules, modules\)/);
assert.match(managerBranch, /updateData\.full_name/);
assert.match(managerBranch, /updateData\.location/);
assert.match(managerBranch, /updateData\.reporting_manager/);
assert.doesNotMatch(managerBranch, /updateData\.(role|email|active|invite_status|password|email_2fa_enabled|allow_edit_client_data)/, "manager branch must not write privileged/auth fields");

// ── UI wiring ──
// A manager with Users & Access can open the existing edit modal. The explicit
// server-derived capability unlocks add/delete without relying on the role label.
assert.match(usersPage, /const canEditUsers = isOwner \|\| canViewUsers/);
assert.match(usersPage, /onClick=\{canEditUsers \? \(\) => openModal\(u\) : undefined\}/);
assert.match(usersPage, /canManageUsers\?: boolean/);
assert.match(usersPage, /const canManageUsers = isOwner \|\| currentUser\?\.canManageUsers === true/);
assert.match(usersPage, /\{canManageUsers && <div style=\{\{ display: "flex", justifyContent: "flex-end"/, "Add user button follows the explicit management capability");
assert.match(usersPage, /\{canManageUsers && modalUser !== "new" && !deleteConfirm && \(/, "Delete action follows the explicit management capability");

console.log("manager user edit regression checks passed");
