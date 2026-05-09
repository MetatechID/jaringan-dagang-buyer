"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  "https://antarestar.com/wp-content/uploads/2025/11/BANNER-SLIDE-1.png",
  "https://antarestar.com/wp-content/uploads/2025/11/BANNER-SLIDE-2.png",
  "https://antarestar.com/wp-content/uploads/2025/11/BANNER-SLIDE-3.png",
];

export function AntarestarHero() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section style={{ background: "#fff" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1091 / 800", maxHeight: 560, overflow: "hidden" }}>
        {SLIDES.map((src, idx) => (
          <img
            key={src}
            src={src}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: idx === i ? 1 : 0,
              transition: "opacity 700ms ease",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
          }}
        >
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setI(idx)}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                background: idx === i ? "#404040" : "rgba(64,64,64,0.35)",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px 0", display: "inline-flex" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            background: "#F7F7F7",
            border: "1px solid #E5E5E5",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            color: "#404040",
          }}
        >
          🛡️ Dilindungi Beli Aman · Bayar dengan tenang
        </span>
      </div>
    </section>
  );
}
