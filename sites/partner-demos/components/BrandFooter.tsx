"use client";

import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

export function BrandFooter() {
  const { brandTheme } = useBeliAman();
  return (
    <footer
      className="brand-footer"
      style={{
        background: brandTheme.colors.surface,
        padding: "32px 24px",
        marginTop: 48,
        borderTop: "1px solid rgba(15, 23, 42, 0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          textAlign: "center",
          color: "var(--c-text-muted)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: "rgba(15, 118, 110, 0.08)",
            color: "var(--c-primary)",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          🛡️ Pembelian dilindungi Beli Aman
        </div>
        <p style={{ fontSize: 13, margin: "8px 0 0" }}>
          {brandTheme.name} · Demo storefront
        </p>
        <p className="demo-footer" style={{ borderTop: "none", padding: "8px 0" }}>
          Demo storefront. Products and brand identity used for demonstration of the Beli Aman SDK.
        </p>
      </div>
    </footer>
  );
}
