import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { BrandSampleProduct } from "@jaringan-dagang/beli-aman-sdk";

import { resolveBrand } from "@/lib/brands";
import { ProductCard } from "@/components/ProductCard";
import { AntarestarHero } from "@/components/AntarestarHero";
import { SafiyaHero } from "@/components/SafiyaHero";
import { SafiyaHeroCarousel } from "@/components/SafiyaHeroCarousel";
import { SafiyaCategoryTiles } from "@/components/SafiyaCategoryTiles";
import { SafiyaProductRail } from "@/components/SafiyaProductRail";
import { JsonLd } from "@/components/JsonLd";
import {
  buildBrandMetadata,
  organizationJsonLd,
  storeJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: { params: { brand: string } }): Promise<Metadata> {
  const brand = resolveBrand(params.brand);
  if (!brand) return {};
  const productCount = brand.sampleProducts?.length ?? 0;
  const title =
    params.brand === "safiyafood"
      ? "Safiya Food · Kurma & Healthy Pantry Premium Indonesia"
      : `${brand.name} · ${brand.tagline ?? "Belanja Aman dengan Beli Aman"}`;
  const description =
    params.brand === "safiyafood"
      ? "Toko resmi Safiya Food — Kurma Sukari, Ajwa Madinah, Tunisia, muesli, madu murni, dan healthy pantry. Halal, BPOM RI, dilindungi escrow Beli Aman."
      : `${brand.tagline ?? brand.name}. ${productCount} produk halal, terverifikasi, dilindungi escrow Beli Aman.`;
  return buildBrandMetadata({
    brand,
    brandSlug: params.brand,
    title,
    description,
    path: `/${params.brand}`,
  });
}

const SAFIYA_CATEGORY_ORDER = [
  "Kurma",
  "Sereal & Granola",
  "Healthy Pantry",
  "Madu",
];

const SAFIYA_CATEGORY_COPY: Record<string, { tagline: string; anchor: string }> = {
  "Kurma": {
    tagline: "Dari Madinah, Tunisia, dan Saudi Arabia — premium dan halal.",
    anchor: "kurma",
  },
  "Sereal & Granola": {
    tagline: "Sarapan sehat, tinggi serat dan protein.",
    anchor: "sereal",
  },
  "Healthy Pantry": {
    tagline: "Pantry essentials untuk gaya hidup sehat.",
    anchor: "pantry",
  },
  "Madu": {
    tagline: "Madu murni & minyak alami — raw, tanpa campuran.",
    anchor: "madu",
  },
};

function groupByCategory(products: BrandSampleProduct[]): Record<string, BrandSampleProduct[]> {
  const grouped: Record<string, BrandSampleProduct[]> = {};
  for (const p of products) {
    const cat = p.category || "Other";
    (grouped[cat] ||= []).push(p);
  }
  return grouped;
}

