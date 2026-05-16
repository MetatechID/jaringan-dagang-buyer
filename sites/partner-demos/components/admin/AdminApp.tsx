"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useBeliAman } from "@jaringan-dagang/beli-aman-sdk";
import { getApps } from "firebase/app";
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
  funnel: null | FunnelStats;
}

interface FunnelStats {
  sessions: number;
  product_viewers: number;
  carters: number;
  checkouts: number;
  atc_rate: number;
  checkout_rate: number;
  atc_to_checkout_rate: number;
}

interface DraftBranchEntry {
  branch: string;
  pr_number: number | null;
  pr_url: string | null;
  pr_title: string | null;
  head_sha: string;
  last_commit_message: string;
  last_commit_date: string;
  preview_url: string | null;
}

interface CompareResult {
  a: { sha: string; funnel: FunnelStats | null };
  b: { sha: string; funnel: FunnelStats | null };
  delta: null | {
    sessions: number;
    atc_rate_pp: number;
    checkout_rate_pp: number;
    atc_to_checkout_rate_pp: number;
  };
  days: number;
}

const BAP_FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function getIdToken(): Promise<string | null> {
  // The Beli Aman SDK initializes Firebase as a *named* app ("beli-aman-sdk"),
  // not the default one — so `getAuth()` with no argument silently returns
  // a different auth instance that never has the signed-in user. Look at
  // every initialized app and use the first one with a currentUser. Wait up
  // to 5s for the auth state to settle.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const apps = getApps();
      for (const app of apps) {
        const auth = getAuth(app);
        if (auth.currentUser) {
          return await auth.currentUser.getIdToken();
        }
      }
    } catch {
      /* swallow */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
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
  const [drafts, setDrafts] = useState<DraftBranchEntry[]>([]);
  const [whoami, setWhoami] = useState<null | {
    ok: boolean;
    reason: string | null;
    seen_email: string | null;
    allowlist: string[] | null;
  }>(null);
  const [compareSel, setCompareSel] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshDrafts = useCallback(() => {
    api<{ drafts: DraftBranchEntry[] }>("/api/admin/drafts")
      .then((r) => setDrafts(r.drafts))
      .catch(() => {/* drafts optional */});
  }, []);

  // Once signed in, fetch /whoami so we can show exactly what the server saw
  // — and only then try to load /history.
  useEffect(() => {
    if (!signedIn) return;
    api<{ ok: boolean; reason: string | null; seen_email: string | null; allowlist: string[] | null }>(
      "/api/admin/whoami",
    )
      .then((w) => {
        setWhoami(w);
        if (!w.ok) return;
        api<{ commits: CommitWithFunnel[] }>("/api/admin/history").then((r) => setCommits(r.commits));
        refreshDrafts();
      })
      .catch((e) => setErr(String(e)));
  }, [signedIn, refreshDrafts]);

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
          ok: true; branch: string; sha: string; preview_url: string | null;
          pr: null | { number: number; url: string };
        }>("/api/admin/apply", {
          method: "POST",
          body: JSON.stringify({ branch, title, changes }),
        });
        setDraftBranch(r.branch);
        if (r.preview_url) setPreviewUrl(r.preview_url);
        setMessages((curr) => [
          ...curr,
          {
            role: "system",
            content: r.preview_url
              ? `Committed ${r.sha.slice(0, 7)} to ${r.branch}. Preview building…`
              : `Committed ${r.sha.slice(0, 7)} to ${r.branch}. Vercel is queueing the build…`,
            applied: { branch: r.branch, sha: r.sha, preview_url: r.preview_url ?? "", pr: r.pr },
            ts: Date.now(),
          },
        ]);
        // Poll until Vercel reports READY (max ~3 min).
        pollPreview(r.branch);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(null);
      }
    },
    [busy, draftBranch],
  );

  const pollPreview = useCallback(async (branch: string) => {
    const deadline = Date.now() + 3 * 60 * 1000;
    while (Date.now() < deadline) {
      try {
        const r = await api<{ deployment: null | { url: string; ready: boolean; state: string } }>(
          `/api/admin/preview?branch=${encodeURIComponent(branch)}`,
        );
        if (r.deployment) {
          setPreviewUrl(`${r.deployment.url}/${brandSlug}`);
          if (r.deployment.ready) return;
        }
      } catch {
        /* swallow */
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
  }, [brandSlug]);

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

  const discardDraft = useCallback(
    async (branch: string) => {
      if (busy) return;
      if (!confirm(`Discard draft branch ${branch}? Will close the PR and delete the branch.`)) return;
      setBusy("revert");
      setErr(null);
      try {
        await api(`/api/admin/drafts?branch=${encodeURIComponent(branch)}`, { method: "DELETE" });
        setMessages((curr) => [...curr, { role: "system", content: `🗑 Discarded draft ${branch}.`, ts: Date.now() }]);
        if (draftBranch === branch) {
          setDraftBranch(null);
          setPreviewUrl(null);
        }
        refreshDrafts();
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(null);
      }
    },
    [busy, draftBranch, refreshDrafts],
  );

  const toggleCompareSel = useCallback(
    (sha: string) => {
      setCompareSel((curr) => {
        if (curr.includes(sha)) return curr.filter((s) => s !== sha);
        if (curr.length >= 2) return [curr[1], sha];
        return [...curr, sha];
      });
      setCompareResult(null);
    },
    [],
  );

  const runCompare = useCallback(async () => {
    if (compareSel.length !== 2 || busy) return;
    setErr(null);
    try {
      const r = await api<CompareResult>(`/api/admin/compare?a=${compareSel[0]}&b=${compareSel[1]}&days=30`);
      setCompareResult(r);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }, [busy, compareSel]);

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

  // Signed in but the server's auth layer rejected us — show a friendly
  // breakdown so the user knows exactly what email was seen and which
  // allowlist they're missing from.
  if (whoami && !whoami.ok) {
    return (
      <NotAllowedPanel
        brandSlug={brandSlug}
        accent={brandTheme.colors.primary}
        seenEmail={whoami.seen_email}
        allowlist={whoami.allowlist}
        reason={whoami.reason}
      />
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

      {/* ---- Right: drafts + version history ---- */}
      <div style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        {drafts.length > 0 ? (
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "12px 16px", maxHeight: "32%", overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: "#fbbf24", textTransform: "uppercase", marginBottom: 8 }}>
              Draft Aktif · {drafts.length}
            </div>
            {drafts.map((d) => (
              <div key={d.branch} style={{ marginBottom: 8, padding: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.24)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fde68a", fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}>{d.branch}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2, lineHeight: 1.35 }}>
                  {d.last_commit_message || "(empty)"}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11 }}>
                  {d.preview_url ? (
                    <a href={d.preview_url} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "underline" }}>Preview ↗</a>
                  ) : null}
                  {d.pr_url ? (
                    <a href={d.pr_url} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "underline" }}>PR #{d.pr_number} ↗</a>
                  ) : null}
                  <button
                    onClick={() => discardDraft(d.branch)}
                    disabled={busy === "revert"}
                    style={{ background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: accent, textTransform: "uppercase" }}>
              Versi Production
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
              {compareSel.length === 0 ? "Klik 2 versi untuk bandingkan" : `${compareSel.length}/2 dipilih`}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
            Setiap commit = satu versi yang bisa di-rollback. Funnel = real traffic 30 hari.
          </div>
          {compareSel.length === 2 ? (
            <button
              onClick={runCompare}
              style={{ marginTop: 8, padding: "6px 12px", background: accent, color: "#fff", border: 0, borderRadius: 999, fontWeight: 700, fontSize: 11, cursor: "pointer" }}
            >
              Bandingkan {compareSel[0].slice(0, 7)} ↔ {compareSel[1].slice(0, 7)}
            </button>
          ) : null}
          {compareResult ? <CompareSummary res={compareResult} onClose={() => { setCompareResult(null); setCompareSel([]); }} /> : null}
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {commits.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Loading…</div>
          ) : null}
          {commits.map((c) => {
            const selected = compareSel.includes(c.sha);
            return (
              <div
                key={c.sha}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: selected ? "rgba(212,162,76,0.08)" : "transparent",
                  borderLeft: selected ? `3px solid ${accent}` : "3px solid transparent",
                }}
              >
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
                <div style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 11, flexWrap: "wrap" }}>
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "underline" }}>GitHub ↗</a>
                  <button
                    onClick={() => toggleCompareSel(c.sha)}
                    style={{ background: "transparent", border: 0, color: selected ? "#fde68a" : "rgba(255,255,255,0.55)", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }}
                  >
                    {selected ? "✓ Pilih untuk bandingkan" : "Pilih untuk bandingkan"}
                  </button>
                  <button
                    onClick={() => revert(c.sha)}
                    disabled={busy === "revert"}
                    style={{ background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }}
                  >
                    Revert
                  </button>
                </div>
              </div>
            );
          })}
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

