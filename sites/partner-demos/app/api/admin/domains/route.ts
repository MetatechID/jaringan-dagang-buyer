import { NextResponse, type NextRequest } from "next/server";

import { resolveAdmin } from "@/lib/admin/auth";
import {
  addDomain,
  listDomains,
  removeDomain,
  verifyDomain,
} from "@/lib/admin/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const domains = await listDomains();
    return NextResponse.json({ domains });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { name?: string; action?: "verify" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  // Allow wildcards (*.beliaman.com) and bare hosts.
  if (!body.name || !/^(\*\.)?[a-zA-Z0-9.-]+$/.test(body.name)) {
    return NextResponse.json({ error: "invalid domain name" }, { status: 400 });
  }
  try {
    if (body.action === "verify") {
      const out = await verifyDomain(body.name);
      return NextResponse.json(out);
    }
    const out = await addDomain(body.name);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = resolveAdmin(req.headers.get("authorization"));
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });
  try {
    const out = await removeDomain(name);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
