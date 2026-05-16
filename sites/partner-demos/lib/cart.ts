"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { trackEvent } from "./analytics";

/** Cart line — minimal client-side, server validates on order create. */
export interface CartLine {
  sku: string;
  qty: number;
}

const STORAGE_PREFIX = "safiyafood-cart:";  // namespaced by brand
const CHANGE_EVENT = "safiyafood-cart-change";

function storageKey(brandSlug: string): string {
  return `${STORAGE_PREFIX}${brandSlug}`;
}

function readLines(brandSlug: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(brandSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((l) => ({ sku: String(l?.sku || ""), qty: Math.max(0, Math.floor(Number(l?.qty) || 0)) }))
      .filter((l) => l.sku && l.qty > 0);
  } catch {
    return [];
  }
}

function writeLines(brandSlug: string, lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(brandSlug), JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { brandSlug } }));
}

// --- React subscription glue (useSyncExternalStore) ---

function subscribe(brandSlug: string, listener: () => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { brandSlug?: string } | undefined;
    if (!detail?.brandSlug || detail.brandSlug === brandSlug) listener();
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === storageKey(brandSlug)) listener();
  };
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

// Cache last snapshot per brand so useSyncExternalStore stays referentially stable.
const snapCache = new Map<string, CartLine[]>();
function getSnapshot(brandSlug: string): CartLine[] {
  const fresh = readLines(brandSlug);
  const cached = snapCache.get(brandSlug);
  if (cached && cached.length === fresh.length && cached.every((c, i) => c.sku === fresh[i].sku && c.qty === fresh[i].qty)) {
    return cached;
  }
  snapCache.set(brandSlug, fresh);
  return fresh;
}
const SSR_SNAPSHOT: CartLine[] = [];

export function useCart(brandSlug: string) {
  const lines = useSyncExternalStore(
    (l) => subscribe(brandSlug, l),
    () => getSnapshot(brandSlug),
    () => SSR_SNAPSHOT,
  );

  const setLines = useCallback((next: CartLine[]) => writeLines(brandSlug, next), [brandSlug]);

  const add = useCallback(
    (sku: string, qty = 1) => {
      const cur = readLines(brandSlug);
      const idx = cur.findIndex((l) => l.sku === sku);
      if (idx >= 0) cur[idx] = { sku, qty: cur[idx].qty + qty };
      else cur.push({ sku, qty });
      setLines(cur);
      trackEvent("add_to_cart", brandSlug, { sku, qty });
    },
    [brandSlug, setLines],
  );

  const addMany = useCallback(
    (entries: CartLine[]) => {
      const cur = readLines(brandSlug);
      for (const e of entries) {
        const idx = cur.findIndex((l) => l.sku === e.sku);
        if (idx >= 0) cur[idx] = { sku: e.sku, qty: cur[idx].qty + e.qty };
        else cur.push({ sku: e.sku, qty: e.qty });
      }
      setLines(cur);
      trackEvent("add_bundle_to_cart", brandSlug, {
        item_count: entries.length,
        total_qty: entries.reduce((s, e) => s + e.qty, 0),
      });
    },
    [brandSlug, setLines],
  );

  const setQty = useCallback(
    (sku: string, qty: number) => {
      const cur = readLines(brandSlug);
      const idx = cur.findIndex((l) => l.sku === sku);
      if (idx < 0) return;
      if (qty <= 0) cur.splice(idx, 1);
      else cur[idx] = { sku, qty };
      setLines(cur);
    },
    [brandSlug, setLines],
  );

  const remove = useCallback(
    (sku: string) => {
      const cur = readLines(brandSlug).filter((l) => l.sku !== sku);
      setLines(cur);
    },
    [brandSlug, setLines],
  );

  const clear = useCallback(() => setLines([]), [setLines]);

  const totalCount = lines.reduce((s, l) => s + l.qty, 0);

  return { lines, add, addMany, setQty, remove, clear, totalCount };
}

// Standalone helper for places that need to read once without subscribing.
export function readCart(brandSlug: string): CartLine[] {
  return readLines(brandSlug);
}

/** Listen for cart changes outside React — used by the header badge. */
export function onCartChange(brandSlug: string, cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  return subscribe(brandSlug, cb);
}

// Force a fresh snapshot read on next subscribe — useful after clearing.
export function invalidateCartSnapshot(brandSlug: string) {
  snapCache.delete(brandSlug);
}

// Suppress unused warning for invalidate when not used in this file.
void invalidateCartSnapshot;

export type { CartLine as TCartLine };
export { CHANGE_EVENT };
export const __test__ = { readLines, writeLines };

// Hook to mount-effect on cart presence (e.g., header badge animation).
export function useCartCount(brandSlug: string): number {
  const { totalCount } = useCart(brandSlug);
  // No-op effect to ensure the hook is called the same way each render.
  useEffect(() => {}, [totalCount]);
  return totalCount;
}
