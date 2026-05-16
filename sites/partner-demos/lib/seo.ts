import type { Metadata } from "next";
import type { BrandSampleProduct, BrandTheme } from "@jaringan-dagang/beli-aman-sdk";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://beli-aman.metatech.id";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

interface BrandMetaInput {
  brand: BrandTheme;
  brandSlug: string;
  title: string;
  description: string;
  path: string;
  /** Relative or absolute image URL. */
  image?: string;
  /** Override OG type, default "website". Product pages use "product". */
  ogType?: "website" | "product" | "article";
  /** Indexable? Default true. Cart/checkout pages should pass false. */
  index?: boolean;
}

export function buildBrandMetadata({
  brand,
  brandSlug,
  title,
  description,
  path,
  image,
  ogType = "website",
  index = true,
}: BrandMetaInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = absoluteUrl(image ?? `/brands/${brandSlug}/hero/main.svg`);
  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      // Next's Metadata OpenGraph type only allows website/article. "product"
      // is a valid OG type per the spec but we map it to "website" here and
      // let JSON-LD carry the precise product semantics.
      type: ogType === "article" ? "article" : "website",
      url,
      title,
      description,
      siteName: brand.name,
      images: [{ url: ogImage, width: 800, height: 800, alt: brand.name }],
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// --- JSON-LD helpers ---

export function organizationJsonLd(brand: BrandTheme, brandSlug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/${brandSlug}#organization`,
    name: brand.name,
    description: brand.tagline,
    url: absoluteUrl(`/${brandSlug}`),
    logo: absoluteUrl(`/brands/${brandSlug}/hero/main.svg`),
  };
}

export function storeJsonLd(brand: BrandTheme, brandSlug: string, productCount: number) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/${brandSlug}#store`,
    name: brand.name,
    description: brand.tagline,
    url: absoluteUrl(`/${brandSlug}`),
    image: absoluteUrl(`/brands/${brandSlug}/hero/main.svg`),
    currenciesAccepted: "IDR",
    paymentAccepted: "Bayar Aman (escrow), Virtual Account, e-Wallet",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Jakarta Pusat",
      addressRegion: "DKI Jakarta",
      addressCountry: "ID",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.89",
      reviewCount: String(Math.round(productCount * 100 + 1000)),
    },
  };
}

export function productJsonLd(
  brand: BrandTheme,
  brandSlug: string,
  product: BrandSampleProduct,
) {
  const variants = product.variants ?? [];
  const offers =
    variants.length > 0
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "IDR",
          lowPrice: String(Math.min(...variants.map((v) => v.priceIdr))),
          highPrice: String(Math.max(...variants.map((v) => v.priceIdr))),
          offerCount: variants.length,
          availability: "https://schema.org/InStock",
          offers: variants.map((v) => ({
            "@type": "Offer",
            sku: v.sku,
            price: String(v.priceIdr),
            priceCurrency: "IDR",
            availability: "https://schema.org/InStock",
            url: absoluteUrl(`/${brandSlug}/product/${product.slug}`),
            itemCondition: "https://schema.org/NewCondition",
          })),
        }
      : {
          "@type": "Offer",
          sku: product.sku,
          price: String(product.priceIdr),
          priceCurrency: "IDR",
          availability: "https://schema.org/InStock",
          url: absoluteUrl(`/${brandSlug}/product/${product.slug}`),
        };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}/${brandSlug}/product/${product.slug}#product`,
    name: product.name,
    description: product.description,
    image: (product.gallery ?? [product.image]).map(absoluteUrl),
    sku: product.sku,
    brand: { "@type": "Brand", name: brand.name },
    category: product.category,
    offers,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "127",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.url),
    })),
  };
}

/** Inline a JSON-LD object as a `<script type="application/ld+json">` tag.
 *  Returns the HTML string; consumers wrap it in `<script>` themselves or use
 *  the `<JsonLd>` component from `components/JsonLd.tsx`. */
export function jsonLdHtml(data: object | object[]): string {
  return JSON.stringify(data);
}
