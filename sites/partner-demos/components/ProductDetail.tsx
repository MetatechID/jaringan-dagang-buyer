"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useBeliAman, type BrandTheme, type BrandProductVariant } from "@jaringan-dagang/beli-aman-sdk";

import { formatIDR } from "@/lib/format";
import { useCart } from "@/lib/cart";

type Product = NonNullable<BrandTheme["sampleProducts"]>[number];

export function ProductDetail({ brandSlug, product }: { brandSlug: string; product: Product }) {
  const { brandTheme } = useBeliAman();

  const hasVariants = !!product.variants && product.variants.length > 0;

  // ONE unified gallery for the whole product — parent views first, then each
  // variant's primary image. Picking a variant doesn't replace this list; it
  // just moves the selection to the variant's slot (`imageIndex`).
  const gallery: string[] = useMemo(() => {
    if (product.gallery && product.gallery.length > 0) return product.gallery;
    return product.image ? [product.image] : [];
  }, [product.gallery, product.image]);

  const [selectedSku, setSelectedSku] = useState<string>(
    hasVariants ? product.variants![0].sku : product.sku,
  );

  const selectedVariant: BrandProductVariant | null = useMemo(() => {
    if (!hasVariants) return null;
    return product.variants!.find((v) => v.sku === selectedSku) ?? product.variants![0];
  }, [hasVariants, product.variants, selectedSku]);

  const activePriceIdr = selectedVariant?.priceIdr ?? product.priceIdr;
  const activeCompareIdr = selectedVariant?.compareAtPriceIdr ?? product.compareAtPriceIdr;
  const activeWeightLabel = selectedVariant?.label;

  // Active image — defaults to the first parent view, then moves to the
  // variant's slot when a size is picked.
  const [activeIndex, setActiveIndex] = useState<number>(0);
  useEffect(() => {
    if (selectedVariant?.imageIndex != null && selectedVariant.imageIndex < gallery.length) {
      setActiveIndex(selectedVariant.imageIndex);
    }
  }, [selectedVariant, gallery.length]);
  const activeImg = gallery[activeIndex] ?? gallery[0];

  // If the user clicks a thumbnail that belongs to a different variant, also
  // sync the selected variant — matches what most e-commerce PDPs do.
  const indexToVariant = useMemo(() => {
    const m = new Map<number, BrandProductVariant>();
    (product.variants ?? []).forEach((v) => {
      if (v.imageIndex != null) m.set(v.imageIndex, v);
    });
    return m;
  }, [product.variants]);

  const handleThumbClick = (i: number) => {
    setActiveIndex(i);
    const v = indexToVariant.get(i);
    if (v) setSelectedSku(v.sku);
  };

  const [qty, setQty] = useState(1);
  const { add } = useCart(brandSlug);
  const [justAdded, setJustAdded] = useState(false);

  const discount =
    activeCompareIdr && activeCompareIdr > activePriceIdr
      ? Math.round(((activeCompareIdr - activePriceIdr) / activeCompareIdr) * 100)
      : null;

  const cartSku = selectedVariant?.sku ?? product.sku;

  // Parent SKU stem — strip the trailing size segment from the variant SKU.
  // e.g. SAF-SUK-1K → SAF-SUK; SAF-MUS-FS-500 → SAF-MUS-FS.
  const parentSkuStem = (() => {
    const first = product.variants?.[0]?.sku ?? product.sku;
    const parts = first.split("-");
    return parts.length > 2 ? parts.slice(0, -1).join("-") : first;
  })();

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
            boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
          }}
        >
          {activeImg ? (
            <img
              src={activeImg}
              alt={product.name}
              loading="eager"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {gallery.map((g, i) => {
              const variantForSlot = indexToVariant.get(i);
              const isActive = activeIndex === i;
              return (
                <button
                  key={`${g}-${i}`}
                  onClick={() => handleThumbClick(i)}
                  title={variantForSlot ? `${variantForSlot.sku} · ${variantForSlot.label}` : "Parent view"}
                  style={{
                    width: 68,
                    height: 68,
                    padding: 0,
                    background: "var(--c-surface)",
                    border: isActive
                      ? `2px solid ${brandTheme.colors.primary}`
                      : "1px solid rgba(15, 23, 42, 0.10)",
                    borderRadius: "var(--r-sm)",
                    cursor: "pointer",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <img
                    src={g}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {variantForSlot ? (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 5px",
                        borderRadius: 3,
                        background: brandTheme.colors.primary,
                        color: brandTheme.colors.primaryFg,
                        letterSpacing: 0.3,
                      }}
                    >
                      {variantForSlot.label}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div>
        {product.badges && product.badges.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {product.badges.map((b) => (
              <span
                key={b}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "var(--c-surface)",
                  color: "var(--c-text-muted)",
                  border: "1px solid rgba(15,23,42,0.10)",
                  letterSpacing: 0.4,
                }}
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}

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

        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "clamp(22px, 3vw, 28px)",
              fontWeight: 800,
              color: "var(--c-primary)",
            }}
          >
            {formatIDR(activePriceIdr)}
          </span>
          {activeCompareIdr ? (
            <span style={{ color: "var(--c-text-muted)", textDecoration: "line-through", fontSize: 14 }}>
              {formatIDR(activeCompareIdr)}
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
          {activeWeightLabel ? (
            <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
              · ukuran {activeWeightLabel}
            </span>
          ) : null}
        </div>

        {hasVariants ? (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-muted)", letterSpacing: 0.6, textTransform: "uppercase" }}>
                Pilih Ukuran
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: "var(--c-text-muted)",
                  letterSpacing: 0.4,
                }}
                title="Parent SKU stem · selected child SKU"
              >
                {parentSkuStem} → <span style={{ color: brandTheme.colors.primary, fontWeight: 700 }}>{cartSku}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {product.variants!.map((v) => {
                const active = v.sku === selectedSku;
                return (
                  <button
                    key={v.sku}
                    onClick={() => setSelectedSku(v.sku)}
                    style={{
                      padding: "8px 14px",
                      border: active
                        ? `2px solid ${brandTheme.colors.primary}`
                        : "1px solid rgba(15,23,42,0.16)",
                      borderRadius: "var(--r-md)",
                      background: active ? brandTheme.colors.primary : "var(--c-surface)",
                      color: active ? brandTheme.colors.primaryFg : "var(--c-text)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      minWidth: 64,
                    }}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <p style={{ marginTop: 18, lineHeight: 1.55, color: "var(--c-text)" }}>
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
          <button
            type="button"
            style={{
              padding: "14px 18px",
              background: brandTheme.colors.primary,
              color: brandTheme.colors.primaryFg,
              border: 0,
              borderRadius: "var(--r-md)",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
              letterSpacing: 0.3,
              transition: "transform 0.08s ease",
            }}
            onClick={() => {
              add(cartSku, qty);
              setJustAdded(true);
              setTimeout(() => setJustAdded(false), 1800);
            }}
          >
            {justAdded ? "✓ Ditambahkan ke Keranjang" : `${brandTheme.copy.addToCart} · ${formatIDR(activePriceIdr * qty)}`}
          </button>
          {justAdded ? (
            <Link
              href={`/${brandSlug}/cart`}
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px",
                color: brandTheme.colors.primary,
                textDecoration: "underline",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Lihat keranjang →
            </Link>
          ) : null}
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
              Bayar di keranjang dengan Beli Aman
            </div>
            <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>
              Dana ditahan di escrow sampai barang Anda terima — pilih kurir & bayar saat checkout di keranjang.
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
