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
  // Initialize the draft from ?draft=BRANCH so refresh/share doesn't strip
  // state. The URL-sync effect below will write back to the same URL.
  const [draftBranch, setDraftBranch] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("draft");
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBuilding, setPreviewBuilding] = useState(false);
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
  const [domainsOpen, setDomainsOpen] = useState(false);
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
        api<{ commits: CommitWithFunnel[] }>(`/api/admin/history?tenant=${encodeURIComponent(brandSlug)}`).then((r) => setCommits(r.commits));
        refreshDrafts();
      })
      .catch((e) => setErr(String(e)));
  }, [signedIn, refreshDrafts]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  // Mirror the active draft to ?draft=BRANCH so the marketing team can refresh
  // or share the URL and land back on the same preview.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (draftBranch) u.searchParams.set("draft", draftBranch);
    else u.searchParams.delete("draft");
    window.history.replaceState(null, "", u.toString());
  }, [draftBranch]);

  // pollPreview + applyChanges are declared BEFORE send so send can call
  // applyChanges directly (auto-apply on chat reply).
  const pollPreview = useCallback(async (branch: string) => {
    setPreviewBuilding(true);
    const deadline = Date.now() + 3 * 60 * 1000;
    while (Date.now() < deadline) {
      try {
        const r = await api<{ deployment: null | { url: string; ready: boolean; state: string } }>(
          `/api/admin/preview?branch=${encodeURIComponent(branch)}`,
        );
        if (r.deployment?.ready) {
          setPreviewUrl(`${r.deployment.url}/${brandSlug}`);
          setPreviewBuilding(false);
          return;
        }
      } catch {
        /* swallow */
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
    setPreviewBuilding(false);
  }, [brandSlug]);

  // Load a draft's current preview into the iframe and mark it active.
  // Used by the sidebar (click a draft) and by URL hydration (?draft=BRANCH).
  const openDraft = useCallback((branch: string) => {
    setDraftBranch(branch);
    setPreviewUrl(null);
    pollPreview(branch);
  }, [pollPreview]);

  // After sign-in, if a draft is already set (from ?draft=BRANCH on first
  // load), kick off the preview poll so the iframe loads its build.
  useEffect(() => {
    if (!signedIn || !draftBranch || previewUrl || previewBuilding) return;
    pollPreview(draftBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const applyChanges = useCallback(
    async (changes: FileChange[], title: string) => {
      if (!changes?.length) return;
      setBusy("apply");
      setErr(null);
      const branch = draftBranch ?? newBranchName();
      // Clear the iframe right away so the customer doesn't see the previous
      // (stale) build while Vercel is rebuilding. The pollPreview below will
      // set previewUrl back to a real URL only once the new deploy is READY.
      setPreviewUrl(null);
      setPreviewBuilding(true);
      try {
        const r = await api<{
          ok: true; branch: string; sha: string; preview_url: string | null;
          pr: null | { number: number; url: string };
        }>("/api/admin/apply", {
          method: "POST",
          body: JSON.stringify({ branch, title, changes, tenant: brandSlug }),
        });
        setDraftBranch(r.branch);
        setMessages((curr) => [
          ...curr,
          {
            role: "system",
            content: `✨ Perubahan dicatat di ${r.branch} (${r.sha.slice(0, 7)}). Lagi nyiapin pratinjau…`,
            applied: { branch: r.branch, sha: r.sha, preview_url: r.preview_url ?? "", pr: r.pr },
            ts: Date.now(),
          },
        ]);
        pollPreview(r.branch);
        refreshDrafts();
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(null);
      }
    },
    [brandSlug, draftBranch, pollPreview, refreshDrafts],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setErr(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: text, ts: Date.now() }];
    setMessages(next);
    setInput("");
    setBusy("chat");
    // Start the preview "building" state right away so the iframe blanks out
    // and the user sees the spinner the moment they hit Kirim — instead of
    // waiting for Claude to return changes.
    setPreviewUrl(null);
    setPreviewBuilding(true);
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
        { role: "assistant", content: r.message || "Oke, lagi nyiapin perubahannya…", changes: r.changes, ts: Date.now() },
      ]);
      // AUTO-APPLY: user never has to click "Apply" — we commit and preview
      // straight away. The only decision they make is whether to click
      // "Naikkan ke Produksi" at the top of the preview pane.
      if (r.changes && r.changes.length > 0) {
        await applyChanges(r.changes, text.slice(0, 80));
      } else {
        // No file changes — Claude just chatted back. Turn off the build
        // overlay so the user sees the previous preview or production again.
        setPreviewBuilding(false);
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
      setPreviewBuilding(false);
    } finally {
      // applyChanges sets its own busy state, but in case it didn't run we
      // still need to clear "chat".
      setBusy((b) => (b === "chat" ? null : b));
    }
  }, [applyChanges, busy, draftBranch, input, messages]);

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
      api<{ commits: CommitWithFunnel[] }>(`/api/admin/history?tenant=${encodeURIComponent(brandSlug)}`).then((r2) => setCommits(r2.commits));
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
          setPreviewBuilding(false);
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
      if (!confirm(`Buat draft revert untuk ${sha.slice(0, 7)}? Kamu bisa preview dulu sebelum publish.`)) return;
      setBusy("revert");
      setErr(null);
      try {
        const r = await api<{
          ok: true;
          branch: string;
          revert_sha: string;
          reverted_sha: string;
          pr: null | { number: number; url: string };
          preview_url: string | null;
        }>("/api/admin/revert", {
          method: "POST",
          body: JSON.stringify({ sha }),
        });
        // Switch the preview iframe to the revert branch and surface a chat
        // message with the PR link. The user can then click "Publish ke main"
        // when they've confirmed the preview looks right.
        setDraftBranch(r.branch);
        if (r.preview_url) setPreviewUrl(r.preview_url);
        setMessages((curr) => [
          ...curr,
          {
            role: "system",
            content: `↩ Draft revert siap di ${r.branch} (sha ${r.revert_sha.slice(0, 7)}). Preview building — review dulu, lalu klik Publish ke main.`,
            applied: { branch: r.branch, sha: r.revert_sha, preview_url: r.preview_url ?? "", pr: r.pr },
            ts: Date.now(),
          },
        ]);
        pollPreview(r.branch);
        refreshDrafts();
        api<{ commits: CommitWithFunnel[] }>(`/api/admin/history?tenant=${encodeURIComponent(brandSlug)}`).then((r2) => setCommits(r2.commits));
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(null);
      }
    },
    [busy, pollPreview, refreshDrafts],
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
            <ChatBubble key={i} msg={m} accent={accent} />
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
          <button
            onClick={() => setDomainsOpen(true)}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.85)", padding: "6px 12px", borderRadius: 999, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
          >
            🌐 Domain
          </button>
          {previewUrl ? (
            <>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "rgba(212,162,76,0.16)",
                  border: `1px solid ${accent}`,
                  color: accent,
                  fontSize: 11,
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: 0.2,
                }}
              >
                ↗ Buka full pratinjau
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewUrl);
                  setMessages((curr) => [...curr, { role: "system", content: `🔗 Link pratinjau disalin — bisa langsung dishare ke tim marketing.`, ts: Date.now() }]);
                }}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.85)", padding: "6px 12px", borderRadius: 999, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                title={previewUrl}
              >
                🔗 Salin link
              </button>
            </>
          ) : null}
          {draftBranch ? (
            <button
              onClick={publish}
              disabled={busy === "publish"}
              style={{
                padding: "10px 18px",
                background: "#16a34a",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                letterSpacing: 0.3,
                boxShadow: "0 4px 14px rgba(22,163,74,0.35)",
              }}
            >
              {busy === "publish" ? "Menaikkan…" : "🚀 Naikkan ke Produksi"}
            </button>
          ) : null}
        </div>
        <div style={{ flex: 1, background: "#000", minHeight: 0, position: "relative" }}>
          {previewBuilding ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(8,10,20,0.96)",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                gap: 14,
              }}
            >
              <div className="vibe-spinner" />
              <div style={{ fontFamily: "var(--font-jakarta), Inter, sans-serif", fontSize: 16, fontWeight: 700 }}>
                Lagi nyiapin pratinjau…
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", maxWidth: 360, textAlign: "center", lineHeight: 1.5 }}>
                Biasanya 30–60 detik. Halaman ini akan auto-update begitu build selesai.
              </div>
              {draftBranch ? (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "ui-monospace, monospace" }}>
                  {draftBranch}
                </div>
              ) : null}
              <style>{`
                .vibe-spinner {
                  width: 36px; height: 36px;
                  border-radius: 50%;
                  border: 3px solid rgba(255,255,255,0.18);
                  border-top-color: ${accent};
                  animation: vibe-spin 0.9s linear infinite;
                }
                @keyframes vibe-spin { to { transform: rotate(360deg); } }
              `}</style>
            </div>
          ) : null}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: "#fbbf24", textTransform: "uppercase" }}>
                Draft Aktif · {drafts.length}
              </div>
              <button
                onClick={async () => {
                  if (!confirm(`Discard semua draft yang umur >14 hari?`)) return;
                  try {
                    const r = await api<{ pruned: string[]; total: number }>("/api/admin/drafts/prune?days=14", { method: "POST" });
                    setMessages((curr) => [...curr, { role: "system", content: `🗑 Pruned ${r.pruned.length} stale draft(s) (umur >14 hari).`, ts: Date.now() }]);
                    refreshDrafts();
                  } catch (e: any) {
                    setErr(String(e));
                  }
                }}
                style={{ background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 10 }}
              >
                Prune {">"} 14d
              </button>
            </div>
            {drafts.map((d) => {
              const active = d.branch === draftBranch;
              return (
                <div
                  key={d.branch}
                  onClick={() => openDraft(d.branch)}
                  style={{
                    marginBottom: 8,
                    padding: 8,
                    background: active ? "rgba(251,191,36,0.16)" : "rgba(251,191,36,0.06)",
                    border: `1px solid ${active ? "rgba(251,191,36,0.55)" : "rgba(251,191,36,0.24)"}`,
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {active ? <span style={{ color: "#fbbf24", fontSize: 10 }}>● AKTIF</span> : null}
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#fde68a", fontFamily: "ui-monospace, monospace", wordBreak: "break-all", flex: 1 }}>{d.branch}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2, lineHeight: 1.35 }}>
                    {d.last_commit_message || "(empty)"}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11 }} onClick={(e) => e.stopPropagation()}>
                    {d.preview_url ? (
                      <>
                        <a href={d.preview_url} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "underline" }}>Preview ↗</a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(d.preview_url!);
                            setMessages((curr) => [...curr, { role: "system", content: `🔗 Preview link disalin: ${d.preview_url}`, ts: Date.now() }]);
                          }}
                          style={{ background: "transparent", border: 0, color: accent, cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }}
                          title="Copy preview link"
                        >
                          Salin link
                        </button>
                      </>
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
              );
            })}
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
            <div style={{ padding: 16, fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
              Belum ada versi production untuk toko ini. Kirim prompt pertama di kiri — setelah kamu klik <strong style={{ color: "#fff" }}>Naikkan ke Produksi</strong>, commit-nya akan muncul di sini.
            </div>
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
      {domainsOpen ? (
        <DomainsModal accent={accent} brandSlug={brandSlug} onClose={() => setDomainsOpen(false)} />
      ) : null}
    </div>
  );
}

