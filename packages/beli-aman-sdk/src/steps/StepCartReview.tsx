"use client";

import { useEffect, useState } from "react";

import { useBeliAman } from "../BeliAmanProvider";
import { api } from "../lib/api";
import { formatIDR, t } from "../lib/i18n";

interface CartLine {
  sku: string;
  name: string;
  qty: number;
  unit_price_idr: number;
  image: string | null;
}

export function StepCartReview() {
  const {
    apiOpts,
    brandTheme,
    submitCartReview,
    displayName,
    photoUrl,
    email,
    brandSlug,
    items,
  } = useBeliAman();

  const [previewLines, setPreviewLines] = useState<CartLine[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(true);

  // Address form state — pre-filled with reasonable defaults so the demo
  // can speed through; user can edit.
  const [recipientName, setRecipientName] = useState(displayName || "");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [kota, setKota] = useState("Jakarta");
  const [provinsi, setProvinsi] = useState("DKI Jakarta");
  const [postalCode, setPostalCode] = useState("12190");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRecipientName(displayName || "");
  }, [displayName]);

  // For preview, call the public catalog endpoints to get prices/names.
  // Use the brandSlug + items from the provider state directly (these are
  // populated by open() before this step renders) instead of sessionStorage,
  // which races with the initial render and shows an empty preview.
  useEffect(() => {
    if (!brandSlug || items.length === 0) {
      setPreviewLines([]);
      setPreviewTotal(0);
      setLoadingPreview(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingPreview(true);
      try {
        const products = (await fetch(
          apiOpts.bapUrl.replace(/\/$/, "") + `/api/v1/brands/${brandSlug}/products`,
        ).then((r) => r.json())) as any[];
        const bySku = new Map(products.map((p) => [p.sku, p]));
        const lines: CartLine[] = items.map((it) => {
          const p = bySku.get(it.sku);
          return {
            sku: it.sku,
            name: p?.name || it.sku,
            qty: it.qty,
            unit_price_idr: Number(p?.price_idr || 0),
            image: p?.image || null,
          };
        });
        const total = lines.reduce((s, l) => s + l.unit_price_idr * l.qty, 0);
        if (!cancelled) {
          setPreviewLines(lines);
          setPreviewTotal(total);
        }
      } catch {
        // ignore — server will validate again on createOrder
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiOpts.bapUrl, brandSlug, items]);

  const handleContinue = async () => {
    setErr(null);
    if (!recipientName.trim() || !phone.trim() || !line1.trim()) {
      setErr("Lengkapi nama, nomor telepon, dan alamat.");
      return;
    }
    setBusy(true);
    try {
      await submitCartReview({
        addressInline: {
          recipient_name: recipientName,
          phone_e164: phone,
          line1,
          kota,
          provinsi,
          postal_code: postalCode,
        },
      });
    } catch (e: any) {
      setErr(e?.message || "Gagal melanjutkan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ba-step ba-step-review">
      <div className="ba-user-pill">
        {photoUrl ? <img src={photoUrl} alt="" className="ba-avatar" /> : null}
        <div>
          <div className="ba-user-name">{displayName || email}</div>
          <div className="ba-user-email">{email}</div>
        </div>
        <span className="ba-verified" title="Verified Google account">
          ✓ Google
        </span>
      </div>

      <section className="ba-section">
        <h3 className="ba-h3">Pesanan Anda</h3>
        {loadingPreview ? (
          <div className="ba-skeleton" />
        ) : (
          <ul className="ba-cart-lines">
            {previewLines.map((l) => (
              <li key={l.sku} className="ba-cart-line">
                {l.image ? <img src={l.image} alt="" className="ba-cart-img" /> : null}
                <div className="ba-cart-meta">
                  <div className="ba-cart-name">{l.name}</div>
                  <div className="ba-muted">×{l.qty}</div>
                </div>
                <div className="ba-cart-price">{formatIDR(l.unit_price_idr * l.qty)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ba-section">
        <h3 className="ba-h3">{t.field.address}</h3>
        <div className="ba-form-grid">
          <label className="ba-field">
            <span>Nama penerima</span>
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nama lengkap" />
          </label>
          <label className="ba-field">
            <span>Nomor telepon</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62..." inputMode="tel" />
          </label>
          <label className="ba-field ba-field-full">
            <span>Alamat lengkap</span>
            <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Jalan, no rumah, RT/RW" />
          </label>
          <label className="ba-field">
            <span>Kota</span>
            <input value={kota} onChange={(e) => setKota(e.target.value)} />
          </label>
          <label className="ba-field">
            <span>Provinsi</span>
            <input value={provinsi} onChange={(e) => setProvinsi(e.target.value)} />
          </label>
          <label className="ba-field">
            <span>Kode pos</span>
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} inputMode="numeric" />
          </label>
        </div>
      </section>

      <section className="ba-section">
        <h3 className="ba-h3">{t.field.paymentMethod}</h3>
        <div className="ba-pm-card">
          <div className="ba-pm-icon">🏦</div>
          <div className="ba-pm-info">
            <div className="ba-pm-label">BCA Virtual Account</div>
            <div className="ba-muted">Dilindungi escrow Beli Aman</div>
          </div>
          <span className="ba-pill ba-pill-success">Terpilih</span>
        </div>
      </section>

      <section className="ba-section ba-totals">
        <div className="ba-row">
          <span>{t.field.subtotal}</span>
          <strong>{formatIDR(previewTotal)}</strong>
        </div>
        <div className="ba-row">
          <span>{t.field.shipping}</span>
          <strong>Rp 0</strong>
        </div>
        <div className="ba-row ba-row-total">
          <span>{t.field.total}</span>
          <strong className="ba-total-amount">{formatIDR(previewTotal)}</strong>
        </div>
      </section>

      {err ? <p className="ba-error-inline">{err}</p> : null}

      <button className="ba-btn-primary ba-cta-fw" onClick={handleContinue} disabled={busy}>
        {busy ? "Memproses..." : t.cta.continueToPayment}
      </button>
    </div>
  );
}

