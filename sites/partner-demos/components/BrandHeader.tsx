"use client";

import Link from "next/link";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

import { BeliAmanIdentityWidget } from "@/components/BeliAmanIdentityWidget";
import { useCart } from "@/lib/cart";

const ANTARESTAR_NAV = ["Apparel", "Bags", "Camping", "Footwear", "Jacket", "Sport"];

// Top utility nav for Safiya. Brand-category navigation moved to the in-page
// tile grid + the mobile quick-jump strip — top nav is now utility links
// (Sayurbox / Astro pattern).
const SAFIYA_NAV: Array<{ label: string; href: string }> = [
  { label: "Cek Pesanan", href: "/orders" },
  { label: "Promo", href: "/safiyafood/promo" },
  { label: "Bantuan", href: "/safiyafood#bantuan" },
];

// Mobile-only category quick-jump pill strip (still useful for scroll
// navigation from the top of the page).
const SAFIYA_MOBILE_QUICKJUMP: Array<{ label: string; href: string }> = [
  { label: "Kurma", href: "/safiyafood#kurma" },
  { label: "Sereal", href: "/safiyafood#sereal" },
  { label: "Pantry", href: "/safiyafood#pantry" },
  { label: "Madu", href: "/safiyafood#madu" },
  { label: "Promo", href: "/safiyafood/promo" },
];

function CartBadge({ brandSlug }: { brandSlug: string }) {
  const { totalCount } = useCart(brandSlug);
  if (totalCount <= 0) return null;
  return (
    <span
      aria-label={`${totalCount} item di keranjang`}
      style={{
        position: "absolute",
        top: -6,
        right: -8,
        background: "var(--c-accent, #D4A24C)",
        color: "#fff",
        minWidth: 18,
        height: 18,
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        lineHeight: 1,
      }}
    >
      {totalCount > 99 ? "99+" : totalCount}
    </span>
  );
}

