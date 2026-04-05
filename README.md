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

## Related Repos

- [jaringan-dagang-network](https://github.com/MetatechID/jaringan-dagang-network) - Network infrastructure
- [jaringan-dagang-seller](https://github.com/MetatechID/jaringan-dagang-seller) - BPP (Seller platform)
