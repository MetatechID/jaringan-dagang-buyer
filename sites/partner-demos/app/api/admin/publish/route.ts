import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { ensurePr, mergePr } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { branch: string; title: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.branch) return NextResponse.json({ error: "missing branch" }, { status: 400 });
  try {
    const pr = await ensurePr(body.branch, body.title || `Publish ${body.branch}`, `Published by ${admin.email}`);
    if (!pr) return NextResponse.json({ error: "no diff to publish" }, { status: 400 });
    const sha = await mergePr(pr.number, body.title || `Publish ${body.branch}`);
    return NextResponse.json({ ok: true, sha, pr_number: pr.number });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
