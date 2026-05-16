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
      style={{
        background: "var(--c-bg)",
        padding: "20px 16px 4px",
      }}
      aria-label="Kategori"
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--c-primary)",
              margin: 0,
              letterSpacing: 0.3,
            }}
          >
            Belanja Berdasarkan Kategori
          </h2>
        </div>
        <div
          className="safiya-cat-tiles"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
          }}
        >
          {TILES.map((t) => {
            const isPromo = t.href.endsWith("/promo");
            return (
              <Link
                key={t.label}
                href={t.href}
                onClick={() => trackEvent("category_tile_click", "safiyafood", { tile: t.label })}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "14px 8px 12px",
                  background: t.bg,
                  color: isPromo ? "#FBF6EC" : "var(--c-text)",
                  border: "1px solid rgba(15,23,42,0.06)",
                  borderRadius: 14,
                  textDecoration: "none",
                  textAlign: "center",
                  minHeight: 86,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 28, lineHeight: 1 }}>{t.icon}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.4,
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
        @media (max-width: 480px) {
          .safiya-cat-tiles {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </section>
  );
}
