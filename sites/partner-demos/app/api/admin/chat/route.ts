import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import { chatTurn, type VibeChatMessage } from "@/lib/admin/claude";
import { readFile } from "@/lib/admin/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Files we always feed Claude as context — small enough to fit comfortably
// in the prompt-cached system block.
const CONTEXT_FILES = [
  "sites/partner-demos/lib/brands/safiyafood.ts",
  "sites/partner-demos/lib/brands/safiyafood-catalog.json",
  "sites/partner-demos/lib/safiyafood-bundles.ts",
  "sites/partner-demos/components/SafiyaHeroCarousel.tsx",
  "sites/partner-demos/components/SafiyaCategoryTiles.tsx",
  "sites/partner-demos/components/SafiyaProductRail.tsx",
  "sites/partner-demos/app/layout.tsx",
  "sites/partner-demos/app/[brand]/page.tsx",
  "sites/partner-demos/VIBE_SLOTS.md",
];

interface Body {
  conversation: VibeChatMessage[];
  branch?: string;  // optional; we read context from this branch's tip
}

export async function POST(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!Array.isArray(body.conversation) || body.conversation.length === 0) {
    return NextResponse.json({ error: "empty conversation" }, { status: 400 });
  }

  // Fetch current file content for each context file, in parallel.
  const branch = body.branch || "main";
  const fileContext = await Promise.all(
    CONTEXT_FILES.map(async (path) => ({
      path,
      content: (await readFile(path, branch)) ?? "",
    })),
  );

  try {
    const out = await chatTurn(body.conversation, fileContext);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
