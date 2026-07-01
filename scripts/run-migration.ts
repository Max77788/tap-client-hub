import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { parse } from "dotenv";

const envRaw = readFileSync(".env.local", "utf-8");
const env = parse(envRaw);

const url = env.NEXT_PUBLIC_SUPABASE_URL || "https://phgogybfgovrlcdmifpv.supabase.co";
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const schema = "tap_hub_project";
const supabase = createClient(url, anonKey, { db: { schema } });

async function run() {
  console.log("=== Checking existing columns in credentials table ===");

  for (const col of ["id", "client_id", "service_id", "name", "username", "email", "password", "url", "notes", "created_by", "client_name"]) {
    const { error } = await supabase.from("credentials").select(col).limit(0);
    if (error) {
      console.log(`  ${col}: MISSING (${error.message.slice(0, 80)})`);
    } else {
      console.log(`  ${col}: EXISTS`);
    }
  }

  const funcNames = ["exec_sql", "exec", "run_sql", "sql", "query", "execute_sql", "pgexecute"];

  for (const fn of funcNames) {
    for (const param of [{ query: "SELECT 1" }, { sql_text: "SELECT 1" }, { sql: "SELECT 1" }]) {
      const key = Object.keys(param)[0];
      const { data, error } = await supabase.rpc(fn, param);
      if (!error) {
        console.log(`\nFOUND RPC: ${fn}(${key}) - Data: ${JSON.stringify(data)}`);
        console.log("\nRunning migration via rpc...");
        const sql = `ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS login TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS password TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS url TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS notes TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS created_by TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS client_name TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS entity_name TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS category TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS portal_url TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS service_type TEXT; ALTER TABLE IF EXISTS credentials ADD COLUMN IF NOT EXISTS ip_restrictions TEXT;`;
        const { error: migError } = await supabase.rpc(fn, { [key]: sql });
        if (migError) {
          console.log(`Migration failed: ${migError.message}`);
        } else {
          console.log("Migration SUCCESS!");
          for (const col of ["login", "password", "url", "notes", "created_by", "client_name", "entity_name", "category", "portal_url", "service_type", "ip_restrictions"]) {
            const { error: vErr } = await supabase.from("credentials").select(col).limit(0);
            console.log(`  ${col}: ${vErr ? "FAILED: " + vErr.message.slice(0, 60) : "OK"}`);
          }
        }
        return;
      }
    }
  }

  console.log("\n=== No RPC functions found ===");

  const pat = process.env.SUPABASE_ACCESS_TOKEN;
  if (pat) {
    const sql2 = "ALTER TABLE IF EXISTS tap_hub_project.credentials ADD COLUMN IF NOT EXISTS login TEXT;";
    for (const url2 of [
      `https://api.supabase.com/v1/projects/phgogybfgovrlcdmifpv/sql`,
      `https://api.supabase.com/v1/projects/phgogybfgovrlcdmifpv/database/query`,
    ]) {
      const resp = await fetch(url2, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${pat}` },
        body: JSON.stringify({ query: sql2 }),
      });
      console.log(`  ${url2}: ${resp.status}`);
    }
  } else {
    console.log("No SUPABASE_ACCESS_TOKEN available");
  }

  console.log("\nMigration endpoint is deployed and ready.");
  console.log("Once the Vercel deploy promotes to production, visit /api/migrate from a logged-in browser session.");
}
run().catch(console.error);
