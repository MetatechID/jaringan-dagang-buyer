"use client";

import { useState } from "react";
import { BeliAmanButton, useBeliAman, type BrandTheme } from "@jaringan-dagang/beli-aman-sdk";

import { formatIDR } from "@/lib/format";

type Product = NonNullable<BrandTheme["sampleProducts"]>[number];

export function ProductDetail({ brandSlug, product }: { brandSlug: string; product: Product }) {
  const { brandTheme } = useBeliAman();
  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];
  const [activeImg, setActiveImg] = useState<string>(gallery[0]);
  const [qty, setQty] = useState(1);

  const discount =
    product.compareAtPriceIdr && product.compareAtPriceIdr > product.priceIdr
      ? Math.round(((product.compareAtPriceIdr - product.priceIdr) / product.compareAtPriceIdr) * 100)
      : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
        gap: 32,
      }}
      className="pdp-grid"
    >
      <div>
        <div
          style={{
            background: "var(--c-surface)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
            aspectRatio: "1 / 1",
          }}
        >
          {activeImg ? (
            <img
              src={activeImg}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {gallery.map((g) => (
              <button
                key={g}
                onClick={() => setActiveImg(g)}
                style={{
                  width: 64,
                  height: 64,
                  padding: 0,
                  background: "var(--c-surface)",
                  border:
                    activeImg === g
                      ? `2px solid ${brandTheme.colors.primary}`
                      : "1px solid rgba(15, 23, 42, 0.10)",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                <img src={g} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <h1
          style={{
            fontFamily: brandTheme.fonts.heading,
            fontSize: "clamp(20px, 3vw, 28px)",
            fontWeight: 700,
            margin: 0,
            color: "var(--c-text)",
          }}
        >
          {product.name}
        </h1>
        {product.tagline ? (
          <p style={{ marginTop: 6, color: "var(--c-text-muted)", fontSize: 14 }}>
            {product.tagline}
          </p>
        ) : null}

        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16 }}>
          <span
            style={{
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: 800,
              color: "var(--c-primary)",
            }}
          >
            {formatIDR(product.priceIdr)}
          </span>
          {product.compareAtPriceIdr ? (
            <span style={{ color: "var(--c-text-muted)", textDecoration: "line-through", fontSize: 14 }}>
              {formatIDR(product.compareAtPriceIdr)}
            </span>
          ) : null}
          {discount ? (
            <span
              style={{
                background: "var(--c-accent)",
                color: "#fff",
                padding: "3px 10px",
                borderRadius: "var(--r-sm)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              -{discount}%
            </span>
          ) : null}
        </div>

        <p style={{ marginTop: 16, lineHeight: 1.55, color: "var(--c-text)" }}>
          {product.description}
        </p>

        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--c-text-muted)" }}>Jumlah</span>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid rgba(15, 23, 42, 0.16)",
              borderRadius: "var(--r-sm)",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={{ width: 36, height: 36, background: "transparent", border: 0, cursor: "pointer" }}
            >
              −
            </button>
            <span style={{ width: 36, textAlign: "center", fontWeight: 600 }}>{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              style={{ width: 36, height: 36, background: "transparent", border: 0, cursor: "pointer" }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Brand-native CTA — visually present so partners see "we don't replace your existing button" */}
          <button
            type="button"
            style={{
              padding: "12px 18px",
              background: brandTheme.colors.primary,
              color: brandTheme.colors.primaryFg,
              border: 0,
              borderRadius: "var(--r-md)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
            onClick={() => alert("Brand's native checkout — disabled in demo")}
          >
            {brandTheme.copy.addToCart}
          </button>

          {/* Beli Aman CTA — the focal point */}
          <BeliAmanButton
            brandSlug={brandSlug}
            items={[{ sku: product.sku, qty }]}
            fullWidth
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 12,
            background: "rgba(15, 118, 110, 0.06)",
            borderRadius: "var(--r-md)",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 18 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-primary)" }}>
              Dilindungi Beli Aman
            </div>
            <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>
              Dana ditahan di escrow sampai barang Anda terima. Otomatis dilepas D+3 atau saat Anda konfirmasi.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .pdp-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
