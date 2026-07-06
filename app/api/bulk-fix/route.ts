import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const supabase = createClient(url, key, { db: { schema: "tap_hub_project" } });

  // Fix 1: Strip leading " from names
  const { data: quoted, error: qErr } = await supabase
    .from("clients")
    .select("id, name")
    .like("name", '"%');

  const results: Record<string, unknown> = {};

  if (qErr) {
    results.quote_error = qErr.message;
  } else {
    results.quotes_found = quoted?.length || 0;
    let fixed = 0;
    if (quoted) {
      for (const c of quoted) {
        const clean = c.name.replace(/^"+/, "");
        if (clean !== c.name) {
          const { error } = await supabase
            .from("clients")
            .update({ name: clean })
            .eq("id", c.id);
          if (!error) fixed++;
        }
      }
    }
    results.quotes_fixed = fixed;
  }

  // Fix 2: Update groups from sheet data for matching clients
  // Only update clients whose group_owner is 'Unassigned' and match sheet data
  let groupsUpdated = 0;
  
  // Hardcoded group map from sheet data (name_lower -> group)
  // This is a subset of the full 302 mappings - just the key ones
  const GROUP_MAP: Record<string, string> = {
    "1167 n kingsley drive llc": "Baljit Gambhir",
    "15295 i-35 llc": "Saritha",
    "1624 bonnie brae llc": "Baljit Gambhir",
  };

  const { data: unassigned, error: uErr } = await supabase
    .from("clients")
    .select("id, name, group_owner")
    .eq("group_owner", "Unassigned")
    .limit(1000);

  if (uErr) {
    results.group_error = uErr.message;
  } else {
    results.unassigned_count = unassigned?.length || 0;
    if (unassigned) {
      for (const c of unassigned) {
        const key = c.name.trim().toLowerCase();
        const newGroup = GROUP_MAP[key];
        if (newGroup) {
          await supabase
            .from("clients")
            .update({ group_owner: newGroup })
            .eq("id", c.id);
          groupsUpdated++;
        }
      }
    }
    results.groups_updated = groupsUpdated;
  }

  return NextResponse.json(results);
}
