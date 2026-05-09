import Link from "next/link";

export default function CartPage({ params }: { params: { brand: string } }) {
  return (
    <div style={{ padding: "48px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700 }}>
          Cart
        </h1>
        <p style={{ color: "var(--c-text-muted)", marginTop: 12 }}>
          Cart view is intentionally minimal in v1 — the demo lives on PDP. Use the
          <strong> "Bayar Aman" </strong>
          button on any product to start the escrow flow.
        </p>
        <Link
          href={`/${params.brand}`}
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "10px 18px",
            background: "var(--c-primary)",
            color: "var(--c-primary-fg)",
            borderRadius: "var(--r-md)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Lanjut Belanja
        </Link>
      </div>
    </div>
  );
}
