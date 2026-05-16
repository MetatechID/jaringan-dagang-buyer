"use client";

import Link from "next/link";
import type { BrandTheme } from "@jaringan-dagang/beli-aman-sdk";

import { formatIDR } from "@/lib/format";

type Product = NonNullable<BrandTheme["sampleProducts"]>[number];

export function ProductCard({ brandSlug, product }: { brandSlug: string; product: Product }) {
  const discount =
    product.compareAtPriceIdr && product.compareAtPriceIdr > product.priceIdr
      ? Math.round(((product.compareAtPriceIdr - product.priceIdr) / product.compareAtPriceIdr) * 100)
      : null;

  return (
    <Link
      href={`/${brandSlug}/product/${product.slug}`}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        background: "var(--c-bg)",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          background: "var(--c-surface)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            width={400}
            height={400}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        {discount ? (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "var(--c-accent)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: "var(--r-sm)",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            -{discount}%
          </span>
        ) : null}
      </div>
      <div style={{ padding: 14 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "var(--c-text)",
          }}
        >
          {product.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--c-primary)" }}>
            {formatIDR(product.priceIdr)}
          </span>
          {product.compareAtPriceIdr ? (
            <span style={{ fontSize: 12, color: "var(--c-text-muted)", textDecoration: "line-through" }}>
              {formatIDR(product.compareAtPriceIdr)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
