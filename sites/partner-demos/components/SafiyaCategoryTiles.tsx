"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/analytics";

interface Tile {
  label: string;
  icon: string;
  href: string;
  bg: string;
}

const TILES: Tile[] = [
  { label: "Kurma",   icon: "🌴", href: "/safiyafood#kurma",  bg: "linear-gradient(135deg, #FBF6EC 0%, #F3E7CF 100%)" },
  { label: "Sereal",  icon: "🥣", href: "/safiyafood#sereal", bg: "linear-gradient(135deg, #FBF6EC 0%, #E9D9B5 100%)" },
  { label: "Pantry",  icon: "🌾", href: "/safiyafood#pantry", bg: "linear-gradient(135deg, #FBF6EC 0%, #F4E1C0 100%)" },
  { label: "Madu",    icon: "🍯", href: "/safiyafood#madu",   bg: "linear-gradient(135deg, #FFF7E0 0%, #E9D9B5 100%)" },
  { label: "Promo",   icon: "🌙", href: "/safiyafood/promo",  bg: "linear-gradient(135deg, #6B2C1A 0%, #2A1810 100%)" },
];

export function SafiyaCategoryTiles() {
  return (
    <section
      className="safiya-cat-section"
      style={{
        background: "var(--c-bg)",
        padding: "8px 0 4px",
      }}
      aria-label="Kategori"
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <h2
          className="safiya-cat-heading"
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--c-text-muted)",
            margin: "0 0 8px",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Belanja per kategori
        </h2>
        <div
          className="safiya-cat-tiles"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {TILES.map((t) => {
            const isPromo = t.href.endsWith("/promo");
            return (
              <Link
                key={t.label}
                href={t.href}
                onClick={() => trackEvent("category_tile_click", "safiyafood", { tile: t.label })}
                className="safiya-cat-tile"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "12px 6px 10px",
                  background: t.bg,
                  color: isPromo ? "#FBF6EC" : "var(--c-text)",
                  border: "1px solid rgba(15,23,42,0.06)",
                  borderRadius: 12,
                  textDecoration: "none",
                  textAlign: "center",
                  aspectRatio: "1.1 / 1",
                  maxWidth: 168,
                  width: "100%",
                  justifySelf: "stretch",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1 }}>{t.icon}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    color: isPromo ? "#FBF6EC" : "var(--c-primary)",
                  }}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .safiya-cat-tile {
            aspect-ratio: auto !important;
            min-height: 78px;
            max-width: none !important;
            padding: 10px 4px !important;
          }
        }
      `}</style>
    </section>
  );
}
