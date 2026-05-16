"use client";

import Link from "next/link";
import type { BrandSampleProduct } from "@jaringan-dagang/beli-aman-sdk";

import { formatIDR } from "@/lib/format";
import { useCart } from "@/lib/cart";

/** Horizontal-scrolling rail of product cards. Sayurbox / Astro pattern.
 *  On mobile it scroll-snaps; on desktop it's a normal flex row. */
export function SafiyaProductRail({
  brandSlug,
  title,
  tagline,
  anchor,
  items,
  seeAllHref,
}: {
  brandSlug: string;
  title: string;
  tagline?: string;
  anchor?: string;
  items: BrandSampleProduct[];
  seeAllHref?: string;
}) {
  return (
    <section
      id={anchor}
      style={{
        padding: "20px 0 12px",
        scrollMarginTop: 80,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontSize: "clamp(18px, 2.6vw, 24px)",
              fontWeight: 700,
              color: "var(--c-primary)",
              margin: 0,
              letterSpacing: 0.3,
            }}
          >
            {title}
          </h2>
          {seeAllHref ? (
            <Link
              href={seeAllHref}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--c-primary)",
                textDecoration: "none",
              }}
            >
              Lihat semua →
            </Link>
          ) : null}
        </div>
        {tagline ? (
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--c-text-muted)" }}>{tagline}</p>
        ) : null}
      </div>

      <div
        className="safiya-rail-scroller"
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "4px 16px 16px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {items.map((p) => (
          <RailCard key={p.slug} brandSlug={brandSlug} product={p} />
        ))}
      </div>
      <style>{`
        .safiya-rail-scroller::-webkit-scrollbar { display: none; }
        .safiya-rail-card { scroll-snap-align: start; }
      `}</style>
    </section>
  );
}

function RailCard({ brandSlug, product: p }: { brandSlug: string; product: BrandSampleProduct }) {
  const { add } = useCart(brandSlug);
  const discount =
    p.compareAtPriceIdr && p.compareAtPriceIdr > p.priceIdr
      ? Math.round(((p.compareAtPriceIdr - p.priceIdr) / p.compareAtPriceIdr) * 100)
      : null;
  const skuToAdd = p.variants?.[0]?.sku ?? p.sku;
  return (
    <div
      className="safiya-rail-card"
      style={{
        flex: "0 0 auto",
        width: 168,
        background: "var(--c-surface)",
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Link
        href={`/${brandSlug}/product/${p.slug}`}
        style={{
          display: "block",
          aspectRatio: "1 / 1",
          background: "var(--c-bg)",
          position: "relative",
        }}
      >
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {discount ? (
          <span
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "var(--c-accent)",
              color: "#fff",
              padding: "2px 7px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            -{discount}%
          </span>
        ) : null}
      </Link>
      <div style={{ padding: "10px 10px 12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <Link
          href={`/${brandSlug}/product/${p.slug}`}
          style={{
            textDecoration: "none",
            color: "var(--c-text)",
            fontWeight: 600,
            fontSize: 12.5,
            lineHeight: 1.32,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 33,
          }}
        >
          {p.name}
        </Link>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <strong style={{ color: "var(--c-primary)", fontSize: 14, fontWeight: 800 }}>
            {formatIDR(p.priceIdr)}
          </strong>
          {p.compareAtPriceIdr ? (
            <span style={{ color: "var(--c-text-muted)", fontSize: 11, textDecoration: "line-through" }}>
              {formatIDR(p.compareAtPriceIdr)}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Tambah ${p.name} ke keranjang`}
          onClick={(e) => {
            e.preventDefault();
            add(skuToAdd, 1);
          }}
          style={{
            marginTop: "auto",
            padding: "7px 10px",
            background: "var(--c-primary)",
            color: "var(--c-primary-fg)",
            border: 0,
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            letterSpacing: 0.2,
          }}
        >
          + Keranjang
        </button>
      </div>
    </div>
  );
}
