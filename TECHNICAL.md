# Jaringan Dagang — Technical Architecture (Buyer / BAP / Identity Provider)

> The canonical whole-system doc lives in `jaringan-dagang-network/TECHNICAL.md`.
> The "System Overview", "Beckn Protocol", "Identity & ACL", and "Production
> Databases" sections below are mirrored across all three repos — keep them in
> sync. Everything under "This Repo" is buyer/BAP-specific.

## System Overview

Jaringan Dagang is an Indonesian open-commerce network built on the **Beckn
protocol**. Three independently-deployed apps, one shared Firebase identity,
one Neon Postgres project (two logical databases). **This repo also hosts the
network Identity Provider.**

```
                         Firebase project: beli-aman-prod
                          (one Google sign-in for everyone)
                                       │
        ┌──────────────────────────────┼───────────────────────────────┐
        ▼                              ▼                               ▼
┌───────────────────┐   signed   ┌───────────────────┐         ┌───────────────────┐
│ jaringan-dagang-  │   Beckn    │ jaringan-dagang-  │ registry│ jaringan-dagang-  │
│   buyer (HERE)    │◀──HTTP────▶│      seller       │◀──lookup│     network       │
│  "Beli Aman" BAP  │  Ed25519   │   BPP / catalog   │         │ registry+gateway  │
│ • storefronts     │            │ • seller dashboard│         │ • subscriber dir  │
│ • Vibe admin      │            │ • Beckn /search…  │         │ • Beckn gateway   │
│ • IDENTITY PROVIDER            │ • orders/refunds  │         │   search multicast│
│   (profiles+ACL)  │            │ • catalog source  │         │                   │
└─────────┬─────────┘            └─────────┬─────────┘         └─────────┬─────────┘
          │                                │                             │
          ▼ Neon db `beli_aman`            ▼ Neon db `neondb`            ▼ Neon (own)
     identity, ACL, escrow,           stores, products, skus,       subscribers
     disputes, mirror catalog         orders, refunds, beckn logs
          └──────────── one Neon project: ep-shy-heart-a1atpe0m (ap-southeast-1) ─┘
```

| App | Repo | Prod URLs | Vercel project |
|---|---|---|---|
| **Buyer / BAP / IdP (this repo)** | `jaringan-dagang-buyer` | storefronts `*.beliaman.com`, `beli-aman.metatech.id`; API `api.beli-aman.metatech.id` | `beli-aman-bap`, `beli-aman-storefronts` |
| Seller / BPP | `jaringan-dagang-seller` | dashboard `jaringan-dagang-seller.metatech.id`; API `jaringan-dagang-seller-api.metatech.id` | `jaringan-dagang-seller`, `seller-dashboard` |
| Network | `jaringan-dagang-network` | dashboard `jaringan-dagang.metatech.id` | (that repo) |

**Stack:** Python 3.13 · FastAPI · SQLAlchemy 2 async · asyncpg · Neon Postgres
· Next.js 14 (storefronts + Vibe admin) · Vercel (serverless) · Firebase Auth
(Google) · Ed25519 (pynacl) for Beckn signing.

## Beckn Protocol

Beckn is a **discovery + transaction** protocol — NOT a sync or ACL protocol.
Every message is Ed25519-signed; the signer's public key is registered in the
network registry under a `subscriber_id`. The receiver looks it up
(Redis-cached 1h + bundled static fallback) and verifies. Replay-protected via
a 5-minute freshness window + `message_id` idempotency.

This app is the **BAP**: it emits `/search` and receives `/on_search` callbacks,
runs `/select /init /confirm` for orders, and `/update`/`/on_update` for
refunds. Each seller toko is its own subscriber (`<slug>.jaringan-dagang.id`);
`/on_search` arrives once per provider, each signed by that toko's key. A toko
without its own key signs with the process key and rebrands its `bpp_id`.

**Catalog sync (eventual + strong at the boundary):** the seller DB is the
system of record; this app keeps a **hint-only mirror** (`mirror_*` tables).
Push: seller `/on_search` on every product write. Pull: a worker calls
`/search` every 5 min as a safety net. Money steps re-quote live: `/select`+
`/init` get fresh price/stock from the seller; `/confirm` is where inventory is
actually decremented (seller-side, race-safe).

`handle_on_search` uses a **slug fallback lookup**: if a provider's
`subscriber_id` rotates, it matches the existing mirror row by slug instead of
inserting a duplicate.

## Identity & ACL — "Sign in with Beli Aman" (owned here)

**Beli Aman BAP is the network Identity Provider.** One Google sign-in
(Firebase `beli-aman-prod`) is the identity for buyers AND seller-dashboard
operators AND Vibe-admin editors. There is exactly one ACL for the whole
network and it lives in this repo's `beli_aman` database.

- `models/profile.py` — `BeliAmanProfile` (table `profiles`, keyed by
  `google_sub`) + `is_super_admin`. THE canonical network identity.
- `models/store_membership.py` — `StoreMembership` (table `store_memberships`),
  the network-wide ACL: `profile_id` (nullable — NULL = pending invite),
  `invited_email`, `store_id` (loose ref to seller `Store.id`), `store_slug`
  (Vibe admin keys by slug, seller dashboard by store_id — same row), `role`
  (`OWNER`|`STAFF`, SAEnum `beliaman_store_role`), `invited_by_email`,
  `accepted_at`.
- `deps.py` — `SUPER_ADMIN_EMAILS = {hallucinogenplus@, lwastuargo@}`.
  `_get_or_create_profile` sets `is_super_admin` from the allowlist AND
  auto-claims pending `StoreMembership` invites by lowercased email on first
  sign-in.

