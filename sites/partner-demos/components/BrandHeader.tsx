"use client";

import Link from "next/link";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

export function BrandHeader() {
  const { brandTheme } = useBeliAman();

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
            letterSpacing: brandTheme.slug === "antarestar" ? "0.04em" : "normal",
            textTransform: brandTheme.slug === "antarestar" ? "uppercase" : "none",
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
          }}
        >
          <Link href={`/${brandTheme.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
            Shop
          </Link>
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
