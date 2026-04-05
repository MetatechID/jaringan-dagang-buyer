"""BAP service configuration.

Loads settings from environment variables with sensible defaults for
local development. All Beckn network addresses, database credentials,
and signing keys are configured here.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = {"env_prefix": "", "env_file": ".env", "extra": "ignore"}

    # --- Service identity ---
    subscriber_id: str = "jaringan-dagang-bap"
    subscriber_url: str = "http://localhost:8002/beckn"
    unique_key_id: str = "key-1"

    # --- Beckn network ---
    registry_url: str = "http://localhost:3030"
    gateway_url: str = "http://localhost:4030"
    bpp_url: str = "http://localhost:8001"

    # --- Beckn domain ---
    domain: str = "retail"
    core_version: str = "1.1.0"
    city_code: str = "std:0274"
    country_code: str = "IDN"

    # --- Ed25519 signing key (base64-encoded) ---
    # Generate with: python -c "from python.signer import generate_keypair; kp=generate_keypair(); print(kp.private_key_base64)"
    signing_key_base64: str = ""

    # --- Database ---
    database_url: str = "postgresql+asyncpg://jaringan:jaringan_dev@localhost:5433/jaringan_dagang"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8002
    debug: bool = True

    # --- Timeouts ---
    search_ttl_seconds: int = 30
    request_timeout_seconds: int = 10


settings = Settings()
