"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { formatIDR } from "@/lib/format";

interface OrderResponse {
  id: string;
  state: string;
  total_idr: number;
  subtotal_idr: number;
  shipping_idr: number;
  items: { sku: string; name: string; qty: number; unit_price_idr: number; image: string | null }[];
  shipping_address?: any;
  shipped_simulated_at?: string | null;
  delivered_simulated_at?: string | null;
  auto_release_at?: string | null;
  released_at?: string | null;
  created_at: string;
  escrow_ledger?: { entry_type: string; amount_idr: number; description: string; created_at: string }[];
}

const STATES_ORDER = [
  "PRE_AUTH",
  "AUTHED",
  "CART_REVIEWED",
  "ESCROW_HELD",
  "FULFILLING",
  "RECEIVED",
  "ESCROW_RELEASED",
];

function getIdToken(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  // Read the active Firebase user from the SDK's app instance.
  const w = window as any;
  const auth = w.__beli_aman_auth;
  return auth?.currentUser?.getIdToken?.() ?? Promise.resolve(null);
}

export default function OrderTrackerPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BAP_URL}/api/v1/orders/${params.id}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!res.ok) {
          setError(`Gagal memuat pesanan (${res.status})`);
          return;
        }
        const json = (await res.json()) as OrderResponse;
        if (!cancelled) setOrder(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Network error");
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [params.id]);

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h2>Gagal memuat pesanan</h2>
        <p style={{ color: "#64748B" }}>{error}</p>
        <Link href="/" style={{ color: "#0F766E" }}>← Kembali</Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#64748B" }}>Memuat...</div>
    );
  }

  const stateIdx = STATES_ORDER.indexOf(order.state);
  const autoReleaseDate = order.auto_release_at ? new Date(order.auto_release_at) : null;
  const countdown = autoReleaseDate ? Math.max(0, Math.floor((autoReleaseDate.getTime() - now) / 1000)) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
        <Link href="/" style={{ color: "#0F766E", textDecoration: "none", fontSize: 13 }}>
          ← Beli Aman
        </Link>

        <h1 style={{ marginTop: 12, marginBottom: 4, fontSize: 24, fontWeight: 800 }}>
          Pesanan Anda
        </h1>
        <p style={{ color: "#64748B", margin: 0, fontSize: 13 }}>
          ID: <span style={{ fontFamily: "monospace" }}>{order.id.slice(0, 8)}</span>
        </p>

        {/* State pill */}
        <div style={{ marginTop: 20 }}>
          <StatePill state={order.state} />
        </div>

        {/* Timeline */}
        <section style={card()}>
          <h3 style={sectionTitle()}>Lifecycle</h3>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {STATES_ORDER.map((s, i) => {
              const reached = i <= stateIdx;
              const current = i === stateIdx;
              return (
                <li
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    opacity: reached ? 1 : 0.5,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: reached ? (current ? "#10B981" : "#0F766E") : "#E2E8F0",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {reached ? "✓" : i + 1}
                  </span>
                  <span style={{ fontWeight: current ? 700 : 500 }}>{prettyState(s)}</span>
                </li>
              );
            })}
          </ol>
          {order.state === "RECEIVED" && countdown !== null ? (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "#FEF9C3",
                borderRadius: 8,
                fontSize: 13,
                color: "#854D0E",
              }}
            >
              ⏰ Auto-release in {fmtCountdown(countdown)}
            </div>
          ) : null}
        </section>

        {/* Items */}
        <section style={card()}>
          <h3 style={sectionTitle()}>Item</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {order.items.map((it) => (
              <li key={it.sku} style={{ display: "flex", gap: 10, padding: "8px 0" }}>
                {it.image ? (
                  <img src={it.image} alt="" style={{ width: 56, height: 56, borderRadius: 8, background: "#fff" }} />
                ) : null}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                  <div style={{ color: "#64748B", fontSize: 12 }}>×{it.qty}</div>
                </div>
                <div style={{ fontWeight: 600 }}>{formatIDR(it.unit_price_idr * it.qty)}</div>
              </li>
            ))}
          </ul>
          <div style={{ borderTop: "1px dashed #E2E8F0", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <strong>{formatIDR(order.total_idr)}</strong>
          </div>
        </section>

        {/* Escrow ledger */}
        {order.escrow_ledger && order.escrow_ledger.length > 0 ? (
          <section style={card()}>
            <h3 style={sectionTitle()}>Escrow Ledger</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {order.escrow_ledger.map((l, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                  <div>
                    <span style={ledgerPill(l.entry_type)}>{l.entry_type}</span>
                    <span style={{ marginLeft: 8, fontSize: 13, color: "#64748B" }}>{l.description}</span>
                  </div>
                  <strong>{formatIDR(l.amount_idr)}</strong>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/" style={{ color: "#0F766E", textDecoration: "none" }}>
            ← Kembali ke pemilihan demo
          </Link>
        </div>
      </div>
    </div>
  );
}

function card(): React.CSSProperties {
  return {
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  };
}

function sectionTitle(): React.CSSProperties {
  return { margin: "0 0 8px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#0F172A" };
}

function ledgerPill(t: string): React.CSSProperties {
  const map: Record<string, { bg: string; fg: string }> = {
    HOLD: { bg: "#FEF9C3", fg: "#854D0E" },
    RELEASE: { bg: "#DCFCE7", fg: "#166534" },
    REFUND: { bg: "#FEE2E2", fg: "#991B1B" },
  };
  const c = map[t] || { bg: "#F1F5F9", fg: "#0F172A" };
  return { background: c.bg, color: c.fg, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 };
}

function StatePill({ state }: { state: string }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    PRE_AUTH: { bg: "#F1F5F9", fg: "#475569" },
    AUTHED: { bg: "#F1F5F9", fg: "#475569" },
    CART_REVIEWED: { bg: "#DBEAFE", fg: "#1E40AF" },
    ESCROW_HELD: { bg: "#FEF9C3", fg: "#854D0E" },
    FULFILLING: { bg: "#DBEAFE", fg: "#1E40AF" },
    RECEIVED: { bg: "#E0F2FE", fg: "#075985" },
    ESCROW_RELEASED: { bg: "#DCFCE7", fg: "#166534" },
    REFUNDED: { bg: "#FEE2E2", fg: "#991B1B" },
    DISPUTED: { bg: "#FEE2E2", fg: "#991B1B" },
  };
  const c = colorMap[state] || colorMap.PRE_AUTH;
  return (
    <span style={{ background: c.bg, color: c.fg, padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
      {prettyState(state)}
    </span>
  );
}

function prettyState(s: string): string {
  return (
    {
      PRE_AUTH: "Cart Created",
      AUTHED: "Signed In",
      CART_REVIEWED: "Cart Reviewed",
      ESCROW_HELD: "Escrow Held",
      FULFILLING: "Shipping",
      RECEIVED: "Delivered",
      ESCROW_RELEASED: "Funds Released",
      REFUNDED: "Refunded",
      DISPUTED: "Disputed",
    } as Record<string, string>
  )[s] || s;
}

function fmtCountdown(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