export default function BrandHomePage({ params }: { params: { brand: string } }) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();

  const isAntarestar = params.brand === "antarestar";
  const isSafiya = params.brand === "safiyafood";

  if (isSafiya) {
    const grouped = groupByCategory(brand.sampleProducts || []);
    return (
      <div className="safiya-home">
        <JsonLd
          data={[
            organizationJsonLd(brand, params.brand),
            storeJsonLd(brand, params.brand, brand.sampleProducts?.length ?? 0),
            breadcrumbJsonLd([
              { name: "Beranda", url: "/" },
              { name: brand.name, url: `/${params.brand}` },
            ]),
          ]}
        />
        {/* @vibe:hero — small auto-rotating banner carousel; Sayurbox / Astro pattern. */}
        <SafiyaHeroCarousel />
        {/* @vibe:after-hero — category tile grid (5 icons). */}
        <SafiyaCategoryTiles />
        {SAFIYA_CATEGORY_ORDER.map((category) => {
          const items = grouped[category];
          if (!items || items.length === 0) return null;
          const copy = SAFIYA_CATEGORY_COPY[category] || { tagline: "", anchor: category.toLowerCase() };
          return (
            <SafiyaProductRail
              key={category}
              brandSlug={params.brand}
              title={category}
              tagline={copy.tagline}
              anchor={copy.anchor}
              items={items}
            />
          );
        })}

        {/* Trust footer band */}
        <section
          style={{
            background: brand.colors.primary,
            color: brand.colors.primaryFg,
            padding: "56px 24px",
            marginTop: 32,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 28,
              textAlign: "center",
            }}
          >
            {[
              { icon: "✦", title: "Authentic Premium", desc: "Langsung dari sumbernya — Madinah, Tunisia, dan Saudi Arabia." },
              { icon: "✦", title: "BPOM RI · Halal", desc: "Terdaftar BPOM dan halal MUI. Aman untuk seluruh keluarga." },
              { icon: "✦", title: "Beli Aman", desc: "Dana ditahan di escrow sampai pesanan Anda terima." },
              { icon: "✦", title: "Gratis Ongkir*", desc: "Untuk pesanan di atas Rp 150.000, area Jabodetabek." },
            ].map((item) => (
              <div key={item.title}>
                <div style={{ fontSize: 24, color: brand.colors.secondary, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontFamily: brand.fonts.heading, fontWeight: 600, fontSize: 17, marginBottom: 6 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.55 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      {isAntarestar ? (
        <AntarestarHero />
      ) : (
        <section
          style={{
            background:
              params.brand === "gendes"
                ? "linear-gradient(135deg, #FFB6D9 0%, #FFF5FA 100%)"
                : `linear-gradient(135deg, ${brand.colors.primary} 0%, ${brand.colors.secondary} 100%)`,
            color: brand.colors.primaryFg,
            padding: "64px 24px",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
            <h1
              style={{
                fontFamily: brand.fonts.heading,
                fontSize: "clamp(32px, 6vw, 56px)",
                fontWeight: 800,
                margin: 0,
                color: params.brand === "gendes" ? brand.colors.primary : brand.colors.primaryFg,
              }}
            >
              {brand.name}
            </h1>
            <p
              style={{
                marginTop: 12,
                fontSize: "clamp(14px, 2.5vw, 18px)",
                opacity: 0.85,
                color: params.brand === "gendes" ? brand.colors.text : brand.colors.primaryFg,
              }}
            >
              {brand.tagline}
            </p>
            <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: params.brand === "gendes" ? brand.colors.primary : "#fff",
                  backdropFilter: "blur(4px)",
                }}
              >
                🛡️ Dilindungi Beli Aman · Bayar dengan tenang
              </span>
            </div>
          </div>
        </section>
      )}

      <section style={{ padding: isAntarestar ? "40px 24px 64px" : "48px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: isAntarestar ? 28 : 24,
              paddingBottom: isAntarestar ? 14 : 0,
              borderBottom: isAntarestar ? "1px solid #EEE" : "none",
            }}
          >
            <h2
              style={{
                fontFamily: brand.fonts.heading,
                fontSize: isAntarestar ? 18 : 22,
                fontWeight: isAntarestar ? 500 : 700,
                textTransform: isAntarestar ? "uppercase" : "none",
                letterSpacing: isAntarestar ? "0.16em" : "normal",
                color: isAntarestar ? "#1F2937" : "inherit",
                margin: 0,
              }}
            >
              {isAntarestar ? "Shop All" : "Produk Unggulan"}
            </h2>
            <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
              {brand.sampleProducts?.length ?? 0} produk
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isAntarestar
                ? "repeat(auto-fill, minmax(280px, 1fr))"
                : "repeat(auto-fill, minmax(240px, 1fr))",
              gap: isAntarestar ? 28 : 20,
            }}
          >
            {(brand.sampleProducts || []).map((p) => (
              <ProductCard key={p.sku} brandSlug={params.brand} product={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
