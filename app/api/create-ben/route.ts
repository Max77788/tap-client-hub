import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({
      ok: false,
      error: "Missing env vars",
      has_url: !!url,
      has_key: !!serviceKey,
      url_prefix: url?.substring(0, 40),
      key_prefix: serviceKey?.substring(0, 25),
    });
  }

  const supabase = createClient(url, serviceKey, {
    db: { schema: "tap_hub_project" },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email: "ben@aifusioniqlabs.com",
    password: "BenFusion2025!",
    email_confirm: true,
    user_metadata: { name: "Ben AI Fusion", role: "admin" },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (data?.user?.id) {
    await supabase
      .from("profiles")
      .upsert({
        id: data.user.id,
        full_name: "Ben AI Fusion",
        role: "admin",
        active: true,
        email_2fa_enabled: true,
      })
      .eq("id", data.user.id);
  }

  return NextResponse.json({
    ok: true,
    user_id: data?.user?.id,
    email: data?.user?.email,
  });
}
