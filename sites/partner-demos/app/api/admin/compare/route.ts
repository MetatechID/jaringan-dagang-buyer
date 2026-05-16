import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUNNEL_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL?.replace(/\/track$/, "/funnel")
  || "https://api.beli-aman.metatech.id/api/v1/analytics/funnel";

interface VersionFunnel {
  version_sha: string;
  sessions: number;
  product_viewers: number;
  carters: number;
  checkouts: number;
  atc_rate: number;
  checkout_rate: number;
  atc_to_checkout_rate: number;
  first_seen?: string;
  last_seen?: string;
}

export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const a = req.nextUrl.searchParams.get("a");
  const b = req.nextUrl.searchParams.get("b");
  const days = req.nextUrl.searchParams.get("days") || "30";
  if (!a || !b) return NextResponse.json({ error: "need a + b query params" }, { status: 400 });

  try {
    const r = await fetch(`${FUNNEL_URL}?tenant_slug=safiyafood&days=${encodeURIComponent(days)}`, { cache: "no-store" });
    if (!r.ok) {
      return NextResponse.json({ error: `funnel fetch failed: ${r.status}` }, { status: 500 });
    }
    const data = (await r.json()) as { versions: VersionFunnel[] };

    const byPrefix = new Map<string, VersionFunnel>();
    for (const v of data.versions ?? []) byPrefix.set(String(v.version_sha).slice(0, 7), v);
    const va = byPrefix.get(a.slice(0, 7)) ?? null;
    const vb = byPrefix.get(b.slice(0, 7)) ?? null;

    const delta = va && vb ? {
      sessions: vb.sessions - va.sessions,
      atc_rate_pp: (vb.atc_rate - va.atc_rate) * 100,
      checkout_rate_pp: (vb.checkout_rate - va.checkout_rate) * 100,
      atc_to_checkout_rate_pp: (vb.atc_to_checkout_rate - va.atc_to_checkout_rate) * 100,
    } : null;

    return NextResponse.json({
      a: { sha: a, funnel: va },
      b: { sha: b, funnel: vb },
      delta,
      days: Number(days),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
