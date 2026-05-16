import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { BASE_BRANCH, compareBranchAhead } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List the commits on a vibe branch that aren't on main yet — i.e., the
 *  exact "what's queued for production" set. Uses GitHub's compare API
 *  rather than a windowed listCommits filter so the count is always right
 *  even when main has many commits ahead of where the branch forked. */
export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const branch = req.nextUrl.searchParams.get("branch");
  if (!branch) return NextResponse.json({ error: "missing branch" }, { status: 400 });
  if (!branch.startsWith("vibe/")) {
    return NextResponse.json({ error: "only vibe/* branches" }, { status: 400 });
  }
  try {
    const commits = await compareBranchAhead(BASE_BRANCH, branch);
    return NextResponse.json({ branch, commits });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
