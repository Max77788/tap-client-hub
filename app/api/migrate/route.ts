import { NextResponse } from "next/server";

const SQL = `
CREATE TABLE IF NOT EXISTS work_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_service_id uuid REFERENCES client_services(id) ON DELETE CASCADE,
  period text NOT NULL,
  stage text DEFAULT 'not_started',
  done_by text,
  done_at timestamptz,
  UNIQUE(client_service_id, period)
);
`;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    return NextResponse.json({ error: "Missing env" }, { status: 500 });
  }
  
  // Use the Supabase REST API (rpc) to call a built-in function
  // First try: see if we can execute SQL via the SQL API
  const resp = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({ query: SQL }),
  });
  
  const text = await resp.text();
  return NextResponse.json({
    status: resp.status,
    text: text.substring(0, 1000),
    url: url.substring(0, 20),
    keyPrefix: key.substring(0, 10),
  });
}
