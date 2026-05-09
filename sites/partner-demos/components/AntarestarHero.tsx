export function AntarestarHero() {
  return (
    <section
      style={{
        background: "#fff",
        borderBottom: "1px solid #EEE",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 24px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Montserrat, system-ui, sans-serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.22em",
            color: "#777",
            textTransform: "uppercase",
          }}
        >
          Outdoor + Utility
        </span>
        <h1
          style={{
            fontFamily: "Montserrat, system-ui, sans-serif",
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 400,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#1F2937",
            margin: 0,
          }}
        >
          Let&rsquo;s Go Out!
        </h1>
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