**IdP API** (`routers/identity.py`, mounted at
`https://api.beli-aman.metatech.id/api/v1/…`):
`GET /me/stores`, `GET /me/can-admin?slug=`,
`GET|POST|DELETE /stores/{id}/members` (`POST`/`DELETE` owner-only, can't
remove last owner), `POST /identity/seed-membership` (admin-token backfill),
`POST /identity/ensure-tables` (idempotent `create_all` + `ALTER TABLE … ADD
COLUMN IF NOT EXISTS` for `is_super_admin` / `store_slug`),
`GET /identity/overview` (admin-token — full profiles+memberships+pending dump,
the observability endpoint). `routers/profiles.py` `GET /api/v1/me` returns
`is_super_admin`.

> **Outage note:** use `from pydantic import BaseModel` with `email: str` here —
> `EmailStr` pulls `email-validator`, which isn't installed, so importing it
> `ImportError`s and 500s **every** BAP route. `identity_router` and
> `beckn_router` are each wrapped in defensive try/except in `main.py` so a bad
> import can't take down the whole BAP again.

**Consumers:** seller dashboard (`/me` + `/me/stores`); buyer Vibe admin
(`sites/partner-demos` `AdminApp.tsx` gates on `/me/can-admin?slug=`, with the
legacy email allowlist only as fallback).

## Production Databases

One **Neon** project (serverless Postgres, AWS `ap-southeast-1`), host
`ep-shy-heart-a1atpe0m.ap-southeast-1.aws.neon.tech`, role `neondb_owner`, two
logical databases:

| DB | App | Tables (key) |
|---|---|---|
| **`beli_aman`** (this repo) | Beli Aman BAP (IdP) | `profiles`, `store_memberships`, escrow ledger, disputes, `mirror_*` catalog cache, beckn logs |
| `neondb` | Seller BPP | `stores`, `products`, `skus`, `orders`, `refund_requests`, `beckn_*_logs` |

Local `.env` points at `localhost:5432` — **dev only**. Vercel `DATABASE_URL`
overrides to Neon `beli_aman` in prod. Connection string:
`postgresql+asyncpg://neondb_owner:<pw>@ep-shy-heart-a1atpe0m.ap-southeast-1.aws.neon.tech/beli_aman?ssl=require`.
Schema applied via `Base.metadata.create_all` (idempotent) — for new tables
like `store_memberships`, call `POST /api/v1/identity/ensure-tables` once.

## This Repo: Buyer (BAP + Storefronts + Vibe Admin + IdP)

- `apps/beli-aman-bap/` — FastAPI BAP **and** Identity Provider →
  Vercel project `beli-aman-bap`, `api.beli-aman.metatech.id`.
  - `main.py` mounts `analytics_router`, then conditional `identity_router`,
    then conditional `beckn_router` (each in try/except).
  - `routers/` — `identity.py` (IdP), `profiles.py` (`/me`), beckn callbacks,
    escrow/disputes, mirror catalog read.
  - `models/` — `profile.py`, `store_membership.py`, `mirror_*`, escrow.
  - `deps.py` — Firebase ID-token verify (`firebase_admin`),
    get-or-create-profile, super-admin allowlist, pending-invite auto-claim.
- `sites/partner-demos/` — Next.js storefronts + **Vibe admin** (the
  `*.beliaman.com/admin` no-code storefront editor) → Vercel project
  `beli-aman-storefronts`. `components/admin/AdminApp.tsx` calls
  `${NEXT_PUBLIC_IDENTITY_API_URL}/api/v1/me/can-admin?slug=` (default
  `https://api.beli-aman.metatech.id`); `getIdToken()` from a named Firebase
  app; access = `idpAllowed || legacyAllowlist`.
- `packages/beckn-protocol/python/` — vendored signer/envelope (pynacl Ed25519).

### Key Files
- `apps/beli-aman-bap/routers/identity.py` — the IdP endpoints
- `apps/beli-aman-bap/models/{profile,store_membership}.py` — identity + ACL
- `apps/beli-aman-bap/deps.py` — auth, super-admin, invite auto-claim
- `apps/beli-aman-bap/main.py` — defensive router mounting
- `sites/partner-demos/components/admin/AdminApp.tsx` — Vibe admin IdP gate

### Key Design Decisions
- **Beli Aman is the IdP, not just a buyer app.** "Sign in with Beli Aman" is
  the network's single identity; one invite via seller `/settings/team` grants
  both seller-dashboard and Vibe-editor access. No second ACL anywhere.
- **`store_id` is a loose reference, not an FK.** Beli Aman owns the permission
  mapping, not the catalog, so it deliberately doesn't FK into the seller DB.
- **Pending invites auto-claim by email.** Invite anyone before they've ever
  signed in; the row links to their profile on first sign-in.
- **Routers mounted defensively.** A bad import in identity/beckn must not 500
  the whole BAP (it did once — the `EmailStr` incident).
- **No `EmailStr`.** `email-validator` isn't a dependency; `email: str` only.

## Known Caveats / TODO
- `lwastuargo@gmail.com` and `abraham.hahijary@gmail.com` memberships may still
  be pending — they auto-claim on first Beli Aman sign-in.
- Per-toko Beckn signing is live for Safiya only.
- Vercel "Security Checkpoint" intermittently blocks automated curl of the
  storefront domains; the BAP API domain is unaffected.
- Mirror catalog is hint-only — never treat `mirror_*` as authoritative for
  price/stock; `/select`/`/init` re-quote the seller live.
