"""Idempotently seed the three demo brands into the beli_aman database.

Run after the Beli Aman BAP has been started at least once (so the tables exist):

    python infra/beli-aman/seed-brands.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Make the BAP's own modules importable
_repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_repo_root / "apps" / "beli-aman-bap"))

# noqa: E402
from sqlalchemy import select  # type: ignore
from sqlalchemy.ext.asyncio import AsyncSession  # type: ignore

from database import async_session  # type: ignore
from models import Brand  # type: ignore


SEED_BRANDS = [
    {
        "slug": "antarestar",
        "name": "ANTARESTAR",
        "bpp_id": "bpp.antarestar.local",
        "bpp_uri": "http://localhost:8001",
        "fee_pct_bp": 0,
    },
    {
        "slug": "gendes",
        "name": "Gendes",
        "bpp_id": "bpp.gendes.local",
        "bpp_uri": "http://localhost:8001",
        "fee_pct_bp": 0,
    },
    {
        "slug": "yourbrand",
        "name": "YourBrand",
        "bpp_id": "bpp.yourbrand.local",
        "bpp_uri": "http://localhost:8001",
        "fee_pct_bp": 0,
    },
]


async def main() -> None:
    async with async_session() as session:  # type: AsyncSession
        for spec in SEED_BRANDS:
            existing = (await session.execute(
                select(Brand).where(Brand.slug == spec["slug"])
            )).scalar_one_or_none()
            if existing:
                # Refresh editable fields
                existing.name = spec["name"]
                existing.bpp_id = spec["bpp_id"]
                existing.bpp_uri = spec["bpp_uri"]
                existing.fee_pct_bp = spec["fee_pct_bp"]
                print(f"[seed] updated {spec['slug']}")
            else:
                session.add(Brand(**spec))
                print(f"[seed] inserted {spec['slug']}")
        await session.commit()


if __name__ == "__main__":
    asyncio.run(main())
