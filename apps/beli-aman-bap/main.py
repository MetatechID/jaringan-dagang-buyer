"""Beli Aman BAP service — buyer-protection layer for Indonesian DTC commerce.

This is a sibling to the JD BAP (../app/main.py). It exposes:
  - REST endpoints used by the Beli Aman SDK (auth, brands, orders, payments,
    escrow, disputes)
  - Admin-only mock endpoints used by the demo cockpit at /admin?token=...

For v1 it does NOT speak Beckn on the network — it's wired only to a local
seller_bridge that posts orders to the seller dashboard. The directory
structure mirrors the JD BAP so future Beckn round-trips drop in cleanly.
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Make this app's own modules importable as top-level (config, database, etc.)
_app_dir = Path(__file__).resolve().parent
if str(_app_dir) not in sys.path:
    sys.path.insert(0, str(_app_dir))

# Optional: add the shared beckn-protocol package if present (only when running
# from a checkout that includes /packages/beckn-protocol; not deployed on Vercel
# because rootDirectory is `apps/beli-aman-bap` and beckn-protocol lives outside).
_repo_root_candidate = Path(__file__).resolve().parent.parent.parent
_beckn_lib_candidate = _repo_root_candidate / "packages" / "beckn-protocol"
if _beckn_lib_candidate.exists() and str(_beckn_lib_candidate) not in sys.path:
    sys.path.insert(0, str(_beckn_lib_candidate))

from config import settings  # noqa: E402
from database import engine  # noqa: E402
from models import Base  # noqa: E402  (import side-effect: registers all models)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup / shutdown hooks."""
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger.info(
        "Starting %s (subscriber_id=%s) at %s",
        settings.service_name, settings.subscriber_id, settings.subscriber_url,
    )

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables ensured")
    except Exception:
        logger.warning("Could not connect to database (skipping table creation)", exc_info=True)

    yield

    try:
        await engine.dispose()
    except Exception:
        pass
    logger.info("%s shut down", settings.service_name)


app = FastAPI(
    title="Beli Aman BAP",
    description=(
        "Buyer-protection layer for Indonesian DTC commerce. "
        "Built on the Jaringan Dagang Beckn-protocol open commerce network."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


_origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Token"],
)


# --- Mount routers ---
from routers.auth import router as auth_router  # noqa: E402
from routers.profiles import router as profiles_router  # noqa: E402
from routers.brands import router as brands_router  # noqa: E402
from routers.orders import router as orders_router  # noqa: E402
from routers.payments import router as payments_router  # noqa: E402
from routers.escrow import router as escrow_router  # noqa: E402
from routers.disputes import router as disputes_router  # noqa: E402
from routers.internal_mock import router as internal_mock_router  # noqa: E402
from routers.shipping import router as shipping_router  # noqa: E402

app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(brands_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(escrow_router)
app.include_router(disputes_router)
app.include_router(internal_mock_router)
app.include_router(shipping_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name}


@app.get("/debug/config")
async def debug_config() -> dict:
    return {
        "subscriber_id": settings.subscriber_id,
        "subscriber_url": settings.subscriber_url,
        "database_url": settings.database_url[:50] + "...",
        "allowed_origins": _origins,
        "seller_bridge_enabled": settings.seller_bridge_enabled,
        "auto_release_days": settings.auto_release_days,
    }
