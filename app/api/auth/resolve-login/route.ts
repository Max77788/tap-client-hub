import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameFromFullName } from "@/lib/profile-identity";

export const runtime = "nodejs";

type Profile = { full_name: string | null; email: string | null; active: boolean | null };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  if (!identifier || identifier.length > 254) {
    return NextResponse.json({ error: "Enter your username or email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profiles, error } = await admin.from("profiles").select("full_name,email,active").eq("active", true);
  if (error) {
    console.error("Unable to resolve login identifier", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }

  const normalized = identifier.toLowerCase();
  const matches = ((profiles ?? []) as Profile[]).filter((profile) =>
    profile.email?.trim().toLowerCase() === normalized || usernameFromFullName(profile.full_name) === normalized,
  );

  // Return the original identifier on an unknown/ambiguous match so the client has a generic auth failure.
  return NextResponse.json({ email: matches.length === 1 ? matches[0].email : identifier });
}
