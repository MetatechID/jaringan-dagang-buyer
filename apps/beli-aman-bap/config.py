"""Beli Aman BAP service configuration.

Loads settings from environment variables with sensible defaults for
local development. The Beli Aman BAP runs on port 8003 by default to
avoid colliding with the JD BAP (8002).
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = {"env_prefix": "", "env_file": ".env", "extra": "ignore"}

    # --- Service identity ---
    subscriber_id: str = "bap.beli-aman.local"
    subscriber_url: str = "http://localhost:8003/beckn"
    unique_key_id: str = "key-1"
    service_name: str = "beli-aman-bap"

    # --- Beckn network (kept for future Beckn round-trip; unused in v1) ---
    registry_url: str = "http://localhost:3030"
    gateway_url: str = "http://localhost:4030"
    domain: str = "retail"
    core_version: str = "1.1.0"
    city_code: str = "ID:JKT"
    country_code: str = "IDN"

    # --- Database ---
    database_url: str = (
        "postgresql+asyncpg://jaringan:jaringan_dev@localhost:5433/beli_aman"
    )

    # --- Firebase Admin ---
    # Paste the entire service-account JSON as a single env var. NEVER commit.
    firebase_service_account_json: str = ""

    # --- Demo / admin ---
    # Random shared secret. Gates the /api/v1/internal-mock/* endpoints used
    # by the admin cockpit at /admin?token=.... MUST match the storefront's
    # NEXT_PUBLIC_ADMIN_DEMO_TOKEN value.
    admin_token: str = "dev-admin-token"

    # --- CORS ---
    # Comma-separated list of allowed origins.
    allowed_origins: str = (
        "http://localhost:3000,http://localhost:3002,http://localhost:3003,"
        "https://beli-aman.metatech.id"
    )

    # --- Seller bridge (best-effort POST when an order moves to ESCROW_HELD) ---
    seller_bridge_url: str = "http://localhost:8001"
    seller_bridge_token: str = "dev-seller-bridge-token"
    seller_bridge_enabled: bool = True

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8003
    debug: bool = True

    # --- Auto-release window for escrow (days after delivered) ---
    auto_release_days: int = 3


settings = Settings()
