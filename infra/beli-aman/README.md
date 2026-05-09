# Beli Aman — local dev orchestration

Files in this folder set up the local development environment for the Beli Aman
BAP and its demo storefronts. They overlay the existing Jaringan Dagang
Postgres + Redis stack from `~/Code/jaringan-dagang-network`.

## What you need to run

| Service | Port | Where |
|---|---|---|
| Postgres + Redis + Registry + Gateway | 5433/6379/3030/4030 | `~/Code/jaringan-dagang-network` (`docker-compose up postgres redis registry gateway`) |
| Seller BPP | 8001 | `~/Code/jaringan-dagang-seller` (`uvicorn app.main:app --port 8001`) |
| Seller dashboard | 3000 | `~/Code/jaringan-dagang-seller/seller-dashboard` (`npm run dev`) |
| **Beli Aman BAP** | **8003** | `~/Code/jaringan-dagang-buyer/apps/beli-aman-bap` (`uvicorn main:app --port 8003`) |
| **Partner demo storefronts** | **3002** | `~/Code/jaringan-dagang-buyer/sites/partner-demos` (`npm run dev`) |

## One-time database setup

The Beli Aman BAP uses a **separate** Postgres database `beli_aman` on the same
container as JD. Create it once:

```bash
psql "postgresql://jaringan:jaringan_dev@localhost:5433/postgres" \
  -c "CREATE DATABASE beli_aman OWNER jaringan;"
```

Then start the BAP — it will run `Base.metadata.create_all` on first boot.

After the tables exist, seed the three demo brands:

```bash
cd ~/Code/jaringan-dagang-buyer
python infra/beli-aman/seed-brands.py
```

## Firebase Admin credentials

The BAP needs a service-account JSON to verify Firebase ID tokens. Copy
`apps/beli-aman-bap/.env.example` to `apps/beli-aman-bap/.env` and paste the
JSON file contents (single line) into `FIREBASE_SERVICE_ACCOUNT_JSON`.

To get the JSON:
1. Firebase console → Project settings → Service accounts → "Generate new private key"
2. Save the file. Paste its **entire contents** (including the curly braces) on
   one line into `.env`.

NEVER commit a populated `.env`.
