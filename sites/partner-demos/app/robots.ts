import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow checkout/cart routes — no content to index there.
        disallow: ["/auth/", "/orders/", "/admin", "*/cart"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
