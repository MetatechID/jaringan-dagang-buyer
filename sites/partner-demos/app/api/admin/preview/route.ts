import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { previewFromPrComment } from "@/lib/admin/github";
import { latestDeploymentForBranch } from "@/lib/admin/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const branch = req.nextUrl.searchParams.get("branch");
  const sha = req.nextUrl.searchParams.get("sha") ?? undefined;
  const debug = req.nextUrl.searchParams.get("debug") === "1";
  if (!branch) return NextResponse.json({ error: "missing branch" }, { status: 400 });
  try {
    // Primary: GitHub PR-comment scrape (works without a Vercel API token).
    // Fallback: Vercel API (which currently 403s — leaving in place for when
    // the token gets renewed).
    type Dep = { url: string; ready: boolean; state: string; inspector_url?: string };
    let dep: Dep | null = null;
    const prDiag: Record<string, any> = {};
    const pr = await previewFromPrComment(branch, "sites/partner-demos", prDiag);
    if (pr) dep = { url: pr.url, ready: pr.ready, state: pr.ready ? "READY" : "BUILDING" };
    if (!dep) {
      const v = await latestDeploymentForBranch(branch, sha);
      if (v) dep = { url: v.url, ready: v.ready, state: v.state, inspector_url: v.inspector_url };
    }
    const base: any = dep
      ? {
          deployment: {
            url: `https://${dep.url}`,
            ready: dep.ready,
            state: dep.state,
            inspector_url: dep.inspector_url,
          },
        }
      : { deployment: null };
    if (debug) {
      // Return what Vercel saw, no auth-token leak — just env shape and the
      // raw recent deploy refs to compare.
      const TOKEN = process.env.VERCEL_TOKEN || "";
      const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "";
      const TEAM_ID = process.env.VERCEL_TEAM_ID || "";
      base.debug = {
        has_token: !!TOKEN,
        project_id: PROJECT_ID,
        team_id: TEAM_ID || null,
        branch,
        sha,
        pr_diag: prDiag,
      };
      if (TOKEN && PROJECT_ID) {
        const u = new URL("https://api.vercel.com/v6/deployments");
        u.searchParams.set("projectId", PROJECT_ID);
        if (TEAM_ID) u.searchParams.set("teamId", TEAM_ID);
        u.searchParams.set("limit", "10");
        const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${TOKEN}` }, cache: "no-store" });
        base.debug.vercel_status = r.status;
        if (r.ok) {
          const j = await r.json() as any;
          base.debug.recent = (j.deployments ?? []).map((d: any) => ({
            url: d.url,
            state: d.readyState ?? d.state,
            gitSource_ref: d.gitSource?.ref,
            meta_ref: d.meta?.githubCommitRef,
            meta_branch: d.meta?.branch,
            meta_sha: d.meta?.githubCommitSha?.slice(0, 7),
          }));
        } else {
          base.debug.vercel_body = (await r.text()).slice(0, 400);
        }
      }
    }
    return NextResponse.json(base);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
