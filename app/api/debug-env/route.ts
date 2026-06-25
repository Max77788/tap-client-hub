import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 25) + "...")
    : "NOT SET";
  return NextResponse.json({
    url_prefix: url.substring(0, 40),
    url_len: url.length,
    key_prefix: key,
    has_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "NOT SET",
  });
}
