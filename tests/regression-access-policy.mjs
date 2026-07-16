import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), "utf8");

function loadPolicy() {
  const source = read("lib/access-policy.ts");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(module, exports, require) { ${js}\n})(module, module.exports, require);`, {
    module,
    require: () => { throw new Error("Unexpected dependency in access policy"); },
  });
  return module.exports;
}

const policy = loadPolicy();

assert.equal(policy.normalizeRole("Owner / Admin"), "owner");
assert.equal(policy.normalizeRole("Offshore (India)"), "offshore");
assert.equal(policy.canManageUsers("admin"), true);
assert.equal(policy.canManageUsers("owner"), true);
for (const role of ["manager", "staff", "offshore"]) {
  assert.equal(policy.canManageUsers(role), false, `${role} must not manage users`);
  assert.equal(policy.effectiveModules(role, ["Clients", "Users & Access"]).includes("Users & Access"), false);
  assert.equal(policy.canAccessPathname(role, ["Clients"], "/users"), false);
}
assert.equal(policy.canAccessPathname("staff", ["Clients"], "/pr"), false);
assert.equal(policy.canAccessPathname("staff", ["Clients", "Payroll"], "/pr"), true);
assert.equal(policy.canAccessPathname("manager", ["Financials"], "/fin"), true);
assert.equal(policy.canAccessPathname("offshore", ["Vault"], "/vault"), true);
assert.equal(policy.canAccessPathname("admin", [], "/users"), true);
assert.equal(policy.firstAllowedRoute("staff", ["Payroll"]), "/pr");
assert.deepEqual(Array.from(policy.sanitizeModulesForRole("staff", ["Clients", "Users & Access"])), ["Clients"]);

const layout = read("app/layout.tsx");
assert.match(layout, /accessLoading/);
assert.match(layout, /fetch\("\/api\/me"/);
assert.match(layout, /canAccessPathname\(role, userModules, pathname\)/);
assert.match(layout, /router\.replace\(firstAllowedRoute/);
assert.match(layout, /router\.push\(item\.href\)/);
assert.match(layout, /Loading navigation/);
assert.doesNotMatch(layout, /useState\(\(\) =>[\s\S]{0,500}tap_demo_role/);

const meRoute = read("app/api/me/route.ts");
assert.match(meRoute, /resolveAccessIdentity/);
assert.match(meRoute, /status: 401/);

for (const route of [
  "app/api/profiles/route.ts",
  "app/api/profiles/[id]/route.ts",
  "app/api/profiles/[id]/password/route.ts",
  "app/api/2fa/admin-toggle/route.ts",
]) {
  const source = read(route);
  assert.match(source, /requireUserManagementAccess/);
  assert.match(source, /status === 401 \? "Unauthorized" : "Forbidden"/);
}

const profilesRoute = read("app/api/profiles/route.ts");
assert.match(profilesRoute, /sanitizeModulesForRole/);
const usersPage = read("app/users/page.tsx");
assert.match(usersPage, /if \(!ownerLoading && isOwner\) load\(\)/);
assert.match(usersPage, /m === "Users & Access" && isRestrictedRole/);

const accessServer = read("lib/access-server.ts");
assert.match(accessServer, /verifyDemoSession\(cookieStore\.get\("tap_demo_session"\)/);
assert.doesNotMatch(accessServer, /cookieStore\.get\("tap_demo_(?:email|user)"\)/);
const demoLoginRoute = read("app/api/demo-login/route.ts");
assert.match(demoLoginRoute, /createDemoSession/);
assert.match(demoLoginRoute, /httpOnly:\s*true/);
assert.match(demoLoginRoute, /password !== demo\.password/);
const loginPage = read("app/login/page.tsx");
assert.match(loginPage, /fetch\("\/api\/demo-login"/);
assert.doesNotMatch(loginPage, /TapHub2024|MaxHub2025/);
const proxy = read("proxy.ts");
assert.match(proxy, /tap_demo_session/);
assert.doesNotMatch(proxy, /hasDemoCookie = .*tap_demo_user/);

console.log("access-policy regression tests passed");
