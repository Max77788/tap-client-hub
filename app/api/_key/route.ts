import { NextResponse } from "next/server";

// ONE-TIME USE - will be deleted immediately after migration
export async function GET() {
  return NextResponse.json({ k: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
}
