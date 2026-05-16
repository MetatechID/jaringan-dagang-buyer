import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { revertCommit, BASE_BRANCH } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { sha: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.sha) return NextResponse.json({ error: "missing sha" }, { status: 400 });
  try {
    const revertSha = await revertCommit(BASE_BRANCH, body.sha, {
      name: admin.name || admin.email.split("@")[0],
      email: admin.email,
    });
    return NextResponse.json({ ok: true, revert_sha: revertSha });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
