import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { discardDraft, listDraftBranches } from "@/lib/admin/github";
import { latestDeploymentForBranch } from "@/lib/admin/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const drafts = await listDraftBranches();
    // Best-effort preview URL per branch (cheap, parallel).
    const enriched = await Promise.all(
      drafts.map(async (d) => {
        let preview_url: string | null = null;
        try {
          const dep = await latestDeploymentForBranch(d.branch);
          if (dep) preview_url = `https://${dep.url}/safiyafood`;
        } catch {
          /* preview is optional */
        }
        return { ...d, preview_url };
      }),
    );
    return NextResponse.json({ drafts: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const branch = req.nextUrl.searchParams.get("branch");
  if (!branch) return NextResponse.json({ error: "missing branch" }, { status: 400 });
  if (!branch.startsWith("vibe/")) {
    return NextResponse.json({ error: "only vibe/* branches can be discarded" }, { status: 400 });
  }
  try {
    await discardDraft(branch);
    return NextResponse.json({ ok: true, branch });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
