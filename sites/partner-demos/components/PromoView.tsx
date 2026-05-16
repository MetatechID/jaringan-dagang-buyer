"use client";

import Link from "next/link";
import { useState } from "react";

import { resolveBrand } from "@/lib/brands";
import { useCart } from "@/lib/cart";
import { formatIDR } from "@/lib/format";
import { lookupSku } from "@/lib/sku-lookup";
import {
  SAFIYA_RAMADHAN_BUNDLES,
  SAFIYA_RAMADHAN_FEATURED_SKUS,
  type RamadhanBundle,
} from "@/lib/safiyafood-bundles";

const TIER_PALETTE: Record<RamadhanBundle["tier"], { ring: string; pill: string; bg: string }> = {
  bronze: { ring: "#B87333", pill: "#7A4A0E", bg: "linear-gradient(135deg, #FBF6EC 0%, #F4E1C0 100%)" },
  silver: { ring: "#6B2C1A", pill: "#6B2C1A", bg: "linear-gradient(135deg, #FBF6EC 0%, #E9D9B5 100%)" },
  gold:   { ring: "#D4A24C", pill: "#5C3A0B", bg: "linear-gradient(135deg, #FFF7E0 0%, #E9D9B5 100%)" },
};

function BundleCard({
  brandSlug,
  bundle,
  onAdd,
  brandColors,
}: {
  brandSlug: string;
  bundle: RamadhanBundle;
  onAdd: () => void;
  brandColors: { primary: string; primaryFg: string; accent: string };
}) {
  const palette = TIER_PALETTE[bundle.tier];
  const saving = bundle.compareAtPriceIdr - bundle.priceIdr;
  const savingPct = Math.round((saving / bundle.compareAtPriceIdr) * 100);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAdd();
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <article
      style={{
        background: palette.bg,
        border: `2px solid ${palette.ring}`,
        borderRadius: 20,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
        boxShadow: "0 6px 24px rgba(107,44,26,0.10)",
      }}
    >
      {bundle.badge ? (
        <span
          style={{
            position: "absolute",
            top: -12,
            left: 20,
            background: palette.pill,
            color: "#fff",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          {bundle.badge}
        </span>
      ) : null}
      <div style={{ minHeight: 96 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: palette.pill,
          }}
        >
          {bundle.tier === "bronze" ? "Bronze" : bundle.tier === "silver" ? "Silver" : "Gold"} · Ramadhan 1447 H
        </span>
        <h3
          style={{
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            margin: "6px 0 4px",
            color: "#2A1810",
            lineHeight: 1.2,
          }}
        >
          {bundle.title}
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "#5A4A3A" }}>{bundle.subtitle}</p>
      </div>

      <div style={{ aspectRatio: "16 / 11", background: "rgba(255,255,255,0.6)", borderRadius: 12, overflow: "hidden", padding: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          src={bundle.imageSlot}
          alt={bundle.title}
          loading="lazy"
          decoding="async"
          style={{ maxWidth: "70%", maxHeight: "100%", objectFit: "contain" }}
        />
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#3A2820", minHeight: 82 }}>{bundle.description}</p>

      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#5A4A3A", lineHeight: 1.7, flex: 1 }}>
        {bundle.items.map((it) => (
          <li key={it.sku}>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{it.sku}</span> × {it.qty}
          </li>
        ))}
      </ul>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
        <strong style={{ fontSize: 26, fontWeight: 800, color: brandColors.primary }}>
          {formatIDR(bundle.priceIdr)}
        </strong>
        <span style={{ color: "#7A6856", fontSize: 13, textDecoration: "line-through" }}>
          {formatIDR(bundle.compareAtPriceIdr)}
        </span>
        <span
          style={{
            background: brandColors.accent,
            color: "#fff",
            padding: "3px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Hemat {savingPct}%
        </span>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        style={{
          padding: "14px 18px",
          background: added ? brandColors.accent : brandColors.primary,
          color: "#fff",
          border: 0,
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          letterSpacing: 0.3,
          transition: "background 0.15s ease",
        }}
      >
        {added ? "✓ Paket Ditambahkan" : "Tambah Paket ke Keranjang"}
      </button>
      {added ? (
        <Link
          href={`/${brandSlug}/cart`}
          style={{
            textAlign: "center",
            fontSize: 12,
            color: brandColors.primary,
            textDecoration: "underline",
            fontWeight: 600,
          }}
        >
          Lihat keranjang →
        </Link>
      ) : null}
    </article>
  );
}

export function PromoView({ brandSlug }: { brandSlug: string }) {
  const brand = resolveBrand(brandSlug);
  const { addMany, add } = useCart(brandSlug);

  if (!brand) return null;
  const products = brand.sampleProducts ?? [];
  const featured = SAFIYA_RAMADHAN_FEATURED_SKUS.map((sku) => lookupSku(products, sku)).filter(Boolean);

  return (
    <div>
      {/* ----- Hero ----- */}
      <section
        style={{
          position: "relative",
          background: "linear-gradient(135deg, #2A1810 0%, #5C2A18 55%, #7A4419 100%)",
          color: "#FBF6EC",
          overflow: "hidden",
        }}
      >
        {/* Crescent moon ornament */}
        <svg
          aria-hidden="true"
          viewBox="0 0 600 600"
          style={{
            position: "absolute",
            top: -80,
            right: -120,
            width: 540,
            height: 540,
            opacity: 0.18,
            pointerEvents: "none",
          }}
        >
          <defs>
            <radialGradient id="moonGrad" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#D4A24C" />
              <stop offset="100%" stopColor="#D4A24C" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="300" cy="300" r="260" fill="url(#moonGrad)" />
          <path d="M 200 80 A 220 220 0 1 0 200 520 A 180 180 0 1 1 200 80 Z" fill="#D4A24C" opacity="0.45" />
          <g fill="#D4A24C" opacity="0.7">
            <circle cx="430" cy="120" r="4" />
            <circle cx="500" cy="200" r="3" />
            <circle cx="450" cy="280" r="3" />
            <circle cx="510" cy="380" r="4" />
            <circle cx="380" cy="180" r="2" />
          </g>
        </svg>

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "80px 24px 96px",
            position: "relative",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
            gap: 48,
            alignItems: "center",
          }}
          className="promo-hero-grid"
        >
          <div>
            <span
              style={{
                display: "inline-block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#D4A24C",
                marginBottom: 14,
              }}
            >
              🌙 Promo Ramadhan 1447 H
            </span>
            <h1
              style={{
                fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                fontSize: "clamp(36px, 6vw, 64px)",
                fontWeight: 700,
                lineHeight: 1.05,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Hampers <em style={{ color: "#D4A24C", fontStyle: "italic" }}>Ramadhan Berkah</em>
            </h1>
            <p
              style={{
                marginTop: 18,
                fontSize: "clamp(14px, 1.7vw, 17px)",
                lineHeight: 1.6,
                color: "rgba(251,246,236,0.85)",
                maxWidth: 520,
              }}
            >
              Pilihan paket lengkap untuk meja iftar, sahur sekeluarga, atau bingkisan
              istimewa untuk kerabat & klien. Kurma premium Sukari & Ajwa Madinah, muesli sehat,
              madu murni — semua halal, BPOM RI, dan siap kirim.
            </p>
            <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <a
                href="#paket"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#D4A24C",
                  color: "#2A1810",
                  padding: "12px 22px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Lihat Paket Hampers →
              </a>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  background: "rgba(212,162,76,0.18)",
                  border: "1px solid rgba(212,162,76,0.45)",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#D4A24C",
                }}
              >
                🛡️ Dilindungi Beli Aman
              </span>
            </div>
          </div>

          <div
            style={{
              position: "relative",
              aspectRatio: "1 / 1",
              maxHeight: 440,
              justifySelf: "center",
              width: "100%",
              maxWidth: 440,
            }}
          >
            <img
              src="/brands/safiyafood/hero/main.svg"
              alt="Safiya Food Ramadhan hampers"
              loading="eager"
              decoding="async"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.35))",
              }}
            />
          </div>
        </div>
      </section>

      {/* ----- Promo strip ----- */}
      <section
        style={{
          background: brand.colors.secondary,
          color: brand.colors.primary,
          padding: "16px 24px",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        ⭐ Gratis ongkir Jabodetabek di atas Rp 250.000 · 🛡️ Bayar Aman escrow · 🚚 Kurir pilihan: JNE · J&T · SiCepat · AnterAja · TIKI
      </section>

      {/* ----- Bundles ----- */}
      <section id="paket" style={{ padding: "64px 24px", scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: brand.colors.secondary,
              }}
            >
              Paket Hampers
            </span>
            <h2
              style={{
                fontFamily: brand.fonts.heading,
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 700,
                color: brand.colors.primary,
                margin: "6px 0",
              }}
            >
              Tiga paket untuk setiap kebutuhan
            </h2>
            <p style={{ color: "var(--c-text-muted)", margin: 0, fontSize: 14 }}>
              Tambah paket lengkap ke keranjang dalam satu klik.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {SAFIYA_RAMADHAN_BUNDLES.map((bundle) => (
              <BundleCard
                key={bundle.id}
                brandSlug={brandSlug}
                bundle={bundle}
                onAdd={() => addMany(bundle.items.map((it) => ({ sku: it.sku, qty: it.qty })))}
                brandColors={brand.colors}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ----- Individual featured products ----- */}
      <section
        style={{
          padding: "56px 24px 96px",
          background: brand.colors.surface,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: brand.colors.secondary,
              }}
            >
              Pilihan Tambahan
            </span>
            <h2
              style={{
                fontFamily: brand.fonts.heading,
                fontSize: "clamp(24px, 3vw, 32px)",
                fontWeight: 700,
                color: brand.colors.primary,
                margin: "6px 0",
              }}
            >
              Atau tambah satuan sesuai selera
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 18,
            }}
          >
            {featured.map((m) => (
              <FeaturedCard
                key={m!.variant?.sku ?? m!.product.sku}
                brandSlug={brandSlug}
                match={m!}
                onAdd={() => add(m!.variant?.sku ?? m!.product.sku, 1)}
                brandColors={brand.colors}
              />
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link
              href={`/${brandSlug}/cart`}
              style={{
                display: "inline-block",
                padding: "14px 26px",
                background: brand.colors.primary,
                color: brand.colors.primaryFg,
                borderRadius: 999,
                fontWeight: 700,
                textDecoration: "none",
                fontSize: 14,
                letterSpacing: 0.4,
              }}
            >
              🛒 Lanjut ke Keranjang
            </Link>
          </div>
        </div>
      </section>
      <style>{`
        @media (max-width: 880px) {
          .promo-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
            padding: 56px 24px 64px !important;
          }
        }
      `}</style>
    </div>
  );
}

function FeaturedCard({
  brandSlug,
  match,
  onAdd,
  brandColors,
}: {
  brandSlug: string;
  match: NonNullable<ReturnType<typeof lookupSku>>;
  onAdd: () => void;
  brandColors: { primary: string; primaryFg: string; accent: string };
}) {
  const [added, setAdded] = useState(false);
  const handle = () => {
    onAdd();
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };
  const sku = match.variant?.sku ?? match.product.sku;
  const discount =
    match.compareAtIdr && match.compareAtIdr > match.unitPriceIdr
      ? Math.round(((match.compareAtIdr - match.unitPriceIdr) / match.compareAtIdr) * 100)
      : null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(15,23,42,0.08)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Link
        href={`/${brandSlug}/product/${match.product.slug}`}
        style={{ display: "block", aspectRatio: "1 / 1", background: "#FBF6EC", position: "relative" }}
      >
        <img
          src={match.image}
          alt={match.product.name}
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
              background: brandColors.accent,
              color: "#fff",
              padding: "3px 9px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            -{discount}%
          </span>
        ) : null}
      </Link>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35, color: "#2A1810" }}>
            {match.product.name}
          </div>
          {match.variant ? (
            <div style={{ marginTop: 2, fontSize: 11, color: "#7A6856" }}>
              Ukuran <strong>{match.variant.label}</strong>{" "}
              · <span style={{ fontFamily: "ui-monospace, monospace" }}>{sku}</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ color: brandColors.primary, fontSize: 15, fontWeight: 800 }}>
            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(match.unitPriceIdr)}
          </strong>
          {match.compareAtIdr ? (
            <span style={{ color: "#7A6856", textDecoration: "line-through", fontSize: 11 }}>
              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(match.compareAtIdr)}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handle}
          style={{
            marginTop: "auto",
            padding: "10px 12px",
            background: added ? brandColors.accent : brandColors.primary,
            color: "#fff",
            border: 0,
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          {added ? "✓ Ditambahkan" : "+ Tambah ke Keranjang"}
        </button>
      </div>
    </div>
  );
}
