import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveBrand } from "@/lib/brands";
import { CartView } from "@/components/CartView";
import { buildBrandMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: { params: { brand: string } }): Promise<Metadata> {
  const brand = resolveBrand(params.brand);
  if (!brand) return {};
  return buildBrandMetadata({
    brand,
    brandSlug: params.brand,
    title: `Keranjang · ${brand.name}`,
    description: `Tinjau pesanan Anda di ${brand.name} dan bayar dengan escrow Beli Aman.`,
    path: `/${params.brand}/cart`,
    index: false,
  });
}

export default function CartPage({ params }: { params: { brand: string } }) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();
  return <CartView brandSlug={params.brand} />;
}
