# Vibe slots

Anchors the LLM uses to keep its diffs small, predictable, and easy to roll
back. The system prompt that wraps every chat turn tells Claude:

> When the customer asks for a change, prefer inserting/modifying near a
> `/* @vibe:NAME */` anchor that fits the request. Anchors persist across
> revisions — never delete an anchor; comment around it.

If you add a new slot, add it here too — the admin server reads this file
into the prompt so Claude knows where it can write.

## Slot list

| Anchor | File | What goes there |
|---|---|---|
| `@vibe:analytics-head` | `app/layout.tsx` (head) | Google Analytics 4, Facebook Pixel, TikTok Pixel, GTM container scripts |
| `@vibe:analytics-body` | `app/layout.tsx` (body) | `<noscript>` fallback pixels, DataLayer pushes |
| `@vibe:main-content` | `app/[brand]/layout.tsx` | Site-wide banners (free-ship strip, holiday strip) |
| `@vibe:hero` | `app/[brand]/page.tsx` | Custom hero replacing the default SafiyaHero |
| `@vibe:after-hero` | `app/[brand]/page.tsx` | Testimonials, trust badges, featured collections |

## Hard rules the LLM is told to never break

- Never edit anything under `apps/beli-aman-bap/` — that's the buyer
  payment & escrow service. Out of scope for storefront vibing.
- Never edit `app/api/admin/**` — that's the vibe-coding API itself.
- Never remove SEO metadata or the JSON-LD on PDPs.
- Never change the cart/checkout SKU flow — Beli Aman expects `add_to_cart`
  + `checkout_start` events and the existing `useCart` API.
- Catalog edits (adding products, changing prices) must mutate
  `lib/brands/safiyafood-catalog.json` AND
  `apps/beli-aman-bap/catalog/safiyafood.json` together, or stop and ask.
- Brand colors live in `lib/brands/safiyafood.ts` — preserve the
  CSS-variable fallback chain when editing.

These rules are enforced both at prompt-time (system message) and
post-LLM (the server rejects diffs that touch protected paths).
