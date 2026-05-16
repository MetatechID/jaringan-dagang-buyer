"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BeliAmanButton, useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

import { resolveBrand } from "@/lib/brands";
import { useCart } from "@/lib/cart";
import { formatIDR } from "@/lib/format";
import { lookupSku, similarProducts } from "@/lib/sku-lookup";
import { trackEvent } from "@/lib/analytics";

export function CartView({ brandSlug }: { brandSlug: string }) {
  const brand = resolveBrand(brandSlug);
  const { brandTheme } = useBeliAman();
  const { lines, setQty, remove, totalCount } = useCart(brandSlug);

  const products = brand?.sampleProducts ?? [];

  const cartItems = useMemo(() => {
    return lines.map((l) => {
      const match = lookupSku(products, l.sku);
      return { line: l, match };
    });
  }, [lines, products]);

  const subtotalIdr = cartItems.reduce(
    (s, { line, match }) => s + (match?.unitPriceIdr ?? 0) * line.qty,
    0,
  );

  const compareSubtotalIdr = cartItems.reduce(
    (s, { line, match }) => s + (match?.compareAtIdr ?? match?.unitPriceIdr ?? 0) * line.qty,
    0,
  );

  const savings = Math.max(0, compareSubtotalIdr - subtotalIdr);

  const recommendations = useMemo(
    () => similarProducts(products, lines.map((l) => l.sku), 4),
    [products, lines],
  );

  if (!brand) return null;

  if (totalCount === 0) {
    return (
      <div style={{ padding: "64px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>🛒</div>
          <h1
            style={{
              fontFamily: brand.fonts.heading,
              fontSize: 28,
              fontWeight: 700,
              color: brand.colors.primary,
              margin: 0,
            }}
          >
            Keranjang Anda kosong
          </h1>
          <p style={{ color: "var(--c-text-muted)", marginTop: 12, fontSize: 15 }}>
            Yuk, tambah produk premium Safiya ke keranjang Anda.
          </p>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={`/${brandSlug}`}
              style={{
                padding: "12px 22px",
                background: brand.colors.primary,
                color: brand.colors.primaryFg,
                borderRadius: "var(--r-md)",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              ← Mulai Belanja
            </Link>
            <Link
              href={`/${brandSlug}/promo`}
              style={{
                padding: "12px 22px",
                background: "transparent",
                color: brand.colors.primary,
                borderRadius: "var(--r-md)",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
                border: `1.5px solid ${brand.colors.primary}`,
              }}
            >
              🌙 Lihat Promo Ramadhan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px 80px" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
          gap: 32,
        }}
        className="cart-grid"
      >
        {/* ----- Left: line items + recommendations ----- */}
        <div>
          <h1
            style={{
              fontFamily: brand.fonts.heading,
              fontSize: "clamp(24px, 3vw, 32px)",
              fontWeight: 700,
              color: brand.colors.primary,
              margin: 0,
              marginBottom: 4,
            }}
          >
            Keranjang
          </h1>
          <p style={{ color: "var(--c-text-muted)", fontSize: 13, margin: 0, marginBottom: 20 }}>
            {totalCount} item · {cartItems.length} produk
          </p>

          <div
            style={{
              background: brand.colors.surface,
              borderRadius: "var(--r-md)",
              border: "1px solid rgba(15,23,42,0.08)",
              overflow: "hidden",
            }}
          >
            {cartItems.map(({ line, match }, idx) => {
              if (!match) {
                return (
                  <div key={line.sku} style={{ padding: 16, color: "var(--c-text-muted)" }}>
                    <strong>{line.sku}</strong> tidak ditemukan di katalog.{" "}
                    <button onClick={() => remove(line.sku)} style={{ background: "none", border: 0, color: brand.colors.primary, cursor: "pointer", textDecoration: "underline" }}>
                      Hapus
                    </button>
                  </div>
                );
              }
              const lineTotal = match.unitPriceIdr * line.qty;
              return (
                <div
                  key={line.sku}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "88px 1fr auto",
                    gap: 16,
                    padding: 16,
                    borderTop: idx === 0 ? "none" : "1px solid rgba(15,23,42,0.08)",
                    alignItems: "center",
                  }}
                >
                  <Link href={`/${brandSlug}/product/${match.product.slug}`} style={{ display: "block" }}>
                    <img
                      src={match.image}
                      alt={match.product.name}
                      width={88}
                      height={88}
                      loading="lazy"
                      decoding="async"
                      style={{ width: 88, height: 88, objectFit: "cover", borderRadius: "var(--r-sm)" }}
                    />
                  </Link>
                  <div style={{ minWidth: 0 }}>
                    <Link
                      href={`/${brandSlug}/product/${match.product.slug}`}
                      style={{ color: "var(--c-text)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}
                    >
                      {match.product.name}
                    </Link>
                    {match.variant ? (
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--c-text-muted)" }}>
                        Ukuran <strong style={{ color: "var(--c-text)" }}>{match.variant.label}</strong>{" "}
                        · <span style={{ fontFamily: "ui-monospace, monospace" }}>{line.sku}</span>
                      </div>
                    ) : null}
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ color: brand.colors.primary, fontWeight: 700, fontSize: 14 }}>
                        {formatIDR(match.unitPriceIdr)}
                      </span>
                      {match.compareAtIdr && match.compareAtIdr > match.unitPriceIdr ? (
                        <span style={{ color: "var(--c-text-muted)", fontSize: 12, textDecoration: "line-through" }}>
                          {formatIDR(match.compareAtIdr)}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          border: "1px solid rgba(15,23,42,0.16)",
                          borderRadius: "var(--r-sm)",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setQty(line.sku, line.qty - 1)}
                          aria-label="kurangi"
                          style={{ width: 32, height: 32, background: "transparent", border: 0, cursor: "pointer", fontSize: 16 }}
                        >
                          −
                        </button>
                        <span style={{ width: 32, textAlign: "center", fontWeight: 700, fontSize: 13 }}>
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.sku, line.qty + 1)}
                          aria-label="tambah"
                          style={{ width: 32, height: 32, background: "transparent", border: 0, cursor: "pointer", fontSize: 16 }}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.sku)}
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "var(--c-text-muted)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: brand.colors.primary, whiteSpace: "nowrap" }}>
                    {formatIDR(lineTotal)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ----- Similar products ----- */}
          {recommendations.length > 0 ? (
            <section style={{ marginTop: 40 }}>
              <h2
                style={{
                  fontFamily: brand.fonts.heading,
                  fontSize: 20,
                  fontWeight: 700,
                  color: brand.colors.primary,
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                Sering dibeli bersama
              </h2>
              <p style={{ fontSize: 13, color: "var(--c-text-muted)", margin: 0, marginBottom: 16 }}>
                Produk Safiya yang cocok dengan pesanan Anda.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                  gap: 14,
                }}
              >
                {recommendations.map((p) => {
                  const discount =
                    p.compareAtPriceIdr && p.compareAtPriceIdr > p.priceIdr
                      ? Math.round(((p.compareAtPriceIdr - p.priceIdr) / p.compareAtPriceIdr) * 100)
                      : null;
                  return (
                    <Link
                      key={p.slug}
                      href={`/${brandSlug}/product/${p.slug}`}
                      style={{
                        display: "block",
                        textDecoration: "none",
                        color: "var(--c-text)",
                        background: brand.colors.surface,
                        border: "1px solid rgba(15,23,42,0.08)",
                        borderRadius: "var(--r-md)",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ aspectRatio: "1 / 1", background: brand.colors.bg, position: "relative" }}>
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
                              background: brand.colors.accent,
                              color: "#fff",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            -{discount}%
                          </span>
                        ) : null}
                      </div>
                      <div style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.35, minHeight: 32 }}>
                          {p.name}
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: brand.colors.primary }}>
                          {formatIDR(p.priceIdr)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        {/* ----- Right: summary + checkout ----- */}
        <aside>
          <div
            style={{
              background: brand.colors.surface,
              border: "1px solid rgba(15,23,42,0.08)",
              borderRadius: "var(--r-md)",
              padding: 18,
              position: "sticky",
              top: 80,
            }}
          >
            <h2
              style={{
                fontFamily: brand.fonts.heading,
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                marginBottom: 16,
                color: brand.colors.primary,
              }}
            >
              Ringkasan Belanja
            </h2>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--c-text)" }}>
              <span>Subtotal · {totalCount} item</span>
              <strong>{formatIDR(subtotalIdr)}</strong>
            </div>
            {savings > 0 ? (
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, color: brand.colors.accent }}>
                <span>Hemat</span>
                <strong>−{formatIDR(savings)}</strong>
              </div>
            ) : null}
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--c-text-muted)" }}>
              Ongkir dihitung pada langkah berikutnya berdasarkan kurir & alamat Anda.
            </div>

            <hr style={{ margin: "16px 0", border: 0, borderTop: "1px dashed rgba(15,23,42,0.16)" }} />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "var(--c-text)" }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <strong style={{ fontSize: 20, color: brand.colors.primary }}>{formatIDR(subtotalIdr)}</strong>
            </div>

            <div
              style={{ marginTop: 18 }}
              onClickCapture={() =>
                trackEvent("checkout_start", brandSlug, {
                  total_idr: subtotalIdr,
                  item_count: totalCount,
                })
              }
            >
              <BeliAmanButton
                brandSlug={brandSlug}
                items={lines.map((l) => ({ sku: l.sku, qty: l.qty }))}
                fullWidth
              />
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: "rgba(15, 118, 110, 0.06)",
                borderRadius: "var(--r-sm)",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 16 }}>🛡️</span>
              <div style={{ fontSize: 11, color: "var(--c-text-muted)", lineHeight: 1.55 }}>
                Bayar Aman menahan dana Anda di escrow sampai pesanan tiba. Dana otomatis dilepas D+3 setelah barang sampai, atau saat Anda konfirmasi.
              </div>
            </div>

            <Link
              href={`/${brandSlug}`}
              style={{
                display: "block",
                textAlign: "center",
                marginTop: 14,
                fontSize: 12,
                color: "var(--c-text-muted)",
                textDecoration: "underline",
              }}
            >
              ← Lanjut Belanja
            </Link>
          </div>
        </aside>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .cart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
