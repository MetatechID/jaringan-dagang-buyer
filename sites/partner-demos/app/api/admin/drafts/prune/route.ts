import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { discardDraft, listDraftBranches } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_AGE_DAYS = Number(process.env.ADMIN_PRUNE_DAYS || 14);
const CRON_KEY = process.env.ADMIN_CRON_KEY || "";

interface DryRunReport {
  age_days: number;
  staleBranches: Array<{
    branch: string;
    last_commit_date: string;
    last_commit_message: string;
    age_days: number;
  }>;
  total: number;
}

interface PruneReport extends DryRunReport {
  pruned: string[];
  failed: Array<{ branch: string; error: string }>;
}

function ageDaysOf(iso: string): number {
  if (!iso) return Infinity;
  return (Date.now() - Date.parse(iso)) / 86_400_000;
}

async function buildStaleReport(days: number): Promise<DryRunReport> {
  const drafts = await listDraftBranches();
  const staleBranches = drafts
    .map((d) => ({ ...d, age_days: ageDaysOf(d.last_commit_date) }))
    .filter((d) => d.age_days >= days)
    .map((d) => ({
      branch: d.branch,
      last_commit_date: d.last_commit_date,
      last_commit_message: d.last_commit_message,
      age_days: Math.round(d.age_days * 10) / 10,
    }));
  return { age_days: days, staleBranches, total: staleBranches.length };
}

/** Dry-run — list the branches that *would* be pruned. */
export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const days = Number(req.nextUrl.searchParams.get("days") || DEFAULT_MAX_AGE_DAYS);
  try {
    const report = await buildStaleReport(days);
    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

/** Actually prune. Accepts either a logged-in admin OR an x-cron-key header
 *  whose value matches ADMIN_CRON_KEY — so a daily Vercel/external cron can
 *  call this without a Firebase session. */
export async function POST(req: NextRequest) {
  const cronHeader = req.headers.get("x-cron-key");
  const adminAuth = resolveAdmin(req.headers.get("authorization"));
  const cronAuth = CRON_KEY && cronHeader === CRON_KEY;
  if (!adminAuth && !cronAuth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const days = Number(req.nextUrl.searchParams.get("days") || DEFAULT_MAX_AGE_DAYS);
  try {
    const report = await buildStaleReport(days);
    const pruned: string[] = [];
    const failed: Array<{ branch: string; error: string }> = [];
    for (const s of report.staleBranches) {
      try {
        await discardDraft(s.branch);
        pruned.push(s.branch);
      } catch (e: any) {
        failed.push({ branch: s.branch, error: String(e?.message || e) });
      }
    }
    const out: PruneReport = { ...report, pruned, failed };
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
