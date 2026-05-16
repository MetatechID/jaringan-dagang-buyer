/** Sandbox — only paths the vibe-coder is allowed to write. Everything else
 *  is rejected before it ever reaches GitHub. */

const ALLOWED_PATH_PREFIXES = [
  "sites/partner-demos/lib/brands/safiyafood",       // brand theme + catalog
  "sites/partner-demos/lib/safiyafood-bundles.ts",   // Ramadhan hampers
  "sites/partner-demos/public/brands/safiyafood/",   // SVG art
  "sites/partner-demos/components/Safiya",           // Safiya-specific components only
  "apps/beli-aman-bap/catalog/safiyafood.json",      // BPP catalog mirror
];

const ALLOWED_VIBE_FILES = new Set([
  "sites/partner-demos/app/layout.tsx",              // analytics-head / -body slots only
  "sites/partner-demos/app/[brand]/page.tsx",        // @vibe:hero / @vibe:after-hero slots
  "sites/partner-demos/app/[brand]/layout.tsx",      // @vibe:main-content slot
  "sites/partner-demos/app/globals.css",
]);

const FORBIDDEN_SUBSTRINGS = [
  "/.next/", "/node_modules/", ".env", "/.git/", ".gitignore",
];

export type WriteCheck =
  | { ok: true; path: string }
  | { ok: false; path: string; reason: string };

export function checkWritablePath(rawPath: string): WriteCheck {
  // Normalize: strip leading "./" and "/" and any "../" attempts.
  const path = rawPath.replace(/^\.\//, "").replace(/^\/+/, "");
  if (path.includes("..")) return { ok: false, path, reason: "parent-traversal" };
  for (const f of FORBIDDEN_SUBSTRINGS) {
    if (path.includes(f)) return { ok: false, path, reason: `forbidden-substring:${f}` };
  }
  if (ALLOWED_VIBE_FILES.has(path)) return { ok: true, path };
  for (const p of ALLOWED_PATH_PREFIXES) {
    if (path === p || path.startsWith(p + "/") || path.startsWith(p)) return { ok: true, path };
  }
  return { ok: false, path, reason: "outside-sandbox" };
}

export function allowedRoots(): string[] {
  return [...ALLOWED_PATH_PREFIXES, ...Array.from(ALLOWED_VIBE_FILES)];
}
