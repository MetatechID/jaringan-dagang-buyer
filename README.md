# Jaringan Dagang - Buyer Platform (BAP)

Beckn Application Platform for Indonesia's open commerce network. This is the buyer-side service that enables product discovery, cart management, and order placement across all BPPs on the network.

## Features

- Beckn BAP: search via Gateway, select/init/confirm directly to BPPs
- Search session management with async result accumulation from multiple BPPs
- Cart management mapped to Beckn select/init flow
- Checkout mapped to Beckn confirm
- Order tracking via Beckn status/track
- REST API for storefront frontend

## Quick Start

```bash
pip install -r requirements.txt
export DATABASE_URL="postgresql+asyncpg://jaringan:jaringan_dev@localhost:5433/jaringan_dagang"
export GATEWAY_URL="http://localhost:4030"
uvicorn app.main:app --port 8002
```

## API Endpoints

- `POST /api/search` - Search products across all BPPs
- `GET /api/search/{session_id}/results` - Poll search results
- `POST /api/cart/select` - Add items to cart (Beckn select)
- `POST /api/cart/{id}/init` - Set billing/shipping (Beckn init)
- `POST /api/checkout/{id}/confirm` - Place order (Beckn confirm)
- `GET /api/orders` - List orders
- `POST /api/orders/{id}/track` - Track order

## Repo layout (May 2026 — adding Beli Aman)

This repo is becoming a small monorepo so the JD BAP and **Beli Aman** (the buyer-protection layer) can live side by side without stepping on each other. New code lands in clearly-named buckets; the legacy JD BAP layout (`/app`, `/api`, `/storefront`) stays put to avoid disrupting the live `jaringan-dagang-buyer.metatech.id` deploy.

```
.
├── apps/                       Backend services (one folder per service)
│   └── beli-aman-bap/          NEW — Beli Aman FastAPI backend
│
├── packages/                   Shared libraries
│   ├── beckn-protocol/         EXISTING — Pydantic types for Beckn (Python)
│   ├── beli-aman-sdk/          NEW — React SDK partners embed on their sites
│   └── ui/                     EXISTING (placeholder)
│
├── sites/                      Front-of-house websites (one folder per Vercel project)
│   └── partner-demos/          NEW — Multi-tenant Next.js: antarestar/gendes/yourbrand
│
├── infra/                      Local-dev orchestration only
│   └── beli-aman/              docker-compose overrides + seed scripts
│
├── app/         storefront/    api/    EXISTING JD BAP + JD marketplace (untouched)
├── vercel.json  Dockerfile     requirements.txt
└── package.json                NEW — npm workspaces root for packages/* + sites/*
```

### Quick start — Beli Aman

See `infra/beli-aman/README.md` for the full local-dev setup. Short version:

```bash
# from repo root, install JS workspaces
npm install

# Beli Aman BAP (port 8003)
cd apps/beli-aman-bap && pip install -r requirements.txt && uvicorn main:app --port 8003

# Beli Aman demo storefronts (port 3002)
npm run demos:dev   # → http://localhost:3002/antarestar
```

## Related Repos

- [jaringan-dagang-network](https://github.com/MetatechID/jaringan-dagang-network) - Network infrastructure
- [jaringan-dagang-seller](https://github.com/MetatechID/jaringan-dagang-seller) - BPP (Seller platform)
