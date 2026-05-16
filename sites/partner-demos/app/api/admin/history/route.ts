import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { listCommits, BASE_BRANCH } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUNNEL_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/track$/, "/funnel")
  || "https://api.beli-aman.metatech.id/api/v1/analytics/funnel";

export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const commits = await listCommits(BASE_BRANCH, 20);
    // Pull funnel per version_sha and zip onto the commit list. The funnel
    // endpoint is keyed by tenant_slug — single tenant for v0.
    let funnel: any = { versions: [] };
    try {
      const r = await fetch(`${FUNNEL_URL}?tenant_slug=safiyafood&days=14`, { cache: "no-store" });
      if (r.ok) funnel = await r.json();
    } catch {
      /* funnel optional */
    }
    const funnelByShaPrefix = new Map<string, any>();
    for (const v of funnel.versions ?? []) {
      funnelByShaPrefix.set(String(v.version_sha).slice(0, 7), v);
    }
    const result = commits.map((c) => ({
      ...c,
      funnel: funnelByShaPrefix.get(c.sha.slice(0, 7)) || null,
    }));
    return NextResponse.json({ commits: result, base_branch: BASE_BRANCH });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
