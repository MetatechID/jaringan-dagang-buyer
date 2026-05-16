import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { latestDeploymentForBranch } from "@/lib/admin/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const branch = req.nextUrl.searchParams.get("branch");
  if (!branch) return NextResponse.json({ error: "missing branch" }, { status: 400 });
  try {
    const dep = await latestDeploymentForBranch(branch);
    if (!dep) return NextResponse.json({ deployment: null });
    return NextResponse.json({
      deployment: {
        url: `https://${dep.url}`,
        ready: dep.ready,
        state: dep.state,
        inspector_url: dep.inspector_url,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
