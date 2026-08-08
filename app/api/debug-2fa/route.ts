import { NextRequest, NextResponse } from "next/server";
import { sendCodeEmail } from "@/lib/email-2fa";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  
  const resendKey = process.env.RESEND_API_KEY;
  const hasKey = !!resendKey;
  const keyPreview = resendKey ? resendKey.substring(0, 10) + "..." : "MISSING";
  
  // Try sending a test code
  const sent = await sendCodeEmail(email || "mmatronin@gmail.com", "123456", "login");
  
  return NextResponse.json({
    hasResendKey: hasKey,
    keyPreview: keyPreview,
    emailSent: sent,
    from: "TAP Hub <noreply@andreashotel.com>",
    to: email || "mmatronin@gmail.com",
  });
}
