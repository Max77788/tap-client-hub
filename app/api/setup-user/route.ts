import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ 
      error: "Missing env vars",
      url_exists: !!url,
      key_exists: !!key,
    }, { status: 500 });
  }

  // Create auth user via Supabase Admin API
  const authResp = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      email: "mmatronin@gmail.com",
      password: "MaxHub2025!",
      email_confirm: true,
      user_metadata: { full_name: "Max Matronin" },
    }),
  });

  const authData = await authResp.json().catch(() => ({}));
  
  if (!authResp.ok && !authData.id) {
    // Maybe user already exists - try to find them
    const listResp = await fetch(`${url}/auth/v1/admin/users?per_page=100`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` },
    });
    const listData = await listResp.json();
    const existing = (listData.users || []).find((u: any) => u.email === "mmatronin@gmail.com");
    
    if (existing) {
      // Update password
      await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey": key,
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({ password: "MaxHub2025!", email_confirm: true }),
      });
      
      // Create profile if not exists
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, key, { db: { schema: "tap_hub_project" } });
      
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("full_name", "Max Matronin")
        .maybeSingle();
      
      if (!existingProfile) {
        await supabase.from("profiles").insert({
          id: existing.id,
          full_name: "Max Matronin",
          email: "mmatronin@gmail.com",
          role: "admin",
          status: "Active",
          modules: ["Financials", "Payroll", "Sales Tax", "1099s", "Tax Returns", "Renditions"],
        });
      }
      
      return NextResponse.json({ 
        action: "updated_existing",
        user_id: existing.id,
        email: "mmatronin@gmail.com",
      });
    }
    
    return NextResponse.json({ 
      error: "Failed to create or find user",
      status: authResp.status,
      body: authData,
    }, { status: 500 });
  }

  // Create profile
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { db: { schema: "tap_hub_project" } });

  await supabase.from("profiles").insert({
    id: authData.id,
    full_name: "Max Matronin",
    email: "mmatronin@gmail.com",
    role: "admin",
    status: "Active",
    modules: ["Financials", "Payroll", "Sales Tax", "1099s", "Tax Returns", "Renditions"],
  });

  return NextResponse.json({ 
    action: "created",
    user_id: authData.id,
    email: "mmatronin@gmail.com",
  });
}
