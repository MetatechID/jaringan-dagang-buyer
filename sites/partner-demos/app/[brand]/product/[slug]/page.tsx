import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { resolveBrand } from "@/lib/brands";
import { ProductDetail } from "@/components/ProductDetail";
import { JsonLd } from "@/components/JsonLd";
import {
  buildBrandMetadata,
  productJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { brand: string; slug: string };
}): Promise<Metadata> {
  const brand = resolveBrand(params.brand);
  if (!brand) return {};
  const product = brand.sampleProducts?.find((p) => p.slug === params.slug);
  if (!product) return {};
  return buildBrandMetadata({
    brand,
    brandSlug: params.brand,
    title: `${product.name} · ${brand.name}`,
    description: product.description ?? product.tagline ?? `${product.name} — premium dari ${brand.name}.`,
    path: `/${params.brand}/product/${product.slug}`,
    image: product.image,
    ogType: "product",
  });
}

export default function ProductPage({
  params,
}: {
  params: { brand: string; slug: string };
}) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();

  const product = brand.sampleProducts?.find((p) => p.slug === params.slug);
  if (!product) notFound();

  return (
    <div style={{ padding: "32px 24px" }}>
      <JsonLd
        data={[
          productJsonLd(brand, params.brand, product),
          breadcrumbJsonLd([
            { name: "Beranda", url: "/" },
            { name: brand.name, url: `/${params.brand}` },
            { name: product.name, url: `/${params.brand}/product/${product.slug}` },
          ]),
        ]}
      />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <nav style={{ marginBottom: 16, fontSize: 12, color: "var(--c-text-muted)" }}>
          <Link href={`/${params.brand}`} style={{ color: "inherit" }}>
            ← {brand.name}
          </Link>
          {" / "}
          <span>{product.name}</span>
        </nav>

        <ProductDetail brandSlug={params.brand} product={product} />
      </div>
    </div>
  );
}
