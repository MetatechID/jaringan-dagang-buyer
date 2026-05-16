/** Admin auth — checks the caller's Firebase ID token against an env allowlist.
 *
 *  V0 caveat: we decode the JWT payload without signature verification. That's
 *  fine for a demo with a single trusted customer but MUST be replaced by
 *  proper Firebase Admin SDK verification before opening to more tenants. */

const ALLOWLIST: string[] = (process.env.ADMIN_EMAILS || "hallucinogenplus@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const OPEN_MODE = process.env.ADMIN_OPEN_MODE === "1";

export interface AdminIdentity {
  email: string;
  uid?: string;
  name?: string;
}

export interface AuthOutcome {
  ok: boolean;
  identity: AdminIdentity | null;
  reason?: "no-header" | "bad-token" | "no-email" | "not-allowed";
  seenEmail?: string;     // surfaced back so the user can see what we saw
  allowlist?: string[];   // only included on not-allowed
}

function b64UrlDecode(s: string): string {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const replaced = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(replaced, "base64").toString("utf-8");
}

function decodeFirebaseJwt(token: string): { email?: string; user_id?: string; sub?: string; name?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(b64UrlDecode(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export function resolveAdminWithReason(authHeader: string | null | undefined): AuthOutcome {
  if (!authHeader) return { ok: false, identity: null, reason: "no-header" };
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, identity: null, reason: "bad-token" };
  const payload = decodeFirebaseJwt(m[1]);
  if (!payload) return { ok: false, identity: null, reason: "bad-token" };
  const email = (payload.email || "").toLowerCase();
  if (!email) {
    return { ok: false, identity: null, reason: "no-email", seenEmail: "(none)" };
  }
  if (OPEN_MODE) {
    return { ok: true, identity: { email, uid: payload.user_id || payload.sub, name: payload.name }, seenEmail: email };
  }
  if (!ALLOWLIST.includes(email)) {
    return {
      ok: false,
      identity: null,
      reason: "not-allowed",
      seenEmail: email,
      allowlist: ALLOWLIST,
    };
  }
  return {
    ok: true,
    identity: { email, uid: payload.user_id || payload.sub, name: payload.name },
    seenEmail: email,
  };
}

/** Resolve the admin identity from an Authorization header. Returns null if
 *  the token is missing/malformed or the email isn't on the allowlist. */
export function resolveAdmin(authHeader: string | null | undefined): AdminIdentity | null {
  return resolveAdminWithReason(authHeader).identity;
}

export function adminEmails(): string[] {
  return [...ALLOWLIST];
}
