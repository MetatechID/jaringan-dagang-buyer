import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { commitFiles, ensurePr, BASE_BRANCH, REPO_PATH } from "@/lib/admin/github";
import { checkWritablePath } from "@/lib/admin/sandbox";
import { latestDeploymentForBranch } from "@/lib/admin/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  branch: string;             // e.g. "vibe/2026-05-16-1730"
  title: string;              // commit message + PR title
  changes: { path: string; content: string; why?: string }[];
  tenant?: string;            // tenant slug; defaults to "safiyafood"
}

const TENANT_TRAILER = (tenant: string, email: string) =>
  `\n\nVibe-Tenant: ${tenant}\nVibe-By: ${email}`;

export async function POST(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body.branch || !body.changes?.length) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  for (const c of body.changes) {
    const check = checkWritablePath(c.path);
    if (!check.ok) {
      return NextResponse.json({ error: `path rejected: ${c.path} — ${check.reason}` }, { status: 400 });
    }
  }
  const tenant = (body.tenant || "safiyafood").toLowerCase();
  const commitMsg = `${body.title}${TENANT_TRAILER(tenant, admin.email)}`;
  try {
    const sha = await commitFiles(
      body.branch,
      commitMsg,
      body.changes,
      { name: admin.name || admin.email.split("@")[0], email: admin.email },
    );
    const prBody =
      `Vibe-code change by **${admin.name || admin.email}** for tenant \`${tenant}\`\n\n` +
      body.changes.map((c) => `- \`${c.path}\` — ${c.why ?? ""}`).join("\n") +
      `\n\n<sub>Vibe-Tenant: ${tenant} · Vibe-By: ${admin.email}</sub>`;
    const pr = await ensurePr(body.branch, body.title, prBody, BASE_BRANCH);
    // Try to resolve the actual Vercel preview URL via API. May be null
    // immediately after commit while Vercel is still queueing the build —
    // the client should poll /api/admin/preview?branch=... to refresh.
    let previewUrl: string | null = null;
    try {
      // Give Vercel a 1.5s head-start so the deployment is registered.
      await new Promise((r) => setTimeout(r, 1500));
      const dep = await latestDeploymentForBranch(body.branch, sha);
      if (dep) previewUrl = `https://${dep.url}/safiyafood`;
    } catch {
      /* preview is optional; PR link is enough */
    }
    return NextResponse.json({
      ok: true,
      branch: body.branch,
      sha,
      repo: REPO_PATH,
      pr: pr ? { number: pr.number, url: pr.html_url } : null,
      preview_url: previewUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
