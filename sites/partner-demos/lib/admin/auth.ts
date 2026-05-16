/** Admin auth — checks the caller's Firebase ID token against an env allowlist.
 *
 *  V0 caveat: we decode the JWT payload without signature verification. That's
 *  fine for a demo with a single trusted customer but MUST be replaced by
 *  proper Firebase Admin SDK verification before opening to more tenants. */

const ALLOWLIST: string[] = (process.env.ADMIN_EMAILS || "hallucinogenplus@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface AdminIdentity {
  email: string;
  uid?: string;
  name?: string;
}

function b64UrlDecode(s: string): string {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const replaced = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(replaced, "base64").toString("utf-8");
}

function decodeFirebaseJwt(token: string): { email?: string; user_id?: string; name?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(b64UrlDecode(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

/** Resolve the admin identity from an Authorization header. Returns null if
 *  the token is missing/malformed or the email isn't on the allowlist. */
export function resolveAdmin(authHeader: string | null | undefined): AdminIdentity | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const payload = decodeFirebaseJwt(m[1]);
  const email = (payload?.email || "").toLowerCase();
  if (!email) return null;
  if (!ALLOWLIST.includes(email)) return null;
  return { email, uid: payload?.user_id, name: payload?.name };
}

export function adminEmails(): string[] {
  return [...ALLOWLIST];
}
