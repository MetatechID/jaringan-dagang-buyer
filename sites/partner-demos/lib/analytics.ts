"use client";

import { useEffect } from "react";

/** Tiny first-party analytics tracker.
 *
 * Goal: measure conversion rate **per storefront version** (= per Vercel
 * commit SHA) from real traffic. Every event is tagged with:
 *   - tenant_slug (which brand)
 *   - version_sha (which deploy)
 *   - session_id  (1st-party only, localStorage)
 *
 * Events are buffered for 800ms and POSTed as a batch to the BAP. If the
 * endpoint is unreachable (CORS, 404, network) we silently drop — never
 * block the storefront.
 */

const VERSION_SHA: string =
  (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_VERSION_SHA as string | undefined)) ||
  "dev";

const TRACK_URL: string =
  (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_ANALYTICS_URL as string | undefined)) ||
  "https://api.beli-aman.metatech.id/api/v1/analytics/track";

const SESSION_KEY = "safiya-analytics-session";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function newSessionId(): string {
  // 16 random bytes → 32-char hex; not crypto-strong needed.
  const arr = new Uint8Array(16);
  if (isBrowser() && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getSessionId(): string {
  if (!isBrowser()) return "ssr";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = newSessionId();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return newSessionId();
  }
}

type EventProps = Record<string, string | number | boolean | null | undefined>;

interface QueuedEvent {
  name: string;
  tenant_slug: string;
  version_sha: string;
  session_id: string;
  ts: number;
  path: string;
  props?: EventProps;
}

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  if (queue.length === 0 || !isBrowser()) return;
  const batch = queue.splice(0, queue.length);
  const payload = JSON.stringify({ events: batch });

  // Prefer sendBeacon for unload reliability; fall back to fetch.
  try {
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(TRACK_URL, new Blob([payload], { type: "application/json" }));
      if (ok) return;
    }
  } catch {
    /* ignore */
  }
  void fetch(TRACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
    mode: "cors",
    credentials: "omit",
  }).catch(() => {
    /* silent — analytics must never break the storefront */
  });
}

function scheduleFlush(immediate = false) {
  if (!isBrowser()) return;
  if (immediate) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flush();
    return;
  }
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 800);
}

/** Fire-and-forget event recording. Safe to call from server components — no-ops on SSR. */
export function trackEvent(name: string, tenantSlug: string, props?: EventProps): void {
  if (!isBrowser()) return;
  queue.push({
    name,
    tenant_slug: tenantSlug,
    version_sha: VERSION_SHA,
    session_id: getSessionId(),
    ts: Date.now(),
    path: window.location.pathname,
    props,
  });
  scheduleFlush();
}

/** Convenience hook for "this page was viewed". Tracks once on mount per
 *  page-name + tenant. */
export function useTrackPageView(tenantSlug: string, page: string, extra?: EventProps): void {
  useEffect(() => {
    trackEvent("page_view", tenantSlug, { page, ...(extra || {}) });
    // Also flush on tab hide so we don't drop the last event.
    const onHide = () => scheduleFlush(true);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, page]);
}

/** Read-only — useful for debugging in dev console. */
export function debugInfo() {
  return {
    versionSha: VERSION_SHA,
    sessionId: isBrowser() ? getSessionId() : null,
    trackUrl: TRACK_URL,
    queueLength: queue.length,
  };
}
