import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    email: user.email || "",
    name: profile.full_name || "",
    role: profile.role || "",
    location: profile.location || "",
    email_2fa_enabled: profile.email_2fa_enabled ?? false,
  });
}
