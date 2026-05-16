import { NextRequest, NextResponse } from "next/server";

/** Subdomain → tenant rewrite.
 *
 *  safiya.beliaman.com/                  → /safiyafood/
 *  gendes.beliaman.com/product/foo       → /gendes/product/foo
 *
 *  The apex (beliaman.com) and the marketing/demo host
 *  (beli-aman.metatech.id) are unaffected. Subdomains on
 *  beli-aman-storefronts-*.vercel.app are also untouched so admin
 *  preview deploys keep working.
 *
 *  Slug aliases let us map a brand subdomain (safiya) to a different
 *  internal route segment (safiyafood) without renaming files. */

const ROOT_DOMAIN = "beliaman.com";

const SLUG_ALIASES: Record<string, string> = {
  safiya: "safiyafood",
  // Add more tenants here as they onboard:
  // gendes: "gendes",
  // antarestar: "antarestar",
};

function tenantFromHost(host: string | null): string | null {
  if (!host) return null;
  const lower = host.toLowerCase().split(":")[0];
  if (!lower.endsWith(`.${ROOT_DOMAIN}`)) return null;
  if (lower === ROOT_DOMAIN) return null;
  const sub = lower.slice(0, -1 * (ROOT_DOMAIN.length + 1));
  // Bail on multi-level subdomains (e.g., `admin.foo.beliaman.com`) and on
  // 'www', 'admin' — those are reserved.
  if (sub.includes(".") || sub === "www" || sub === "admin") return null;
  return SLUG_ALIASES[sub] ?? sub;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const tenant = tenantFromHost(host);
  if (!tenant) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  // Don't rewrite asset/api/internal paths.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/brands/") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }
  // Already-prefixed paths are a no-op.
  if (pathname === `/${tenant}` || pathname.startsWith(`/${tenant}/`)) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = `/${tenant}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Run on every path except static asset chunks Next already optimizes.
    "/((?!_next/static|_next/image|favicon.ico|brands/).*)",
  ],
};
