export function SafiyaHero() {
  return (
    <section
      style={{
        position: "relative",
        background:
          "linear-gradient(135deg, #FBF6EC 0%, #F3E7CF 60%, #E9D9B5 100%)",
        borderBottom: "1px solid rgba(107, 44, 26, 0.10)",
        overflow: "hidden",
      }}
    >
      {/* Decorative ornament */}
      <svg
        viewBox="0 0 600 600"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -120,
          right: -180,
          width: 560,
          height: 560,
          opacity: 0.18,
          pointerEvents: "none",
        }}
      >
        <defs>
          <radialGradient id="ornGold" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#D4A24C" />
            <stop offset="100%" stopColor="#D4A24C" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="300" r="280" fill="url(#ornGold)" />
        <g stroke="#6B2C1A" strokeWidth="1.4" fill="none" opacity="0.5">
          <circle cx="300" cy="300" r="200" />
          <circle cx="300" cy="300" r="160" />
          <path d="M 100 300 Q 300 100 500 300 Q 300 500 100 300 Z" />
          <path d="M 300 100 Q 500 300 300 500 Q 100 300 300 100 Z" />
        </g>
      </svg>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "72px 24px 88px",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: 48,
          alignItems: "center",
        }}
        className="safiya-hero-grid"
      >
        <div>
          <span
            style={{
              display: "inline-block",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#6B2C1A",
              opacity: 0.85,
              marginBottom: 16,
            }}
          >
            Authentic · Premium · Halal
          </span>
          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(40px, 6vw, 72px)",
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#2A1810",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Kurma & Healthy Pantry,
            <br />
            <span style={{ color: "#6B2C1A", fontStyle: "italic", fontWeight: 600 }}>
              dari kebun ke meja Anda.
            </span>
          </h1>
          <p
            style={{
              marginTop: 18,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "clamp(14px, 1.7vw, 16px)",
              lineHeight: 1.6,
              color: "#5A4A3A",
              maxWidth: 480,
            }}
          >
            Sukari, Ajwa Madinah, Tunisia Tangkai — plus muesli, madu murni,
            chia seed, beras merah, dan saffron. Healthy, tasty, and affordable
            food solution untuk keluarga Indonesia.
          </p>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <a
              href="#kurma"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#6B2C1A",
                color: "#FBF6EC",
                padding: "12px 22px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Belanja Kurma Premium →
            </a>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(107,44,26,0.16)",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color: "#6B2C1A",
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
            maxHeight: 460,
            justifySelf: "center",
            width: "100%",
            maxWidth: 460,
          }}
        >
          <img
            src="/brands/safiyafood/hero/main.svg"
            alt="Safiya Food premium kurma & healthy pantry"
            loading="eager"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 30px 40px rgba(107,44,26,0.18))",
            }}
          />
        </div>
      </div>
      <style>{`
        @media (max-width: 880px) {
          .safiya-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
            padding: 48px 24px 56px !important;
          }
        }
      `}</style>
    </section>
  );
}
