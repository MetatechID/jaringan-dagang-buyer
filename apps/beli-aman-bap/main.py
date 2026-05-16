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
    import asyncio
    import os
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

    # Start background workers (unless explicitly disabled, e.g. on Vercel serverless).
    puller_task = None
    if os.environ.get("BECKN_WORKERS_ENABLED", "true").lower() != "false":
        try:
            from workers.catalog_puller import run_forever as catalog_puller_loop
            puller_task = asyncio.create_task(catalog_puller_loop())
            logger.info("catalog_puller worker started")
        except Exception:
            logger.exception("catalog_puller failed to start")

    yield

    if puller_task is not None:
        puller_task.cancel()
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
# Plus a regex so every tenant subdomain on beliaman.com (safiya, gendes,
# antarestar, etc.) and on metatech.id is allowed without us re-listing each.
_origin_regex = r"https://([a-z0-9-]+\.)?(beliaman\.com|metatech\.id)"
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
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
from routers.analytics import router as analytics_router  # noqa: E402

# Identity + Beckn routers import third-party deps. Import each defensively so
# a missing/broken dep in either can NEVER crash the whole BAP (which would
# take the entire buyer API offline).
try:
    from routers.identity import router as identity_router  # noqa: E402
    _IDENTITY_ROUTER_AVAILABLE = True
except Exception as _ierr:  # noqa: BLE001
    identity_router = None  # type: ignore
    _IDENTITY_ROUTER_AVAILABLE = False
    logger.warning("Identity router unavailable: %r", _ierr)

try:
    from routers.beckn import router as beckn_router  # noqa: E402
    _BECKN_ROUTER_AVAILABLE = True
except Exception as _err:  # noqa: BLE001
    beckn_router = None  # type: ignore
    _BECKN_ROUTER_AVAILABLE = False
    logger.warning("Beckn router unavailable: %r", _err)

app.include_router(auth_router)
app.include_router(profiles_router)
app.include_router(brands_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(escrow_router)
app.include_router(disputes_router)
app.include_router(internal_mock_router)
app.include_router(shipping_router)
app.include_router(analytics_router)
if _IDENTITY_ROUTER_AVAILABLE and identity_router is not None:
    app.include_router(identity_router)
if _BECKN_ROUTER_AVAILABLE and beckn_router is not None:
    app.include_router(beckn_router)


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
