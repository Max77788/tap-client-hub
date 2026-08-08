/**
 * 2FA email code helpers.
 * Functions accept a supabase client rather than creating their own.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const RESEND_FROM = "TAP Hub <noreply@andreashotel.com>";

/**
 * Generate a 6-digit code and store it on the user's profile.
 */
export async function generateAndStoreCode(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<{ code: string; ok: boolean; error?: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const { error } = await supabase
    .from("profiles")
    .update({
      email_2fa_code: code,
      email_2fa_code_expires_at: expiresAt,
    })
    .eq("id", userId);

  if (error) {
    console.error("generateAndStoreCode error:", error.message);
    return { code, ok: false, error: error.message };
  }

  return { code, ok: true };
}

/**
 * Send the code to the user's email via Resend.
 */
export async function sendCodeEmail(
  toEmail: string,
  code: string,
  purpose: "setup" | "login" | "disable",
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("RESEND_API_KEY not set — 2FA email would not be sent");
    return false;
  }

  const subject =
    purpose === "setup"
      ? "Your TAP Hub verification code"
      : purpose === "disable"
        ? "Confirm disabling 2FA on TAP Hub"
        : "Your TAP Hub sign-in code";

  const html = `
    <div style="font-family: 'Public Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #15803d; margin-bottom: 8px;">TAP Hub</h2>
      <p style="color: #666; font-size: 14px;">
        ${purpose === "setup" ? "Use this code to enable two-factor authentication:" : purpose === "disable" ? "Use this code to disable two-factor authentication:" : "Use this code to complete your sign-in:"}
      </p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #15803d;">${code}</span>
      </div>
      <p style="color: #999; font-size: 12px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #bbb; font-size: 11px;">TAP Associates, LLC &mdash; Client Hub</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "User-Agent": "TAP-Hub/1.0",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: toEmail,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to send email:", e);
    return false;
  }
}

/**
 * Verify a code against the stored one (within expiry).
 */
export async function verifyCode(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  code: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_2fa_code, email_2fa_code_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.email_2fa_code || !profile?.email_2fa_code_expires_at) {
    console.warn("verifyCode: no code or expiry found for user", userId);
    return false;
  }

  if (new Date(profile.email_2fa_code_expires_at) < new Date()) {
    console.warn("verifyCode: code expired for user", userId);
    return false;
  }

  const stored = String(profile.email_2fa_code).trim();
  const input = String(code).trim();
  const match = stored === input;
  if (!match) {
    console.warn(`verifyCode: mismatch for user ${userId} — stored="${stored}" vs input="${input}"`);
  }
  return match;
}