function ChatBubble({
  msg,
  accent,
}: {
  msg: ChatMessage;
  accent: string;
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
            background: "rgba(212,162,76,0.08)",
            border: "1px solid rgba(212,162,76,0.30)",
            borderRadius: 10,
            padding: 10,
            width: "100%",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "#D4A24C", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>
            Yang diubah ({msg.changes.length} file)
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 11, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>
            {msg.changes.map((c, i) => (
              <li key={i} style={{ marginBottom: 3 }}>
                {c.why ? c.why : (
                  <span style={{ fontFamily: "ui-monospace, monospace", color: "#fde68a" }}>{c.path}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {/* No PR link here — the customer doesn't read PRs. The preview iframe
          on the right is the only feedback that matters. */}
    </div>
  );
}

interface DomainEntry {
  name: string;
  verified: boolean;
  apex_name?: string;
  verification?: Array<{ type: string; domain: string; value: string; reason?: string }>;
}

function DomainsModal({ accent, brandSlug, onClose }: { accent: string; brandSlug: string; onClose: () => void }) {
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ domains: DomainEntry[] }>("/api/admin/domains");
      setDomains(r.domains);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDomainOnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = input.trim().toLowerCase();
    if (!name || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ name?: string; error?: string; verified?: boolean }>(
        "/api/admin/domains",
        { method: "POST", body: JSON.stringify({ name }) },
      );
      if (r.error) {
        setErr(r.error);
      } else {
        setInput("");
        await refresh();
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyOne = async (name: string) => {
    setBusy(true);
    try {
      await api("/api/admin/domains", { method: "POST", body: JSON.stringify({ name, action: "verify" }) });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const removeOne = async (name: string) => {
    if (!confirm(`Hapus domain ${name} dari project?`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/domains?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 640,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "#0F172A",
          color: "#E2E8F0",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: 22,
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, color: accent, textTransform: "uppercase" }}>
              Custom Domain
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, fontFamily: "var(--font-jakarta), Inter, sans-serif" }}>
              Sambungkan domain milikmu
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "rgba(255,255,255,0.6)", fontSize: 20, cursor: "pointer", padding: 4 }}>×</button>
        </div>
        <p style={{ marginTop: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
          Tambahkan domain milikmu — misalnya <code style={{ color: "#fde68a" }}>safiyafood.com</code> atau
          {" "}<code style={{ color: "#fde68a" }}>www.safiyafood.com</code>. Setelah ditambahkan, kamu akan dapat
          instruksi DNS untuk verifikasi (biasanya: <code style={{ color: "#fde68a" }}>CNAME → cname.vercel-dns.com</code>).
        </p>

        <form onSubmit={addDomainOnSubmit} style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="safiyafood.com"
            disabled={busy}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.05)",
              color: "#E2E8F0",
              fontSize: 13,
              outline: "none",
              fontFamily: "ui-monospace, monospace",
            }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: accent,
              color: "#fff",
              border: 0,
              fontWeight: 700,
              fontSize: 13,
              cursor: busy || !input.trim() ? "not-allowed" : "pointer",
              opacity: busy || !input.trim() ? 0.5 : 1,
            }}
          >
            {busy ? "…" : "Tambah Domain"}
          </button>
        </form>
        {err ? <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>{err}</div> : null}

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>
            Domain Terdaftar ({domains.length})
          </div>
          {loading ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Loading…</div>
          ) : domains.length === 0 ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Belum ada domain custom.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {domains.map((d) => (
                <li key={d.name} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <strong style={{ fontFamily: "ui-monospace, monospace", color: "#fff" }}>{d.name}</strong>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: d.verified ? "rgba(22,163,74,0.18)" : "rgba(251,191,36,0.18)", color: d.verified ? "#86efac" : "#fde68a", border: `1px solid ${d.verified ? "rgba(22,163,74,0.45)" : "rgba(251,191,36,0.45)"}` }}>
                      {d.verified ? "VERIFIED" : "PENDING"}
                    </span>
                  </div>
                  {!d.verified && d.verification?.length ? (
                    <div style={{ marginTop: 8, padding: 10, background: "rgba(15,23,42,0.5)", borderRadius: 6, fontSize: 11, color: "#cbd5e1", lineHeight: 1.65 }}>
                      <div style={{ marginBottom: 4, fontWeight: 700, color: "#fde68a" }}>Belum terverifikasi — tambahkan DNS record berikut:</div>
                      {d.verification.map((v, i) => (
                        <div key={i} style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
                          {v.type} <strong>{v.domain}</strong> → <strong>{v.value}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 11 }}>
                    {!d.verified ? (
                      <button
                        onClick={() => verifyOne(d.name)}
                        disabled={busy}
                        style={{ background: "transparent", border: 0, color: accent, cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }}
                      >
                        Cek verifikasi
                      </button>
                    ) : (
                      <a href={`https://${d.name}`} target="_blank" rel="noreferrer" style={{ color: accent, textDecoration: "underline" }}>
                        Buka ↗
                      </a>
                    )}
                    <button
                      onClick={() => removeOne(d.name)}
                      disabled={busy}
                      style={{ background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }}
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ marginTop: 18, padding: 12, background: "rgba(212,162,76,0.08)", border: "1px dashed rgba(212,162,76,0.40)", borderRadius: 8, fontSize: 11, lineHeight: 1.55, color: "#cbd5e1" }}>
          <strong style={{ color: "#fde68a" }}>Cara setup DNS di Namecheap (atau registrar lain):</strong>
          <ol style={{ marginTop: 4, paddingLeft: 18 }}>
            <li>Buka panel DNS untuk domain kamu.</li>
            <li>Tambah <code>CNAME</code> dari <code>www</code> → <code>cname.vercel-dns.com</code></li>
            <li>Tambah <code>A</code> dari <code>@</code> → <code>76.76.21.21</code> (atau ALIAS ke <code>cname.vercel-dns.com</code> kalau registrar support)</li>
            <li>Tekan <em>Cek verifikasi</em> di atas. Sertifikat SSL otomatis terbit (~2-5 menit).</li>
          </ol>
        </div>
      </div>
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
          Cara fix: minta admin tambahkan email kamu ke daftar <code>ADMIN_EMAILS</code> di konfigurasi storefront.
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
