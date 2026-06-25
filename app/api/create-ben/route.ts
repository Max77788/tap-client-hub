import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email: "ben@aifusioniqlabs.com",
    password: "BenFusion2025!",
    email_confirm: true,
    user_metadata: { name: "Ben AI Fusion", role: "admin" },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Also update the profile with 2FA enabled
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
