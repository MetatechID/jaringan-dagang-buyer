import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveBrand } from "@/lib/brands";
import { PromoView } from "@/components/PromoView";
import { JsonLd } from "@/components/JsonLd";
import { buildBrandMetadata, breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import { SAFIYA_RAMADHAN_BUNDLES } from "@/lib/safiyafood-bundles";

export async function generateMetadata({
  params,
}: { params: { brand: string } }): Promise<Metadata> {
  const brand = resolveBrand(params.brand);
  if (!brand) return {};
  if (params.brand !== "safiyafood") {
    return buildBrandMetadata({
      brand,
      brandSlug: params.brand,
      title: `Promo · ${brand.name}`,
      description: "Tidak ada promo aktif saat ini.",
      path: `/${params.brand}/promo`,
    });
  }
  return buildBrandMetadata({
    brand,
    brandSlug: params.brand,
    title: "Hampers Ramadhan Berkah · Safiya Food",
    description:
      "Paket Hampers Ramadhan 1447 H dari Safiya Food — Kurma Sukari & Ajwa Madinah, muesli sehat, madu murni. Pilihan paket Bronze · Silver · Gold untuk keluarga, klien, dan bingkisan istimewa. Halal, BPOM RI, dilindungi escrow Beli Aman.",
    path: `/${params.brand}/promo`,
  });
}

function bundleListJsonLd(brandSlug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Hampers Ramadhan 1447 H · Safiya Food",
    url: `https://beli-aman.metatech.id/${brandSlug}/promo`,
    itemListElement: SAFIYA_RAMADHAN_BUNDLES.map((b, i) => ({
      "@type": "Offer",
      position: i + 1,
      name: b.title,
      description: b.description,
      price: String(b.priceIdr),
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
    })),
  };
}

export default function PromoPage({ params }: { params: { brand: string } }) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();
  if (params.brand !== "safiyafood") {
    return (
      <div style={{ padding: "64px 24px", textAlign: "center" }}>
        <h1 style={{ fontFamily: brand.fonts.heading }}>{brand.name}</h1>
        <p style={{ color: "var(--c-text-muted)" }}>Tidak ada promo aktif saat ini.</p>
      </div>
    );
  }
  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(brand, params.brand),
          bundleListJsonLd(params.brand),
          breadcrumbJsonLd([
            { name: "Beranda", url: "/" },
            { name: brand.name, url: `/${params.brand}` },
            { name: "Hampers Ramadhan", url: `/${params.brand}/promo` },
          ]),
        ]}
      />
      <PromoView brandSlug={params.brand} />
    </>
  );
}
