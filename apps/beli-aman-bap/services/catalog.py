"""Catalog reader — now backed by the Beckn mirror tables (mirror_*).

Previously read JSON fixtures from apps/beli-aman-bap/catalog/*.json. After
Phase 2 of the Beckn migration, the seller's Postgres is the source of truth;
those JSONs are gone. Storefront queries hit the local read-only mirror
populated by Beckn /on_search push + /search pull.

Response shape is preserved for backwards-compat with the storefront UI:
    {
        "products": [
            {
                "name": ..., "description": ..., "sku": ..., "image": ...,
                "gallery": [...], "tagline": ..., "badges": [...], "category": ...,
                "option_axes": [...],
                "variants": [
                    {"sku": ..., "label": ..., "price_idr": ..., "stock": ...,
                     "weight_grams": ..., "gallery": [...], "image": ...,
                     "compare_at_price_idr": ...},
                    ...
                ],
            },
            ...
        ]
    }
"""

from __future__ import annotations

import asyncio
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import async_session
from models.mirror import MirrorProduct, MirrorSKU, MirrorStore

logger = logging.getLogger(__name__)

# Fallback JSON dir — kept only for absolute-last-resort if mirror is empty AND
# the JSON file still exists. Once Phase 2 is fully shipped + JSONs deleted,
# this fallback returns nothing.
_FALLBACK_CATALOG_DIR = Path(__file__).resolve().parent.parent / "catalog"


def _serialize_product(p: MirrorProduct) -> dict[str, Any]:
    """Map a MirrorProduct (+ skus + images) to the legacy JSON shape."""
    parent_imgs = sorted(p.images or [], key=lambda i: i.position)
    primary_img = next((i.url for i in parent_imgs if i.is_primary), None)
    if primary_img is None and parent_imgs:
        primary_img = parent_imgs[0].url

    variants = []
    for s in sorted(p.skus or [], key=lambda s: s.sku_code):
        sku_imgs = sorted(s.images or [], key=lambda i: i.position)
        sku_primary = next((i.url for i in sku_imgs if i.is_primary), None)
        if sku_primary is None and sku_imgs:
            sku_primary = sku_imgs[0].url
        variants.append({
            "sku": s.sku_code,
            "label": s.variant_value or s.variant_name or "Default",
            "price_idr": int(s.price) if s.price is not None else 0,
            "compare_at_price_idr": int(s.original_price) if s.original_price else None,
            "stock": s.stock,
            "weight_grams": s.weight_grams,
            "gallery": [i.url for i in sku_imgs],
            "image": sku_primary,
        })

    attrs = p.attributes if isinstance(p.attributes, dict) else {}
    return {
        "name": p.name,
        "description": p.description or "",
        "sku": p.sku,
        "slug": (p.sku or "").lower().replace("_", "-"),
        "image": primary_img,
        "gallery": [i.url for i in parent_imgs],
        "tagline": attrs.get("tagline"),
        "badges": attrs.get("badges", []),
        "category": attrs.get("category"),
        "option_axes": attrs.get("option_axes", []),
        "variants": variants,
    }


async def _list_products_async(brand_slug: str) -> list[dict[str, Any]]:
    async with async_session() as db:
        result = await db.execute(
            select(MirrorStore)
            .where(MirrorStore.slug == brand_slug)
            .options(
                selectinload(MirrorStore.products).selectinload(MirrorProduct.skus).selectinload(MirrorSKU.images),
                selectinload(MirrorStore.products).selectinload(MirrorProduct.images),
            )
        )
        store = result.scalar_one_or_none()
        if store is None or not store.products:
            return []
        return [_serialize_product(p) for p in store.products]


@lru_cache(maxsize=8)
def _load_fallback(brand_slug: str) -> dict[str, Any]:
    path = _FALLBACK_CATALOG_DIR / f"{brand_slug}.json"
    if not path.exists():
        return {"products": []}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


async def list_products(brand_slug: str) -> list[dict[str, Any]]:
    """Return the toko's products from the mirror.

    Falls back to legacy JSON only if mirror is empty AND a JSON file still
    exists (transition aid; will return empty list once JSONs are deleted).
    """
    products = await _list_products_async(brand_slug)
    if products:
        return products
    fb = _load_fallback(brand_slug).get("products", [])
    if fb:
        logger.warning(
            "catalog mirror empty for %s — falling back to JSON (%d products). "
            "Trigger a Beckn /search to populate the mirror.",
            brand_slug, len(fb),
        )
    return fb


async def get_product(brand_slug: str, product_slug: str) -> dict[str, Any] | None:
    for p in await list_products(brand_slug):
        if p.get("slug") == product_slug or p.get("sku") == product_slug:
            return p
    return None
