"use client";

import Link from "next/link";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

import { BeliAmanIdentityWidget } from "@/components/BeliAmanIdentityWidget";
import { useCart } from "@/lib/cart";

const ANTARESTAR_NAV = ["Apparel", "Bags", "Camping", "Footwear", "Jacket", "Sport"];

const SAFIYA_NAV: Array<{ label: string; href: string }> = [
  { label: "Kurma", href: "/safiyafood#kurma" },
  { label: "Sereal", href: "/safiyafood#sereal" },
  { label: "Pantry", href: "/safiyafood#pantry" },
  { label: "Madu", href: "/safiyafood#madu" },
  { label: "Ramadhan", href: "/safiyafood/promo" },
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
            <Link href="/" style={{ color: "#FCD34D", textDecoration: "none", fontSize: 11 }}>
              Demo Picker
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
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
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
          }}
        >
          {brandTheme.name}
        </Link>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 13,
            color: "var(--c-text-muted)",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {isSafiya
            ? SAFIYA_NAV.map((item) => {
                const isPromo = item.href.endsWith("/promo");
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    style={{
                      color: isPromo ? brandTheme.colors.primary : "inherit",
                      textDecoration: "none",
                      fontWeight: 600,
                      letterSpacing: 0.4,
                      ...(isPromo ? { fontStyle: "italic" } : {}),
                    }}
                  >
                    {isPromo ? `🌙 ${item.label}` : item.label}
                  </a>
                );
              })
            : (
              <Link href={`/${brandTheme.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                Shop
              </Link>
            )}
          <Link href={`/${brandTheme.slug}/cart`} style={{ color: "inherit", textDecoration: "none", position: "relative", display: "inline-block" }}>
            🛒 Cart
            <CartBadge brandSlug={brandTheme.slug} />
          </Link>
          <span style={{ width: 1, height: 22, background: "rgba(15,23,42,0.18)", display: "inline-block", margin: "0 4px" }} aria-hidden="true" />
          <BeliAmanIdentityWidget variant="light" />
          <Link href="/" style={{ color: "var(--c-primary)", textDecoration: "none", fontSize: 11 }}>
            Demo Picker
          </Link>
        </nav>
      </div>
      {isSafiya && signedIn && defaultAddress ? (
        <div
          style={{
            background: "var(--c-surface)",
            borderTop: "1px solid rgba(15,23,42,0.06)",
            padding: "8px 24px",
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
    </header>
  );
}
