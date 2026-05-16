"use client";

import Link from "next/link";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

const ANTARESTAR_NAV = ["Apparel", "Bags", "Camping", "Footwear", "Jacket", "Sport"];

const SAFIYA_NAV: Array<{ label: string; href: string }> = [
  { label: "Kurma", href: "#kurma" },
  { label: "Sereal", href: "#sereal" },
  { label: "Pantry", href: "#pantry" },
  { label: "Madu", href: "#madu" },
];

export function BrandHeader() {
  const { brandTheme } = useBeliAman();
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
            <Link href={`/${brandTheme.slug}/cart`} style={{ color: "inherit", textDecoration: "none" }} aria-label="Cart">
              🛒
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
            ? SAFIYA_NAV.map((item) => (
                <a
                  key={item.label}
                  href={`/${brandTheme.slug}${item.href}`}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    fontWeight: 600,
                    letterSpacing: 0.4,
                  }}
                >
                  {item.label}
                </a>
              ))
            : (
              <Link href={`/${brandTheme.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                Shop
              </Link>
            )}
          <Link href={`/${brandTheme.slug}/cart`} style={{ color: "inherit", textDecoration: "none" }}>
            🛒 Cart
          </Link>
          <Link href="/" style={{ color: "var(--c-primary)", textDecoration: "none" }}>
            Demo Picker
          </Link>
        </nav>
      </div>
    </header>
  );
}
