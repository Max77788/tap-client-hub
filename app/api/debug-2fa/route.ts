import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCodeEmail } from "@/lib/email-2fa";

export async function POST(req: NextRequest) {
  const { email, userId } = await req.json().catch(() => ({ email: "mmatronin@gmail.com" }));
  
  const resendKey = process.env.RESEND_API_KEY;
  const hasKey = !!resendKey;
  const keyPreview = resendKey ? resendKey.substring(0, 10) + "..." : "MISSING";
  
  const results: Record<string, any> = {
    hasResendKey: hasKey,
    keyPreview,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING (using anon fallback)",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING",
  };

  // If we have a userId, try to look up the profile (simulating challenge route)
  if (userId) {
    try {
      const admin = createAdminClient();
      const { data: profile, error } = await admin
        .from("profiles")
        .select("id, email, email_2fa_enabled, full_name")
        .eq("id", userId)
        .maybeSingle();
      
      results.profileLookup = {
        found: !!profile,
        error: error?.message,
        email: profile?.email,
        email_2fa_enabled: profile?.email_2fa_enabled,
        full_name: profile?.full_name,
      };
      
      // If profile found and 2FA enabled, actually send the code
      if (profile?.email_2fa_enabled && profile.email) {
        const sent = await sendCodeEmail(profile.email, "123456", "login");
        results.emailSent = sent;
        results.sentTo = profile.email;
      } else {
        results.emailSent = false;
        results.reason = "Profile not found or 2FA not enabled";
      }
    } catch (e: any) {
      results.profileLookupError = e.message;
    }
  } else {
    // Just test email sending directly
    const sent = await sendCodeEmail(email || "mmatronin@gmail.com", "123456", "login");
    results.emailSent = sent;
    results.sentTo = email || "mmatronin@gmail.com";
  }
  
  return NextResponse.json(results);
}