function CompareSummary({ res, onClose }: { res: CompareResult; onClose: () => void }) {
  const fmtPct = (v?: number) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
  const fmtPP = (v?: number) => {
    if (v == null) return "—";
    const sign = v > 0 ? "+" : v < 0 ? "" : "±";
    return `${sign}${v.toFixed(1)}pp`;
  };
  const color = (v?: number) => (v == null ? "#94a3b8" : v > 0 ? "#86efac" : v < 0 ? "#fca5a5" : "#cbd5e1");
  const a = res.a.funnel;
  const b = res.b.funnel;
  return (
    <div style={{ marginTop: 10, padding: 10, background: "rgba(15,118,110,0.10)", border: "1px solid rgba(15,118,110,0.40)", borderRadius: 8, fontSize: 11, color: "#cbd5e1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, color: "#86efac", textTransform: "uppercase", letterSpacing: 1.4, fontSize: 10 }}>
          A {res.a.sha.slice(0, 7)} ↔ B {res.b.sha.slice(0, 7)} · {res.days}d
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: 0, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 11 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, lineHeight: 1.7 }}>
        <div></div>
        <div style={{ color: "#fff", fontWeight: 700 }}>A</div>
        <div style={{ color: "#fff", fontWeight: 700 }}>B</div>
        <div style={{ color: "rgba(255,255,255,0.6)" }}>sesi</div>
        <div>{a?.sessions ?? "—"}</div>
        <div>{b?.sessions ?? "—"}</div>
        <div style={{ color: "rgba(255,255,255,0.6)" }}>ATC%</div>
        <div>{fmtPct(a?.atc_rate)}</div>
        <div>{fmtPct(b?.atc_rate)}</div>
        <div style={{ color: "rgba(255,255,255,0.6)" }}>Checkout%</div>
        <div>{fmtPct(a?.checkout_rate)}</div>
        <div>{fmtPct(b?.checkout_rate)}</div>
      </div>
      {res.delta ? (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgba(255,255,255,0.16)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div style={{ color: "rgba(255,255,255,0.6)" }}>ΔATC</div>
          <div style={{ color: color(res.delta.atc_rate_pp), fontWeight: 700 }}>{fmtPP(res.delta.atc_rate_pp)}</div>
          <div style={{ color: "rgba(255,255,255,0.6)" }}>ΔCheckout</div>
          <div style={{ color: color(res.delta.checkout_rate_pp), fontWeight: 700 }}>{fmtPP(res.delta.checkout_rate_pp)}</div>
        </div>
      ) : (
        <div style={{ marginTop: 6, color: "rgba(255,255,255,0.45)" }}>
          Tidak ada traffic untuk salah satu / kedua versi — coba pilih commit yang sudah lebih lama hidup di production.
        </div>
      )}
    </div>
  );
}