export function BrandHeader() {
  const { brandTheme, signedIn, defaultAddress } = useBeliAman();
  const isAntarestar = brandTheme.slug === "antarestar";
  const isSafiya = brandTheme.slug === "safiyafood";

  if (isAntarestar) {
    return (
      <header
        style={{
          background: "#1F2937",
          color: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 24,
            padding: "10px 24px",
          }}
        >
          <Link
            href={`/${brandTheme.slug}`}
            style={{
              fontFamily: brandTheme.fonts.heading,
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              fontSize: 18,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            ▲ ANTARESTAR
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.12)",
              borderRadius: 999,
              padding: "8px 16px",
              maxWidth: 320,
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            🔍 <span style={{ marginLeft: 8 }}>Cari....</span>
          </div>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              fontWeight: 500,
            }}
          >
            {ANTARESTAR_NAV.map((label) => (
              <span key={label} style={{ cursor: "default" }}>
                {label} ▾
              </span>
            ))}
            <Link href={`/${brandTheme.slug}/cart`} style={{ color: "inherit", textDecoration: "none", position: "relative", display: "inline-block" }} aria-label="Cart">
              🛒
              <CartBadge brandSlug={brandTheme.slug} />
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header
      style={{
        background: "var(--c-bg)",
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="brand-header-row"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 16px",
        }}
      >
        <Link
          href={`/${brandTheme.slug}`}
          style={{
            fontFamily: brandTheme.fonts.heading,
            fontWeight: 800,
            color: brandTheme.colors.primary,
            textDecoration: "none",
            fontSize: 18,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {brandTheme.name}
        </Link>

        {/* Search — visible on every screen, takes remaining space */}
        <form
          role="search"
          action={`/${brandTheme.slug}`}
          method="GET"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--c-surface)",
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 999,
            padding: "8px 14px",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 14, color: "var(--c-text-muted)" }}>
            🔍
          </span>
          <input
            type="search"
            name="q"
            placeholder={isSafiya ? "Cari kurma, muesli, madu…" : "Cari produk…"}
            aria-label="Cari produk"
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: 0,
              outline: "none",
              fontSize: 13,
              color: "var(--c-text)",
              fontFamily: "inherit",
            }}
          />
        </form>

        <nav
          className="brand-header-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 13,
            color: "var(--c-text-muted)",
            flexShrink: 0,
          }}
        >
          {isSafiya
            ? SAFIYA_NAV.map((item) => {
                const isPromo = item.href.endsWith("/promo");
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="brand-header-link"
                    style={{
                      color: isPromo ? brandTheme.colors.primary : "var(--c-text-muted)",
                      textDecoration: "none",
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      ...(isPromo ? { fontStyle: "italic" } : {}),
                    }}
                  >
                    {isPromo ? `🌙 ${item.label}` : item.label}
                  </a>
                );
              })
            : (
              <Link
                href={`/${brandTheme.slug}`}
                className="brand-header-link"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                Shop
              </Link>
            )}
          <Link
            href={`/${brandTheme.slug}/cart`}
            className="brand-header-cart-desktop"
            style={{ color: "inherit", textDecoration: "none", position: "relative", display: "inline-block" }}
          >
            🛒 Cart
            <CartBadge brandSlug={brandTheme.slug} />
          </Link>
          <span
            className="brand-header-divider"
            style={{ width: 1, height: 22, background: "rgba(15,23,42,0.18)", display: "inline-block", margin: "0 4px" }}
            aria-hidden="true"
          />
          <span className="brand-header-identity">
            <BeliAmanIdentityWidget variant="light" />
          </span>
        </nav>
      </div>
      {isSafiya && signedIn && defaultAddress ? (
        <div
          style={{
            background: "var(--c-surface)",
            borderTop: "1px solid rgba(15,23,42,0.06)",
            padding: "8px 16px",
            fontSize: 12,
            color: "var(--c-text-muted)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            📍 Dikirim ke{" "}
            <strong style={{ color: "var(--c-text)" }}>
              {defaultAddress.label ?? defaultAddress.recipient_name ?? "Alamat tersimpan"}
              {defaultAddress.kota ? ` · ${defaultAddress.kota}` : ""}
              {defaultAddress.postal_code ? ` ${defaultAddress.postal_code}` : ""}
            </strong>
          </div>
        </div>
      ) : null}
      {/* Mobile-only category quick-jump strip (Sayurbox / Astronauts pattern). */}
      {isSafiya ? (
        <div
          className="brand-header-quickjump"
          aria-label="Kategori cepat"
          style={{
            borderTop: "1px solid rgba(15,23,42,0.06)",
            background: "var(--c-bg)",
            padding: "8px 12px",
            display: "none",
            overflowX: "auto",
            whiteSpace: "nowrap",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {SAFIYA_MOBILE_QUICKJUMP.map((item) => {
            const isPromo = item.href.endsWith("/promo");
            return (
              <a
                key={item.label}
                href={item.href}
                style={{
                  display: "inline-block",
                  marginRight: 8,
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                  background: isPromo ? brandTheme.colors.primary : "var(--c-surface)",
                  color: isPromo ? brandTheme.colors.primaryFg : "var(--c-text)",
                  border: isPromo ? "0" : "1px solid rgba(15,23,42,0.10)",
                  letterSpacing: 0.3,
                }}
              >
                {isPromo ? `🌙 ${item.label}` : item.label}
              </a>
            );
          })}
        </div>
      ) : null}
      <style>{`
        /* Hide the strip's scrollbar on mobile (already overflow-x: auto). */
        .brand-header-quickjump::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .brand-header-row { padding: 10px 12px !important; gap: 10px !important; }
          .brand-header-nav .brand-header-link { display: none !important; }
          .brand-header-cart-desktop { display: none !important; }
          .brand-header-divider { display: none !important; }
          .brand-header-quickjump { display: block !important; }
        }
        @media (min-width: 769px) {
          .brand-header-quickjump { display: none !important; }
        }
      `}</style>
    </header>
  );
}
