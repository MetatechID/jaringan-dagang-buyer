"""BAP (Beckn Application Platform) service -- buyer-side backend.

This is the buyer-facing backend for the Jaringan Dagang open commerce network.
It exposes:
  - REST API for the storefront frontend (search, cart, checkout, orders)
  - Beckn callback endpoints for receiving async responses from BPPs

Architecture:
  Frontend -> BAP REST API -> Beckn protocol -> Gateway/BPP
  BPP -> Beckn callbacks -> BAP DB -> Frontend (polling)
"""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.models.base import Base

# Ensure the beckn-protocol library is importable
_project_root = Path(__file__).resolve().parent.parent
_beckn_lib = _project_root / "packages" / "beckn-protocol"
if str(_beckn_lib) not in sys.path:
    sys.path.insert(0, str(_beckn_lib))

logger = logging.getLogger(__name__)


async def _register_with_registry() -> None:
    """Register this BAP with the Beckn registry on startup.

    In production, registration would involve submitting the subscriber
    record with the public key. For local dev, we do a best-effort POST.
    """
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            payload = {
                "subscriber_id": settings.subscriber_id,
                "subscriber_url": settings.subscriber_url,
                "type": "BAP",
                "domain": settings.domain,
                "city": settings.city_code,
                "country": settings.country_code,
                "signing_public_key": "",  # Would be set from keypair in production
                "valid_from": "2026-01-01T00:00:00Z",
                "valid_until": "2027-01-01T00:00:00Z",
                "status": "SUBSCRIBED",
            }
            resp = await client.post(
                f"{settings.registry_url}/subscribe",
                json=payload,
            )
            logger.info(
                "Registry subscription response: %s %s",
                resp.status_code,
                resp.text[:200],
            )
    except Exception:
        logger.warning(
            "Could not register with registry at %s (will retry on next startup)",
            settings.registry_url,
            exc_info=True,
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown hooks."""
    # --- Startup ---
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger.info("Starting BAP service: %s at %s", settings.subscriber_id, settings.subscriber_url)

    # Create database tables (for development; use Alembic in production)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables ensured")
    except Exception:
        logger.warning("Could not connect to database (skipping table creation)", exc_info=True)

    # Register with the Beckn registry
    await _register_with_registry()

    yield

    # --- Shutdown ---
    try:
        await engine.dispose()
    except Exception:
        pass
    logger.info("BAP service shut down")


# ------------------------------------------------------------------
# FastAPI application
# ------------------------------------------------------------------

app = FastAPI(
    title="Jaringan Dagang BAP Service",
    description=(
        "Beckn Application Platform (buyer-side) for the Jaringan Dagang "
        "open commerce network. Sends Beckn requests to BPPs via the Gateway "
        "and receives async callbacks."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS -- allow the storefront frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mount routers ---

# Beckn protocol callback endpoints (receive responses from BPPs)
from app.beckn.callbacks import router as beckn_router

app.include_router(beckn_router)

# REST API for the storefront frontend
from app.api.search import router as search_router
from app.api.cart import router as cart_router
from app.api.checkout import router as checkout_router
from app.api.orders import router as orders_router

app.include_router(search_router)
app.include_router(cart_router)
app.include_router(checkout_router)
app.include_router(orders_router)


# --- Health check ---


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "bap-service"}
