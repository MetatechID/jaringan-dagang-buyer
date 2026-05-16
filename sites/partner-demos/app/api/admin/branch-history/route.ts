import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { BASE_BRANCH, extractVibeBy, listCommits } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List the commits on a vibe branch since it diverged from main. Used by the
 *  admin to show "what changed in this draft" — the chronological list of
 *  prompts the customer (or marketing) has applied. */
export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const branch = req.nextUrl.searchParams.get("branch");
  if (!branch) return NextResponse.json({ error: "missing branch" }, { status: 400 });
  if (!branch.startsWith("vibe/")) {
    return NextResponse.json({ error: "only vibe/* branches" }, { status: 400 });
  }
  try {
    const [branchCommits, baseCommits] = await Promise.all([
      listCommits(branch, 30),
      listCommits(BASE_BRANCH, 30),
    ]);
    const baseShas = new Set(baseCommits.map((c) => c.sha));
    const onlyOnBranch = branchCommits
      .filter((c) => !baseShas.has(c.sha))
      .map((c) => ({
        sha: c.sha,
        message: c.message,
        date: c.date,
        author: c.authorName,
        url: c.url,
        vibe_by: extractVibeBy(c),
      }));
    return NextResponse.json({ branch, commits: onlyOnBranch });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
