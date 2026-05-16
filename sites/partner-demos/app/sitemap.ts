import type { MetadataRoute } from "next";

import { BRAND_SLUGS, STATIC_BRANDS } from "@/lib/brands";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
  ];

  for (const slug of BRAND_SLUGS) {
    const brand = STATIC_BRANDS[slug];
    if (!brand) continue;
    entries.push({
      url: `${SITE_URL}/${slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    });
    // Promo is only meaningful for Safiya at the moment but the route exists
    // for all brands, so we include it.
    entries.push({
      url: `${SITE_URL}/${slug}/promo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: slug === "safiyafood" ? 0.85 : 0.5,
    });
    for (const product of brand.sampleProducts ?? []) {
      entries.push({
        url: `${SITE_URL}/${slug}/product/${product.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
