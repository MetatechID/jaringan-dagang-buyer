import { NextResponse, type NextRequest } from "next/server";

import { resolveAdminWithReason } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns what the auth layer saw — useful to debug "I signed in but still
 *  unauthorized" by showing the email claim from the token + the allowlist. */
export async function GET(req: NextRequest) {
  const out = resolveAdminWithReason(req.headers.get("authorization"));
  return NextResponse.json({
    ok: out.ok,
    reason: out.reason ?? null,
    seen_email: out.seenEmail ?? null,
    allowlist: out.allowlist ?? null,
    identity: out.identity,
  });
}
