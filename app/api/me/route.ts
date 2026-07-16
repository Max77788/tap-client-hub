import { NextResponse } from "next/server";
import { resolveAccessIdentity } from "@/lib/access-server";

export const dynamic = "force-dynamic";

/** The only client-facing authority for role and module access. */
export async function GET() {
  const identity = await resolveAccessIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized", role: "staff", modules: [], canManageUsers: false }, { status: 401 });
  }

  return NextResponse.json({
    id: identity.id,
    email: identity.email,
    name: identity.name,
    role: identity.role,
    modules: identity.modules,
    canManageUsers: identity.canManageUsers,
  });
}
