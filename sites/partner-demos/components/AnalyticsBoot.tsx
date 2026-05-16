"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

/** Mounted once per brand layout. Tracks a `page_view` whenever the route
 *  changes — including soft navigations between PDPs / cart / promo.
 *
 *  Deliberately avoids `useSearchParams()` (which forces dynamic rendering
 *  and bails out of static prerender) — we read window.location.search in
 *  the effect instead, which is client-only anyway. */
export function AnalyticsBoot({ brandSlug }: { brandSlug: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const page = classifyPath(brandSlug, pathname);
    const q =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("q")
        : null;
    trackEvent("page_view", brandSlug, {
      page,
      path: pathname,
      q: q || undefined,
    });
    if (page === "pdp") {
      const slug = pathname.split("/").slice(-1)[0];
      trackEvent("product_view", brandSlug, { product_slug: slug });
    }
    if (page === "cart") {
      trackEvent("view_cart", brandSlug);
    }
    if (page === "promo") {
      trackEvent("view_promo", brandSlug);
    }
  }, [brandSlug, pathname]);
  return null;
}

function classifyPath(brandSlug: string, pathname: string): string {
  const home = `/${brandSlug}`;
  if (pathname === home) return "home";
  if (pathname.startsWith(`${home}/product/`)) return "pdp";
  if (pathname === `${home}/cart`) return "cart";
  if (pathname === `${home}/promo`) return "promo";
  return "other";
}
