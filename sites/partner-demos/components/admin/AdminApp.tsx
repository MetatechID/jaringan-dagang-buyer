"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";
import { getAuth } from "firebase/auth";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  changes?: FileChange[];
  applied?: { branch: string; sha: string; preview_url: string; pr?: { number: number; url: string } | null };
  ts: number;
}

interface FileChange {
  path: string;
  content: string;
  why?: string;
}

interface CommitWithFunnel {
  sha: string;
  message: string;
  authorName: string;
  date: string;
  url: string;
  funnel: null | {
    sessions: number;
    product_viewers: number;
    carters: number;
    checkouts: number;
    atc_rate: number;
    checkout_rate: number;
    atc_to_checkout_rate: number;
  };
}

const BAP_FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function getIdToken(): Promise<string | null> {
  try {
    const auth = getAuth();
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as any),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(body?.error || `${res.status} ${path}`);
  return body as T;
}

function newBranchName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `vibe/${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

export function AdminApp({ brandSlug }: { brandSlug: string }) {
  const { signedIn, signInIdentity, email, displayName, brandTheme } = useBeliAman();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Halo! Saya editor vibe untuk Safiya Food. Bilang aja apa yang mau diubah — warna brand, hero, tambah produk, pasang Google Analytics — dan saya bikinin preview deploynya.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<null | "chat" | "apply" | "publish" | "revert">(null);
  const [err, setErr] = useState<string | null>(null);
  const [draftBranch, setDraftBranch] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [commits, setCommits] = useState<CommitWithFunnel[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history once signed in.
  useEffect(() => {
    if (!signedIn) return;
    api<{ commits: CommitWithFunnel[] }>("/api/admin/history")
      .then((r) => setCommits(r.commits))
      .catch((e) => setErr(String(e)));
  }, [signedIn]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setErr(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: text, ts: Date.now() }];
    setMessages(next);
    setInput("");
    setBusy("chat");
    try {
      const r = await api<{ message: string; changes: FileChange[] }>("/api/admin/chat", {
        method: "POST",
        body: JSON.stringify({
          conversation: next
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
          branch: draftBranch ?? "main",
        }),
      });
      setMessages((curr) => [
        ...curr,
        { role: "assistant", content: r.message || "(no reply)", changes: r.changes, ts: Date.now() },
      ]);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(null);
    }
  }, [busy, draftBranch, input, messages]);

  const applyChanges = useCallback(
    async (changes: FileChange[], title: string) => {
      if (!changes?.length || busy) return;
      setBusy("apply");
      setErr(null);
      const branch = draftBranch ?? newBranchName();
      try {
        const r = await api<{
          ok: true; branch: string; sha: string; preview_url: string;
          pr: null | { number: number; url: string };
        }>("/api/admin/apply", {
          method: "POST",
          body: JSON.stringify({ branch, title, changes }),
        });
        setDraftBranch(r.branch);
        setPreviewUrl(r.preview_url);
        setMessages((curr) => [
          ...curr,
          {
            role: "system",
            content: `Committed ${r.sha.slice(0, 7)} to ${r.branch}. Preview building…`,
            applied: { branch: r.branch, sha: r.sha, preview_url: r.preview_url, pr: r.pr },
            ts: Date.now(),
          },
        ]);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(null);
      }
    },
    [busy, draftBranch],
  );

  const publish = useCallback(async () => {
    if (!draftBranch || busy) return;
    setBusy("publish");
    setErr(null);
    try {
      const r = await api<{ ok: true; sha: string }>("/api/admin/publish", {
        method: "POST",
        body: JSON.stringify({ branch: draftBranch, title: `Publish ${draftBranch}` }),
      });
      setMessages((curr) => [
        ...curr,
        { role: "system", content: `✓ Published to main as ${r.sha.slice(0, 7)} — production rebuilding.`, ts: Date.now() },
      ]);
      setDraftBranch(null);
      setPreviewUrl(null);
      // Reload commit history.
      api<{ commits: CommitWithFunnel[] }>("/api/admin/history").then((r2) => setCommits(r2.commits));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(null);
    }
  }, [busy, draftBranch]);

  const revert = useCallback(
    async (sha: string) => {
      if (busy) return;
      if (!confirm(`Revert commit ${sha.slice(0, 7)} on production?`)) return;
      setBusy("revert");
      setErr(null);
      try {
        const r = await api<{ ok: true; revert_sha: string }>("/api/admin/revert", {
          method: "POST",
          body: JSON.stringify({ sha }),
        });
        setMessages((curr) => [
          ...curr,
          { role: "system", content: `↩ Reverted ${sha.slice(0, 7)} → new commit ${r.revert_sha.slice(0, 7)}.`, ts: Date.now() },
        ]);
        api<{ commits: CommitWithFunnel[] }>("/api/admin/history").then((r2) => setCommits(r2.commits));
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(null);
      }
    },
    [busy],
  );

  if (!signedIn) {
    return (
      <SignInGate brandSlug={brandSlug} brandPrimary={brandTheme.colors.primary} onSignIn={signInIdentity} />
    );
  }

  const accent = brandTheme.colors.primary;

  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
        display: "grid",
        gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr) minmax(0, 320px)",
        background: "#0F172A",
        color: "#E2E8F0",
      }}
      className="admin-grid"
    >
      {/* ---- Left: chat ---- */}
      <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: accent, textTransform: "uppercase" }}>
            Vibe Editor · Safiya Food
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
            Logged in as {email}
          </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", minHeight: 0 }}>
          {messages.map((m, i) => (
            <ChatBubble key={i} msg={m} accent={accent} onApply={(c) => applyChanges(c, m.content.slice(0, 80) || "Vibe change")} />
          ))}
          {busy === "chat" ? (
            <div style={{ padding: 12, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Thinking…</div>
          ) : null}
        </div>

        {err ? (
          <div style={{ padding: 10, fontSize: 12, color: "#fca5a5", background: "rgba(220,38,38,0.18)", borderTop: "1px solid #7f1d1d" }}>
            {err}
            <button onClick={() => setErr(null)} style={{ float: "right", background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer" }}>×</button>
          </div>
        ) : null}

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mau ubah apa? (mis. 'ganti warna brand ke hijau zaitun')"
            disabled={!!busy}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#E2E8F0",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!!busy || !input.trim()}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: accent,
              color: "#fff",
              border: 0,
              fontWeight: 700,
              fontSize: 13,
              cursor: input.trim() && !busy ? "pointer" : "not-allowed",
              opacity: input.trim() && !busy ? 1 : 0.5,
            }}
          >
            Kirim
          </button>
        </form>
      </div>

      {/* ---- Center: preview ---- */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            {draftBranch ? (
              <>Preview: <strong style={{ color: "#fff" }}>{draftBranch}</strong></>
            ) : (
              <>Production: <strong style={{ color: "#fff" }}>main</strong></>
            )}
          </div>
          <div style={{ flex: 1 }} />
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: accent, textDecoration: "underline" }}>
              Buka preview ↗
            </a>
          ) : null}
          {draftBranch ? (
            <button
              onClick={publish}
              disabled={busy === "publish"}
              style={{
                padding: "8px 14px",
                background: "#16a34a",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {busy === "publish" ? "Publishing…" : "Publish ke main"}
            </button>
          ) : null}
        </div>
        <div style={{ flex: 1, background: "#000", minHeight: 0 }}>
          <iframe
            key={previewUrl ?? `prod-${commits[0]?.sha ?? "main"}`}
            src={previewUrl ?? `https://beli-aman.metatech.id/${brandSlug}`}
            title="Storefront preview"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
          />
        </div>
      </div>

      {/* ---- Right: version history ---- */}
      <div style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: accent, textTransform: "uppercase" }}>
            Versi Production
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
            Setiap commit = satu versi yang bisa kamu rollback ke. Funnel = real traffic 14 hari.
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {commits.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Loading…</div>
          ) : null}
          {commits.map((c) => (
            <div key={c.sha} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, lineHeight: 1.35 }}>{c.message}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.45)", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "ui-monospace, monospace" }}>{c.sha.slice(0, 7)}</span>
                <span>·</span>
                <span>{c.authorName}</span>
                <span>·</span>
                <span>{new Date(c.date).toLocaleString("id-ID")}</span>
              </div>
              {c.funnel ? (
                <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, fontSize: 11, lineHeight: 1.6, color: "#cbd5e1" }}>
                  <div>👀 {c.funnel.sessions} sesi · 🛒 {(c.funnel.atc_rate * 100).toFixed(1)}% ATC · 💳 {(c.funnel.checkout_rate * 100).toFixed(1)}% checkout</div>
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Belum ada traffic untuk versi ini.</div>
              )}
              <div style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 11 }}>
                <a href={c.url} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "underline" }}>GitHub ↗</a>
                <button
                  onClick={() => revert(c.sha)}
                  disabled={busy === "revert"}
                  style={{ background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }}
                >
                  Revert ke versi sebelumnya
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 1024px) {
          .admin-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: minmax(0, 1fr) minmax(0, 1fr) auto !important;
          }
        }
      `}</style>
    </div>
  );
}

function ChatBubble({
  msg,
  accent,
  onApply,
}: {
  msg: ChatMessage;
  accent: string;
  onApply: (changes: FileChange[]) => void;
}) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";
  return (
    <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "100%",
          padding: "10px 14px",
          borderRadius: 14,
          background: isUser ? accent : isSystem ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)",
          color: isUser ? "#fff" : "#E2E8F0",
          fontSize: 13,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          fontStyle: isSystem ? "italic" : "normal",
        }}
      >
        {msg.content}
      </div>
      {msg.changes && msg.changes.length > 0 ? (
        <div
          style={{
            marginTop: 8,
            background: "rgba(212,162,76,0.10)",
            border: "1px solid rgba(212,162,76,0.40)",
            borderRadius: 10,
            padding: 10,
            width: "100%",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#D4A24C", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            {msg.changes.length} file change{msg.changes.length === 1 ? "" : "s"}
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
            {msg.changes.map((c, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <span style={{ fontFamily: "ui-monospace, monospace", color: "#fde68a" }}>{c.path}</span>
                {c.why ? ` — ${c.why}` : ""}
              </li>
            ))}
          </ul>
          <button
            onClick={() => onApply(msg.changes!)}
            style={{
              marginTop: 8,
              padding: "8px 14px",
              background: accent,
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Apply &amp; Preview
          </button>
        </div>
      ) : null}
      {msg.applied ? (
        <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
          {msg.applied.pr ? (
            <a href={msg.applied.pr.url} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "underline" }}>
              PR #{msg.applied.pr.number} ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SignInGate({ brandSlug, brandPrimary, onSignIn }: { brandSlug: string; brandPrimary: string; onSignIn: () => Promise<void> }) {
  return (
    <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: brandPrimary, textTransform: "uppercase", marginBottom: 10 }}>
          Vibe Editor
        </div>
        <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 28, fontWeight: 700, margin: 0, color: brandPrimary }}>
          Edit toko Anda dengan cara ngobrol.
        </h1>
        <p style={{ marginTop: 12, color: "var(--c-text-muted)", fontSize: 14, lineHeight: 1.55 }}>
          Login dengan Beli Aman identity Anda. Setiap perubahan jadi preview deploy
          dulu — baru klik Publish kalau sudah pas. Setiap versi bisa di-rollback.
        </p>
        <button
          onClick={() => onSignIn().catch((e) => alert(String(e)))}
          style={{
            marginTop: 24,
            padding: "12px 22px",
            background: brandPrimary,
            color: "#fff",
            border: 0,
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Masuk dengan Beli Aman
        </button>
        <div style={{ marginTop: 24, fontSize: 11, color: "var(--c-text-muted)" }}>
          ← <Link href={`/${brandSlug}`} style={{ color: "inherit" }}>Kembali ke toko</Link>
        </div>
      </div>
    </div>
  );
}
