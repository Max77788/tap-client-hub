// Behavioral regression tests for the support integration API auth (api-keys).
// Run with: node tests/support-api-auth.test.mjs
//
// Transpiles lib/support/api-keys.ts to CommonJS and executes it in a sandbox
// with a stubbed process.env, exercising authenticateApp() end to end (including
// the constant-time digest comparison) plus a source check that timingSafeEqual
// is actually used.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import assert from "node:assert/strict";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "lib", "support", "api-keys.ts");
const source = readFileSync(sourcePath, "utf8");

const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadModule(env) {
  const mod = { exports: {} };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: (id) => {
      if (id === "node:crypto") return require("node:crypto");
      throw new Error(`Unexpected require in api-keys.ts: ${id}`);
    },
    process: { env },
  };
  const wrapped = `(function (module, exports, require, process) {\n${js}\n})`;
  vm.runInNewContext(wrapped, sandbox)(mod, mod.exports, sandbox.require, sandbox.process);
  return mod.exports;
}

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed += 1;
}

// --- Source contract: constant-time comparison must be used -----------------
ok(source.includes("timingSafeEqual"), "api-keys.ts uses timingSafeEqual");
ok(/from "node:crypto"/.test(source), "api-keys.ts imports from node:crypto");
ok(/SUPPORT_API_KEYS_JSON/.test(source), "api-keys.ts reads SUPPORT_API_KEYS_JSON");

// --- Behavior -----------------------------------------------------------------
const env = {
  SUPPORT_API_KEYS_JSON: JSON.stringify({
    "tap-hub": "secret-tap",
    "carry-ops": "secret-carry",
    "transact-ops": "secret-transact",
    "empty-secret-app": "", // must be filtered out (empty secret)
  }),
};
const api = loadModule(env);

// extractBearerToken
ok(api.extractBearerToken("Bearer secret-carry") === "secret-carry", "extracts bearer token");
ok(api.extractBearerToken("bearer secret-carry") === "secret-carry", "bearer scheme is case-insensitive");
ok(api.extractBearerToken("Basic secret-carry") === null, "rejects non-bearer scheme");
ok(api.extractBearerToken(null) === null, "rejects missing header");
ok(api.extractBearerToken("Bearer") === null, "rejects bearer with no token");

// authenticateApp — valid keys
const good = api.authenticateApp("Bearer secret-carry");
ok(good.ok === true && good.appKey === "carry-ops", "valid carry-ops secret authenticates to carry-ops");

const goodTap = api.authenticateApp("Bearer secret-tap");
ok(goodTap.ok === true && goodTap.appKey === "tap-hub", "valid tap-hub secret authenticates to tap-hub");

// authenticateApp — wrong key -> 401, never leaks which key matched
const wrong = api.authenticateApp("Bearer not-a-real-secret");
ok(wrong.ok === false && wrong.status === 401, "wrong secret returns 401");

// authenticateApp — malformed auth -> 401
const noHeader = api.authenticateApp(null);
ok(noHeader.ok === false && noHeader.status === 401, "missing header returns 401");
const malformed = api.authenticateApp("Basic abc123");
ok(malformed.ok === false && malformed.status === 401, "malformed scheme returns 401");

// empty secrets are ignored, so an empty-secret app cannot be authenticated
const emptySecret = api.authenticateApp("Bearer ");
ok(emptySecret.ok === false && emptySecret.status === 401, "empty token returns 401");

// authenticateApp — misconfigured server -> 500 (fail closed)
const noConfig = loadModule({});
const missingConfig = noConfig.authenticateApp("Bearer whatever");
ok(missingConfig.ok === false && missingConfig.status === 500, "missing SUPPORT_API_KEYS_JSON returns 500");

const badJson = loadModule({ SUPPORT_API_KEYS_JSON: "{not json" });
const malformedConfig = badJson.authenticateApp("Bearer whatever");
ok(malformedConfig.ok === false && malformedConfig.status === 500, "malformed SUPPORT_API_KEYS_JSON returns 500");

const emptyObj = loadModule({ SUPPORT_API_KEYS_JSON: "{}" });
const emptyConfig = emptyObj.authenticateApp("Bearer whatever");
ok(emptyConfig.ok === false && emptyConfig.status === 500, "empty SUPPORT_API_KEYS_JSON object returns 500");

const allEmptySecrets = loadModule({ SUPPORT_API_KEYS_JSON: JSON.stringify({ "tap-hub": "" }) });
const filteredOut = allEmptySecrets.authenticateApp("Bearer whatever");
ok(filteredOut.ok === false && filteredOut.status === 500, "config with only empty secrets returns 500");

console.log(`support-api-auth.test.mjs: ${passed} assertions passed`);
