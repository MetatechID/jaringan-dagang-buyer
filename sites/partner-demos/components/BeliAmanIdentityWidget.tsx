"use client";

import { useState, useRef, useEffect } from "react";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

/** Header SSO widget — Tokopedia-style "Masuk / Daftar" when signed out,
 *  avatar + name + saved address indicator when signed in. Works on every
 *  Beli Aman-enabled storefront (same identity across brands). */
export function BeliAmanIdentityWidget({
  variant = "light",
}: { variant?: "light" | "dark" } = {}) {
  const {
    signedIn,
    displayName,
    email,
    photoUrl,
    defaultAddress,
    signInIdentity,
    signOutIdentity,
    brandTheme,
  } = useBeliAman();

  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const isDark = variant === "dark";
  const text = isDark ? "rgba(255,255,255,0.9)" : "var(--c-text)";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "var(--c-text-muted)";

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInIdentity();
    } catch (e: any) {
      alert("Gagal masuk: " + (e?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          style={{
            padding: "8px 18px",
            background: "transparent",
            color: brandTheme.colors.primary,
            border: `1.5px solid ${brandTheme.colors.primary}`,
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: busy ? "wait" : "pointer",
            letterSpacing: 0.3,
          }}
        >
          {busy ? "…" : "Masuk"}
        </button>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          style={{
            padding: "8px 18px",
            background: brandTheme.colors.primary,
            color: brandTheme.colors.primaryFg,
            border: `1.5px solid ${brandTheme.colors.primary}`,
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: busy ? "wait" : "pointer",
            letterSpacing: 0.3,
          }}
        >
          Daftar
        </button>
      </div>
    );
  }

  const addressLine = defaultAddress
    ? `${defaultAddress.label ?? defaultAddress.recipient_name ?? "Alamat"} · ${defaultAddress.kota ?? defaultAddress.line1 ?? ""}`
    : null;

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 10 }}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        title={email ?? ""}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "5px 10px 5px 5px",
          background: "transparent",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.12)"}`,
          borderRadius: 999,
          cursor: "pointer",
          color: text,
          fontWeight: 600,
          fontSize: 13,
          maxWidth: 240,
        }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            width={28}
            height={28}
            referrerPolicy="no-referrer"
            style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover" }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: brandTheme.colors.primary,
              color: brandTheme.colors.primaryFg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            {(displayName ?? email ?? "?").trim()[0]?.toUpperCase()}
          </span>
        )}
        <span
          style={{
            maxWidth: 120,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {(displayName ?? email ?? "Akun").split(" ")[0]}
        </span>
        <span aria-hidden="true" style={{ color: muted, fontSize: 10 }}>▾</span>
      </button>

      {menuOpen ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 280,
            background: "#fff",
            color: "#0F172A",
            border: "1px solid rgba(15,23,42,0.10)",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(15,23,42,0.18)",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>{displayName ?? email}</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, wordBreak: "break-all" }}>{email}</div>

          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: "rgba(212,162,76,0.10)",
              border: "1px solid rgba(212,162,76,0.40)",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: brandTheme.colors.primary }}>
              🛡️ Identitas Beli Aman
            </div>
            <div style={{ color: "#5A4A3A" }}>
              Anda otomatis masuk ke setiap toko yang menggunakan Beli Aman dengan akun yang sama.
            </div>
          </div>

          {defaultAddress ? (
            <div style={{ marginTop: 12, fontSize: 12, color: "#0F172A" }}>
              <div style={{ fontWeight: 700, color: brandTheme.colors.primary }}>
                📍 Alamat Pengiriman Default
              </div>
              <div style={{ marginTop: 4, color: "#5A4A3A", lineHeight: 1.55 }}>
                {defaultAddress.recipient_name ?? "—"}
                {defaultAddress.phone_e164 ? ` · ${defaultAddress.phone_e164}` : ""}
                <br />
                {defaultAddress.line1 ?? "—"}
                <br />
                {defaultAddress.kota ?? ""}
                {defaultAddress.provinsi ? `, ${defaultAddress.provinsi}` : ""}
                {defaultAddress.postal_code ? ` ${defaultAddress.postal_code}` : ""}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748B" }}>
              Belum ada alamat tersimpan. Akan dibuat otomatis saat checkout pertama.
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              setMenuOpen(false);
              await signOutIdentity();
            }}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "10px 12px",
              background: "transparent",
              color: brandTheme.colors.primary,
              border: `1px solid ${brandTheme.colors.primary}`,
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Keluar
          </button>
        </div>
      ) : null}

      {addressLine ? (
        <div
          style={{
            fontSize: 11,
            color: muted,
            display: "none",
          }}
          className="ba-addr-bar"
          aria-hidden="true"
        >
          📍 Dikirim ke <strong style={{ color: text }}>{addressLine}</strong>
        </div>
      ) : null}
    </div>
  );
}
