import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ══════════════════════════════════════════════
// GET — list all credentials
// ══════════════════════════════════════════════
export async function GET() {
  const supabase = await createClient();

  const { data: credentials, error } = await supabase
    .from("credentials")
    .select("*")
    .order("group_label", { ascending: true })
    .order("portal", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!credentials) {
    return NextResponse.json([]);
  }

  // ── DB → VaultEntry mapping ──
  const entries = credentials.map((c: any) => ({
    id: c.id,
    site: c.portal || "",
    url: c.link_url || "",
    email: c.username || "",
    password: c.vault_ref || "",
    notes: c.notes || "",
    clientId: c.client_id || "",
    isBank: c.is_bank || false,
    groupLabel: c.group_label || "",
    purpose: c.purpose || "",
    additionalInfo01: c.additional_info_01 || "",
    additionalInfo02: c.additional_info_02 || "",
  }));

  return NextResponse.json(entries);
}

// ══════════════════════════════════════════════
// POST — create a new credential
// ══════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate required fields
  if (!body.site?.trim()) {
    return NextResponse.json({ error: "site is required" }, { status: 400 });
  }

  const { data: created, error } = await supabase
    .from("credentials")
    .insert({
      client_id: body.clientId || null,
      group_label: body.groupLabel || null,
      portal: body.site.trim(),
      username: body.email?.trim() || null,
      vault_ref: body.password?.trim() || null,
      is_bank: body.isBank || false,
      link_url: body.url?.trim() || null,
      notes: body.notes?.trim() || null,
      purpose: body.purpose?.trim() || null,
      additional_info_01: body.additionalInfo01?.trim() || null,
      additional_info_02: body.additionalInfo02?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map back to VaultEntry shape
  const entry = {
    id: created.id,
    site: created.portal || "",
    url: created.link_url || "",
    email: created.username || "",
    password: created.vault_ref || "",
    notes: created.notes || "",
    clientId: created.client_id || "",
    isBank: created.is_bank || false,
    groupLabel: created.group_label || "",
    purpose: created.purpose || "",
    additionalInfo01: created.additional_info_01 || "",
    additionalInfo02: created.additional_info_02 || "",
  };

  return NextResponse.json(entry, { status: 201 });
}

// ══════════════════════════════════════════════
// PUT — update a credential by id
// ══════════════════════════════════════════════
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (!body.site?.trim()) {
    return NextResponse.json({ error: "site is required" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("credentials")
    .update({
      client_id: body.clientId || null,
      group_label: body.groupLabel || null,
      portal: body.site.trim(),
      username: body.email?.trim() || null,
      vault_ref: body.password?.trim() || null,
      is_bank: body.isBank || false,
      link_url: body.url?.trim() || null,
      notes: body.notes?.trim() || null,
      purpose: body.purpose?.trim() || null,
      additional_info_01: body.additionalInfo01?.trim() || null,
      additional_info_02: body.additionalInfo02?.trim() || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  const entry = {
    id: updated.id,
    site: updated.portal || "",
    url: updated.link_url || "",
    email: updated.username || "",
    password: updated.vault_ref || "",
    notes: updated.notes || "",
    clientId: updated.client_id || "",
    isBank: updated.is_bank || false,
    groupLabel: updated.group_label || "",
    purpose: updated.purpose || "",
    additionalInfo01: updated.additional_info_01 || "",
    additionalInfo02: updated.additional_info_02 || "",
  };

  return NextResponse.json(entry);
}

// ══════════════════════════════════════════════
// DELETE — delete a credential by id (query param)
// ══════════════════════════════════════════════
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("credentials")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
