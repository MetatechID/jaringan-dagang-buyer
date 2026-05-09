"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { formatIDR } from "@/lib/format";

export default function AdminCockpitPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: "center", color: "#94A3B8" }}>Loading...</div>}>
      <AdminCockpitPage />
    </Suspense>
  );
}

interface AdminOrder {
  id: string;
  state: string;
  brand_id: string;
  total_idr: number;
  items: { sku: string; name: string; qty: number }[];
  delivered_simulated_at: string | null;
  auto_release_at: string | null;
  released_at: string | null;
  created_at: string;
}

const STATE_COLORS: Record<string, { bg: string; fg: string }> = {
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

function AdminCockpitPage() {
  const search = useSearchParams();
  const tokenFromUrl = search.get("token") || "";
  const envToken = process.env.NEXT_PUBLIC_ADMIN_DEMO_TOKEN || "";
  const token = tokenFromUrl || envToken;

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    "X-Admin-Token": token,
  }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BAP_URL}/api/v1/internal-mock/orders`,
        { headers: headers() },
      );
      if (!res.ok) {
        setError(`Failed (${res.status}) — check token & BAP URL`);
        return;
      }
      const json = (await res.json()) as AdminOrder[];
      setOrders(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Network error");
    }
  }, [headers, token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  const action = useCallback(
    async (orderId: string, path: string) => {
      setBusyId(orderId);
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_BAP_URL}/api/v1/internal-mock/order/${orderId}/${path}`,
          { method: "POST", headers: headers() },
        );
        await load();
      } finally {
        setBusyId(null);
      }
    },
    [headers, load],
  );

  if (!token) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <h1>🔒 Admin cockpit</h1>
        <p>Append <code>?token=&lt;ADMIN_TOKEN&gt;</code> to the URL or set <code>NEXT_PUBLIC_ADMIN_DEMO_TOKEN</code>.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#E2E8F0", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🎛️ Beli Aman Demo Cockpit</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94A3B8" }}>
              Click order rows to advance their lifecycle without real payments / shipping events.
            </p>
          </div>
          <Link href="/" style={{ color: "#10B981", textDecoration: "none", fontSize: 13 }}>← Demo picker</Link>
        </header>

        {error ? <div style={{ padding: 12, background: "#7F1D1D", color: "#FECACA", borderRadius: 8, marginBottom: 16 }}>{error}</div> : null}

        {orders.length === 0 ? (
          <div style={{ padding: 48, background: "#1E293B", borderRadius: 12, textAlign: "center", color: "#94A3B8" }}>
            No orders yet. Go to <Link href="/" style={{ color: "#10B981" }}>a brand demo</Link> and click "Bayar Aman" to create one.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {orders.map((o) => {
              const c = STATE_COLORS[o.state] || STATE_COLORS.PRE_AUTH;
              const itemSummary =
                o.items.length === 1 ? o.items[0].name : `${o.items[0].name} +${o.items.length - 1}`;
              return (
                <article
                  key={o.id}
                  style={{
                    background: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "monospace", fontSize: 12, color: "#94A3B8" }}>
                        {o.id.slice(0, 12)}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{itemSummary}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>
                        {formatIDR(o.total_idr)} · {new Date(o.created_at).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <span
                      style={{
                        background: c.bg,
                        color: c.fg,
                        padding: "4px 12px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {o.state}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <ActionBtn
                      label="🚚 Mark seller-shipped"
                      enabled={o.state === "ESCROW_HELD"}
                      busy={busyId === o.id}
                      onClick={() => action(o.id, "seller-shipped")}
                    />
                    <ActionBtn
                      label="📦 Mark delivered"
                      enabled={o.state === "FULFILLING"}
                      busy={busyId === o.id}
                      onClick={() => action(o.id, "delivered")}
                    />
                    <ActionBtn
                      label="⏩ Elapse D+3 → release"
                      enabled={o.state === "RECEIVED"}
                      busy={busyId === o.id}
                      onClick={() => action(o.id, "elapse-d3")}
                    />
                    <ActionBtn
                      label="↩️ Refund"
                      enabled={["ESCROW_HELD", "FULFILLING", "DISPUTED"].includes(o.state)}
                      danger
                      busy={busyId === o.id}
                      onClick={() => action(o.id, "refund")}
                    />
                    <Link
                      href={`/orders/${o.id}`}
                      style={{ marginLeft: "auto", padding: "6px 12px", color: "#94A3B8", textDecoration: "underline", fontSize: 12 }}
                    >
                      Buyer view →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  enabled,
  busy,
  danger,
  onClick,
}: {
  label: string;
  enabled: boolean;
  busy: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled || busy}
      style={{
        padding: "6px 12px",
        background: !enabled ? "#0F172A" : danger ? "#7F1D1D" : "#0F766E",
        color: !enabled ? "#475569" : "#fff",
        border: "1px solid",
        borderColor: !enabled ? "#1E293B" : danger ? "#991B1B" : "#0F766E",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        cursor: enabled && !busy ? "pointer" : "not-allowed",
      }}
    >
      {busy ? "..." : label}
    </button>
  );
}
