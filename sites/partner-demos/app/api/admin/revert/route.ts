import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import {
  BASE_BRANCH,
  REPO_PATH,
  ensurePr,
  revertCommit,
} from "@/lib/admin/github";
import { latestDeploymentForBranch } from "@/lib/admin/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Preview-first revert: commit the revert to a NEW vibe/revert-<sha7>
 *  draft branch, open a PR, and return the Vercel preview URL. The user
 *  reviews the rolled-back state in the iframe, then hits Publish to merge
 *  to main. No more force-pushing reverts straight to production. */
export async function POST(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { sha: string; tenant?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.sha) return NextResponse.json({ error: "missing sha" }, { status: 400 });
  const shortSha = body.sha.slice(0, 7);
  const tenant = (body.tenant || "safiyafood").toLowerCase();
  const branch = `vibe/revert-${shortSha}-${Date.now().toString(36)}`;
  try {
    const revertSha = await revertCommit(branch, body.sha, {
      name: admin.name || admin.email.split("@")[0],
      email: admin.email,
      tenant,
    });
    const pr = await ensurePr(
      branch,
      `Revert ${shortSha} via Vibe Editor`,
      `Revert requested by **${admin.name || admin.email}** for tenant \`${tenant}\`.\n\n<sub>Vibe-Tenant: ${tenant} · Vibe-By: ${admin.email}</sub>`,
      BASE_BRANCH,
    );
    // Give Vercel ~1.5s to register the deploy, then look it up.
    await new Promise((r) => setTimeout(r, 1500));
    let preview_url: string | null = null;
    try {
      const dep = await latestDeploymentForBranch(branch);
      if (dep) preview_url = `https://${dep.url}/safiyafood`;
    } catch {
      /* preview optional */
    }
    return NextResponse.json({
      ok: true,
      branch,
      revert_sha: revertSha,
      reverted_sha: body.sha,
      repo: REPO_PATH,
      pr: pr ? { number: pr.number, url: pr.html_url } : null,
      preview_url,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
