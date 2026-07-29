import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireClientDataEditAccess } from "@/lib/access-server";

export const dynamic = "force-dynamic";

type ContactInput = {
  clientId?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  isPrimary?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const [{ data: contacts, error: contactsError }, { data: clients, error: clientsError }] = await Promise.all([
      admin
        .from("contacts")
        .select("id, client_id, name, email, phone, is_primary, client:clients!inner(id, name, cid, type, group_name, group_owner, address, city, state, zip, status)")
        .eq("clients.status", "active")
        .order("name", { ascending: true }),
      admin
        .from("clients")
        .select("id, name, cid")
        .eq("status", "active")
        .order("name", { ascending: true }),
    ]);

    if (contactsError) throw contactsError;
    if (clientsError) throw clientsError;

    return NextResponse.json({ contacts: contacts || [], clients: clients || [] }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load contacts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireClientDataEditAccess();
  if (access.status) return NextResponse.json({ error: access.status === 401 ? "Unauthorized" : "Forbidden" }, { status: access.status });

  try {
    const body = await request.json() as ContactInput;
    const clientId = text(body.clientId);
    const name = text(body.name);
    const email = text(body.email);
    const phone = text(body.phone);
    const isPrimary = body.isPrimary === true;

    if (!clientId || !name) return NextResponse.json({ error: "Client and contact name are required." }, { status: 400 });

    const admin = createAdminClient();
    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("status", "active")
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) return NextResponse.json({ error: "Select a current active TAP client." }, { status: 400 });

    const { data, error } = await admin
      .from("contacts")
      .insert({ client_id: clientId, name, email: email || null, phone: phone || null, is_primary: isPrimary })
      .select("id, client_id, name, email, phone, is_primary")
      .single();
    if (error) throw error;

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add contact" }, { status: 500 });
  }
}
