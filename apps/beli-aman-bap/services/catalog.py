"""Mock catalog reader. Loads JSON fixtures from apps/beli-aman-bap/catalog/<slug>.json.

The catalog is hardcoded (committed JSON) for v1 — no DB-backed catalog yet.
This is intentional: the demo runs without a CMS and stays predictable.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


_CATALOG_DIR = Path(__file__).resolve().parent.parent / "catalog"


@lru_cache(maxsize=8)
def load_catalog(brand_slug: str) -> dict[str, Any]:
    """Load and cache `<brand_slug>.json` from the catalog directory."""
    path = _CATALOG_DIR / f"{brand_slug}.json"
    if not path.exists():
        raise FileNotFoundError(f"No catalog file for brand '{brand_slug}' at {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def list_products(brand_slug: str) -> list[dict[str, Any]]:
    return load_catalog(brand_slug).get("products", [])


def get_product(brand_slug: str, product_slug: str) -> dict[str, Any] | None:
    for p in list_products(brand_slug):
        if p.get("slug") == product_slug:
            return p
    return None
