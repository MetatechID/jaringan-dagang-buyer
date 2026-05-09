import { notFound } from "next/navigation";
import Link from "next/link";

import { resolveBrand } from "@/lib/brands";
import { ProductCard } from "@/components/ProductCard";

export default function BrandHomePage({ params }: { params: { brand: string } }) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          background:
            params.brand === "antarestar"
              ? "linear-gradient(135deg, #000 0%, #1a1a1a 100%)"
              : params.brand === "gendes"
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
              letterSpacing: params.brand === "antarestar" ? "0.04em" : "normal",
              textTransform: params.brand === "antarestar" ? "uppercase" : "none",
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

      {/* Featured products */}
      <section style={{ padding: "48px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
            <h2 style={{ fontFamily: brand.fonts.heading, fontSize: 22, fontWeight: 700, margin: 0 }}>
              Produk Unggulan
            </h2>
            <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
              {brand.sampleProducts?.length ?? 0} produk
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 20,
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
