import { notFound } from "next/navigation";
import Link from "next/link";

import { resolveBrand } from "@/lib/brands";
import { ProductCard } from "@/components/ProductCard";
import { AntarestarHero } from "@/components/AntarestarHero";

export default function BrandHomePage({ params }: { params: { brand: string } }) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();

  const isAntarestar = params.brand === "antarestar";

  return (
    <div>
      {/* Hero */}
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

      {/* Featured products */}
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
