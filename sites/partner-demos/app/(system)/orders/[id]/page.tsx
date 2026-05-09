"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

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


export default function OrderTrackerPage() {
  const params = useParams<{ id: string }>();
  const { apiOpts, signedIn } = useBeliAman();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    // Wait for Firebase auth to hydrate before fetching — without this the
    // first call lands while currentUser is still null and gets a 401.
    if (!signedIn) {
      setError(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const token = await apiOpts.getIdToken();
        const res = await fetch(
          `${apiOpts.bapUrl.replace(/\/$/, "")}/api/v1/orders/${params.id}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!res.ok) {
          setError(`Gagal memuat pesanan (${res.status})`);
          return;
        }
        const json = (await res.json()) as OrderResponse;
        if (!cancelled) {
          setOrder(json);
          setError(null);
        }
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
  }, [params.id, signedIn, apiOpts]);

  if (!signedIn) {
    return (
      <div style={{ minHeight: "100vh", padding: 48, textAlign: "center", color: "#64748B" }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#0F172A" }}>Masuk untuk Melihat Pesanan</h2>
        <p style={{ marginTop: 8 }}>Anda perlu masuk dengan Google untuk melihat pesanan ini.</p>
        <Link href="/" style={{ color: "#0F766E", marginTop: 16, display: "inline-block" }}>
          ← Kembali ke pemilihan demo
        </Link>
      </div>
    );
  }

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
              ⏰ Auto-release in {fmtCountdown(countdown)} (Asia/Jakarta)
            </div>
          ) : null}
        </section>

        {/* Buyer actions — confirm-receipt + dispute */}
        {(order.state === "FULFILLING" || order.state === "RECEIVED") ? (
          <BuyerActions order={order} apiOpts={apiOpts} onUpdated={(o) => setOrder(o)} />
        ) : null}

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

/* -------------------------------------------------------------------------
 * Buyer actions: confirm-receipt + open-dispute. Visible while order is in
 * FULFILLING or RECEIVED. These are the §5 unhappy/happy-path entry points
 * the spec calls out (Step 5 confirm + 5a/5b dispute).
 * ------------------------------------------------------------------------- */

const DISPUTE_REASONS: { value: string; label: string }[] = [
  { value: "not_received", label: "Belum diterima" },
  { value: "wrong_item", label: "Barang salah" },
  { value: "damaged", label: "Barang rusak / cacat" },
  { value: "other", label: "Lainnya" },
];

function BuyerActions({
  order,
  apiOpts,
  onUpdated,
}: {
  order: OrderResponse;
  apiOpts: { bapUrl: string; getIdToken: () => Promise<string | null> };
  onUpdated: (o: OrderResponse) => void;
}) {
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState<string>("not_received");
  const [note, setNote] = useState("");
  const [disputeBusy, setDisputeBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const callApi = async (path: string, body?: any) => {
    const token = await apiOpts.getIdToken();
    const res = await fetch(`${apiOpts.bapUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : "{}",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const handleConfirmReceipt = async () => {
    if (!confirm("Konfirmasi: barang sudah diterima dan semua sesuai? Dana akan langsung dilepas ke penjual.")) return;
    setConfirmBusy(true);
    setMsg(null);
    try {
      await callApi(`/api/v1/orders/${order.id}/confirm-receipt`);
      // Refetch the order
      const token = await apiOpts.getIdToken();
      const res = await fetch(`${apiOpts.bapUrl.replace(/\/$/, "")}/api/v1/orders/${order.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) onUpdated(await res.json());
      setMsg("✓ Terima kasih! Dana sudah dilepas ke penjual.");
    } catch (e: any) {
      setMsg("Gagal: " + (e?.message || "tidak diketahui"));
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleSubmitDispute = async () => {
    setDisputeBusy(true);
    setMsg(null);
    try {
      await callApi(`/api/v1/disputes`, { order_id: order.id, reason, note });
      const token = await apiOpts.getIdToken();
      const res = await fetch(`${apiOpts.bapUrl.replace(/\/$/, "")}/api/v1/orders/${order.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) onUpdated(await res.json());
      setMsg("✓ Laporan diterima. Tim Beli Aman akan memproses dalam 48 jam.");
      setDisputeOpen(false);
      setNote("");
    } catch (e: any) {
      setMsg("Gagal: " + (e?.message || "tidak diketahui"));
    } finally {
      setDisputeBusy(false);
    }
  };

  return (
    <section style={card()}>
      <h3 style={sectionTitle()}>Tindakan</h3>

      {msg ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            background: msg.startsWith("✓") ? "#DCFCE7" : "#FEE2E2",
            color: msg.startsWith("✓") ? "#166534" : "#991B1B",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {msg}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={handleConfirmReceipt}
          disabled={confirmBusy}
          style={{
            padding: "12px 18px",
            background: "linear-gradient(180deg, #10B981, #0F766E)",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: confirmBusy ? "wait" : "pointer",
          }}
        >
          {confirmBusy ? "Memproses..." : "✓ Sudah diterima, semua oke"}
        </button>

        <button
          type="button"
          onClick={() => setDisputeOpen((v) => !v)}
          style={{
            padding: "10px 14px",
            background: "transparent",
            color: "#991B1B",
            border: "1px solid rgba(153, 27, 27, 0.3)",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {disputeOpen ? "Tutup" : "⚠️ Lapor masalah"}
        </button>

        {disputeOpen ? (
          <div
            style={{
              marginTop: 4,
              padding: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <label style={{ fontSize: 12, color: "#991B1B", fontWeight: 600 }}>
              Apa masalahnya?
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #FCA5A5",
                background: "#fff",
                fontSize: 14,
              }}
            >
              {DISPUTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detail (opsional). Contoh: kurir bilang sudah diantar tapi tidak ada barang."
              rows={3}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #FCA5A5",
                background: "#fff",
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
            <button
              type="button"
              onClick={handleSubmitDispute}
              disabled={disputeBusy}
              style={{
                padding: "10px 14px",
                background: "#DC2626",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                cursor: disputeBusy ? "wait" : "pointer",
              }}
            >
              {disputeBusy ? "Mengirim..." : "Kirim laporan"}
            </button>
            <p style={{ fontSize: 11, color: "#7F1D1D", margin: 0 }}>
              Dana Anda tetap aman di escrow Beli Aman selama laporan diproses (SLA 48 jam).
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
