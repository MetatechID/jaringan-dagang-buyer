"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { trackEvent } from "@/lib/analytics";

interface Slide {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  cta: { label: string; href: string };
  bg: string;        // CSS background
  fg: string;        // primary text color
  accent: string;    // eyebrow / cta color
  art: string;       // image path
}

const SLIDES: Slide[] = [
  {
    id: "ramadhan",
    eyebrow: "🌙 PROMO RAMADHAN 1447 H",
    title: (
      <>
        Hampers Ramadhan,
        <br />
        <em style={{ fontStyle: "italic", fontWeight: 600 }}>
          tiga paket untuk berkah keluarga
        </em>
      </>
    ),
    subtitle: "Mulai Rp 165.000 · Hemat hingga 25%",
    cta: { label: "Lihat Paket Hampers →", href: "/safiyafood/promo" },
    bg: "linear-gradient(135deg, #2A1810 0%, #5C2A18 55%, #7A4419 100%)",
    fg: "#FBF6EC",
    accent: "#D4A24C",
    art: "/brands/safiyafood/products/saf-suk-850.svg",
  },
  {
    id: "sukari",
    eyebrow: "AUTHENTIC · PREMIUM · HALAL",
    title: (
      <>
        Kurma Sukari,
        <br />
        <em style={{ fontStyle: "italic", fontWeight: 600 }}>
          dari Saudi Arabia
        </em>
      </>
    ),
    subtitle: "Mulai Rp 89.000 · 500g · 850g · 1kg · 3kg",
    cta: { label: "Belanja Kurma →", href: "/safiyafood/product/kurma-sukari" },
    bg: "linear-gradient(135deg, #FBF6EC 0%, #F3E7CF 60%, #E9D9B5 100%)",
    fg: "#2A1810",
    accent: "#6B2C1A",
    art: "/brands/safiyafood/products/saf-suk-500.svg",
  },
  {
    id: "muesli",
    eyebrow: "SARAPAN SEHAT",
    title: (
      <>
        Muesli &amp; Madu Murni,
        <br />
        <em style={{ fontStyle: "italic", fontWeight: 600 }}>
          tinggi serat, BPOM RI
        </em>
      </>
    ),
    subtitle: "Mulai Rp 65.000 · Gratis ongkir di atas Rp 250.000",
    cta: { label: "Lihat Pilihan Sereal →", href: "/safiyafood#sereal" },
    bg: "linear-gradient(135deg, #3A1B0E 0%, #6B2C1A 65%, #8B4319 100%)",
    fg: "#FBF6EC",
    accent: "#E4C167",
    art: "/brands/safiyafood/products/saf-mus-fs-500.svg",
  },
];

const ROTATE_MS = 5500;

export function SafiyaHeroCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[idx];

  return (
    <section
      className="safiya-hero-carousel"
      aria-roledescription="carousel"
      aria-label="Promo Safiya Food"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        background: slide.bg,
        color: slide.fg,
        overflow: "hidden",
        borderBottom: "1px solid rgba(15,23,42,0.06)",
        transition: "background 0.4s ease",
      }}
    >
      <div
        className="safiya-hero-carousel-inner"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 20px 28px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
          gap: 24,
          alignItems: "center",
          minHeight: 280,
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: 2.4,
              color: slide.accent,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            {slide.eyebrow}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
              fontSize: "clamp(22px, 4vw, 38px)",
              fontWeight: 700,
              lineHeight: 1.12,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {slide.title}
          </h1>
          <p
            style={{
              marginTop: 10,
              fontSize: "clamp(12px, 1.4vw, 14px)",
              lineHeight: 1.55,
              opacity: 0.88,
              maxWidth: 480,
            }}
          >
            {slide.subtitle}
          </p>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={slide.cta.href}
              onClick={() => trackEvent("hero_cta_click", "safiyafood", { slide_id: slide.id })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: slide.accent,
                color: slide.bg.includes("#FBF6EC") || slide.bg.includes("#F3E7CF") ? "#FBF6EC" : "#2A1810",
                padding: "10px 18px",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
                textDecoration: "none",
                letterSpacing: 0.3,
              }}
            >
              {slide.cta.label}
            </Link>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                color: slide.fg,
                backdropFilter: "blur(4px)",
              }}
            >
              🛡️ Dilindungi Beli Aman
            </span>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            aspectRatio: "1 / 1",
            maxHeight: 240,
            justifySelf: "center",
            width: "100%",
            maxWidth: 240,
          }}
        >
          <img
            src={slide.art}
            alt=""
            loading="eager"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 18px 32px rgba(0,0,0,0.20))",
            }}
          />
        </div>
      </div>

      {/* Dots */}
      <div
        role="tablist"
        aria-label="Pilih slide"
        style={{
          position: "absolute",
          bottom: 12,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === idx}
            aria-label={`Slide ${i + 1} dari ${SLIDES.length}`}
            onClick={() => setIdx(i)}
            style={{
              width: i === idx ? 22 : 8,
              height: 8,
              borderRadius: 999,
              border: 0,
              background: i === idx ? slide.accent : "rgba(255,255,255,0.45)",
              cursor: "pointer",
              padding: 0,
              transition: "width 0.25s ease, background 0.25s ease",
            }}
          />
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .safiya-hero-carousel-inner {
            grid-template-columns: 1fr !important;
            text-align: left !important;
            padding: 22px 16px 36px !important;
            gap: 14px !important;
            min-height: 0 !important;
          }
          .safiya-hero-carousel-inner > div:last-child {
            max-height: 160px !important;
            max-width: 160px !important;
            justify-self: flex-end !important;
            margin-top: -30px !important;
          }
        }
      `}</style>
    </section>
  );
}