function NotAllowedPanel({
  brandSlug,
  accent,
  seenEmail,
  allowlist,
  reason,
}: {
  brandSlug: string;
  accent: string;
  seenEmail: string | null;
  allowlist: string[] | null;
  reason: string | null;
}) {
  return (
    <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 10 }}>
          Akses Ditolak
        </div>
        <h1 style={{ fontFamily: "var(--font-jakarta), Inter, sans-serif", fontSize: 26, fontWeight: 800, margin: 0, color: accent }}>
          Email kamu belum terdaftar di Vibe Editor.
        </h1>
        <p style={{ marginTop: 12, color: "var(--c-text-muted)", fontSize: 14, lineHeight: 1.55 }}>
          Kami berhasil membaca akun Beli Aman kamu, tapi belum ada di daftar
          admin storefront ini.
        </p>
        <div style={{ marginTop: 18, padding: 14, background: "var(--c-surface)", borderRadius: 10, border: "1px solid rgba(15,23,42,0.08)", fontSize: 13, lineHeight: 1.7 }}>
          <div>Email kamu (dari Google sign-in): <strong style={{ fontFamily: "ui-monospace, monospace" }}>{seenEmail ?? "(tidak terbaca)"}</strong></div>
          <div>
            Daftar admin yang diizinkan:{" "}
            <strong style={{ fontFamily: "ui-monospace, monospace" }}>
              {allowlist && allowlist.length ? allowlist.join(", ") : "(kosong)"}
            </strong>
          </div>
          {reason ? <div style={{ marginTop: 4, color: "var(--c-text-muted)" }}>Reason: {reason}</div> : null}
        </div>
        <p style={{ marginTop: 14, fontSize: 12, color: "var(--c-text-muted)" }}>
          Cara fix: minta admin tambahkan email kamu ke <code>ADMIN_EMAILS</code> di Vercel env (Production) untuk project <code>beli-aman-storefronts</code>.
        </p>
        <div style={{ marginTop: 20 }}>
          <a
            href={`/${brandSlug}`}
            style={{
              display: "inline-block",
              padding: "10px 18px",
              background: accent,
              color: "#fff",
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            ← Kembali ke toko
          </a>
        </div>
      </div>
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
        <h1 style={{ fontFamily: "var(--font-jakarta), Inter, system-ui, sans-serif", fontSize: 28, fontWeight: 700, margin: 0, color: brandPrimary }}>
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
