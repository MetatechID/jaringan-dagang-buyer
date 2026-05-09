import { notFound } from "next/navigation";
import Link from "next/link";

import { resolveBrand } from "@/lib/brands";
import { ProductDetail } from "@/components/ProductDetail";

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
