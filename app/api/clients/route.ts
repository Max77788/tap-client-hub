import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Client, ServiceKey } from "@/lib/types";
import { SERVICE_META } from "@/lib/data";

const CODE_TO_KEY: Record<string, ServiceKey> = {
  FIN: "financials",
  PR: "payroll",
  STX: "sales_tax",
  T9: "1099s",
  REND: "renditions",
  TAX: "tax_returns",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function GET() {
  const supabase = await createClient();

  // Fetch clients
  const { data: dbClients, error: clientsError } = await supabase
    .from("clients")
    .select("*")
    .eq("status", "active")
    .order("name");

  if (clientsError || !dbClients) {
    return NextResponse.json({ error: clientsError?.message }, { status: 500 });
  }

  // Fetch all client_services with service details
  const { data: dbServices, error: svcError } = await supabase
    .from("client_services")
    .select("*, service:services(*)")
    .eq("active", true);

  if (svcError) {
    return NextResponse.json({ error: svcError.message }, { status: 500 });
  }

  // Group services by client_id
  const servicesByClient: Record<string, any[]> = {};
  for (const cs of dbServices || []) {
    if (!servicesByClient[cs.client_id]) servicesByClient[cs.client_id] = [];
    servicesByClient[cs.client_id].push(cs);
  }

  // Map to Client type
  const clients: Client[] = dbClients.map((db: any) => {
    const clientServices = servicesByClient[db.id] || [];

    const services = clientServices.map((cs: any) => {
      const svcCode = cs.service?.code || "";
      const key = CODE_TO_KEY[svcCode] || "financials";
      const meta = SERVICE_META[key] || { label: svcCode };

      return {
        csId: cs.id,
        key,
        label: meta.label,
        enabled: true,
        frequency: cs.frequency || "Monthly",
        processor: cs.processor || "",
        assignedTo: cs.assigned_to || "",
        expectedAnnual: cs.expected_annual || undefined,
        months: Array(12).fill("lock"),
      };
    });

    // Fill in missing services as disabled
    const existingKeys = new Set(services.map((s) => s.key));
    for (const key of Object.keys(SERVICE_META) as ServiceKey[]) {
      if (!existingKeys.has(key)) {
        services.push({
          csId: "",
          key,
          label: SERVICE_META[key].label,
          enabled: false,
          frequency: "Monthly",
          processor: "",
          assignedTo: "",
          expectedAnnual: undefined,
          months: Array(12).fill("lock"),
        });
      }
    }

    return {
      id: db.id,
      cid: db.cid || `CID-${db.id.substring(0, 4)}`,
      name: db.name,
      type: db.type === "business" ? "Business" : "Personal",
      group: db.group_owner || "Unassigned",
      status: db.status || "active",
      city: db.city || "",
      state: db.state || "TX",
      email: "",
      phone: "",
      address: db.address || "",
      assignedStaff: clientServices[0]?.assigned_to || "Unassigned",
      services,
    };
  });

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: body.name,
      type: body.type?.toLowerCase() || "business",
      group_owner: body.group || null,
      status: body.status || "active",
      city: body.city || "",
      state: body.state || "TX",
      address: body.address || "",
      cid: body.cid || null,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ client: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
