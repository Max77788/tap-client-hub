import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ k: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
}
