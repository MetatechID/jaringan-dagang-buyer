"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";

import { useCart } from "@/lib/cart";

/** Sayurbox / Astronauts-style sticky bottom nav.
 *  Mobile only — desktop hides it. */
export function MobileBottomNav({ brandSlug }: { brandSlug: string }) {
  const pathname = usePathname() || "";
  const { signedIn, signInIdentity, brandTheme } = useBeliAman();
  const { totalCount } = useCart(brandSlug);

  const homePath = `/${brandSlug}`;
  const promoPath = `/${brandSlug}/promo`;
  const cartPath = `/${brandSlug}/cart`;

  const items: Array<{ label: string; icon: string; href?: string; onClick?: () => void; active: boolean; badge?: number }> = [
    {
      label: "Beranda",
      icon: "🏠",
      href: homePath,
      active: pathname === homePath,
    },
    {
      label: "Promo",
      icon: "🌙",
      href: promoPath,
      active: pathname.startsWith(promoPath),
    },
    {
      label: "Keranjang",
      icon: "🛒",
      href: cartPath,
      active: pathname.startsWith(cartPath),
      badge: totalCount,
    },
    {
      label: signedIn ? "Akun" : "Masuk",
      icon: signedIn ? "👤" : "🔑",
      onClick: signedIn ? undefined : () => { void signInIdentity().catch(() => {}); },
      href: signedIn ? cartPath : undefined,  // signed-in tab does nothing useful yet — link to cart
      active: false,
    },
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: "#fff",
        borderTop: "1px solid rgba(15,23,42,0.10)",
        display: "none",
        boxShadow: "0 -2px 12px rgba(15,23,42,0.05)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Navigasi bawah"
    >
      <ul
        style={{
          margin: 0,
          padding: "6px 4px 4px",
          listStyle: "none",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
        }}
      >
        {items.map((it) => {
          const inner = (
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "6px 4px 8px",
                color: it.active ? brandTheme.colors.primary : "rgba(15,23,42,0.65)",
                fontWeight: it.active ? 700 : 500,
                fontSize: 10.5,
                letterSpacing: 0.3,
                position: "relative",
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1, position: "relative" }}>
                {it.icon}
                {it.badge && it.badge > 0 ? (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -10,
                      background: brandTheme.colors.accent,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 800,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 999,
                      padding: "0 4px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                ) : null}
              </span>
              {it.label}
            </span>
          );
          return (
            <li key={it.label} style={{ margin: 0, padding: 0, textAlign: "center" }}>
              {it.href ? (
                <Link
                  href={it.href}
                  onClick={it.onClick}
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={it.onClick}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <style>{`
        @media (max-width: 768px) {
          .mobile-bottom-nav { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
