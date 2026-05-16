import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import {
  BASE_BRANCH,
  extractVibeBy,
  isVibeCommitForTenant,
  listCommits,
} from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUNNEL_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/track$/, "/funnel")
  || "https://api.beli-aman.metatech.id/api/v1/analytics/funnel";

export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenant = (req.nextUrl.searchParams.get("tenant") || "safiyafood").toLowerCase();
  try {
    // Pull a generous slice so we have enough vibe commits left after filtering
    // out engine commits that touched the monorepo but aren't tenant changes.
    const all = await listCommits(BASE_BRANCH, 80);
    const tenantCommits = all
      .filter((c) => isVibeCommitForTenant(c, tenant))
      .slice(0, 20)
      .map((c) => ({
        ...c,
        vibe_by: extractVibeBy(c),
      }));

    let funnel: any = { versions: [] };
    try {
      const r = await fetch(`${FUNNEL_URL}?tenant_slug=${encodeURIComponent(tenant)}&days=30`, {
        cache: "no-store",
      });
      if (r.ok) funnel = await r.json();
    } catch {
      /* funnel is optional */
    }
    const funnelByShaPrefix = new Map<string, any>();
    for (const v of funnel.versions ?? []) {
      funnelByShaPrefix.set(String(v.version_sha).slice(0, 7), v);
    }
    const result = tenantCommits.map((c) => ({
      ...c,
      funnel: funnelByShaPrefix.get(c.sha.slice(0, 7)) || null,
    }));
    return NextResponse.json({ commits: result, base_branch: BASE_BRANCH, tenant });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
