"""Beckn on_* handler implementations.

Each `handle_on_<action>(context, message, db)` mutates state in response to an
inbound signed Beckn callback. Returning None falls back to the default ACK.

Phase 2 wires handle_on_search → mirror upsert.
Later phases will wire on_select/on_init/on_confirm/on_status/on_update.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.mirror import (
    MirrorProduct,
    MirrorProductImage,
    MirrorSKU,
    MirrorSKUImage,
    MirrorStore,
)

logger = logging.getLogger(__name__)


def _slug_from_bpp_id(bpp_id: str) -> str:
    """safiyafood.bpp.metatech.id -> safiyafood"""
    return bpp_id.split(".", 1)[0]


async def handle_on_search(
    context: dict[str, Any],
    message: dict[str, Any],
    db: AsyncSession,
) -> dict | None:
    """Upsert the catalog payload into mirror_* tables.

    Strategy for v1: full-replace per (bpp_id, provider). Catalogs are small
    (<200 SKUs/toko); delta optimization comes later.
    """
    bpp_id = context.get("bpp_id") or ""
    catalog = message.get("catalog") or {}
    providers = catalog.get("bpp/providers") or catalog.get("providers") or []

    if not providers:
        logger.info("on_search from %s: empty catalog", bpp_id)
        return None

    bpp_uri = context.get("bpp_uri")
    now = datetime.now(timezone.utc)

    for provider in providers:
        provider_id = provider.get("id") or bpp_id
        slug = _slug_from_bpp_id(provider_id)
        store_name = (provider.get("descriptor") or {}).get("name") or slug
        logo = None
        imgs = (provider.get("descriptor") or {}).get("images") or []
        if imgs:
            logo = imgs[0] if isinstance(imgs[0], str) else imgs[0].get("url")

        store = (
            await db.execute(
                select(MirrorStore).where(MirrorStore.bpp_id == provider_id)
            )
        ).scalar_one_or_none()
        if store is None:
            store = MirrorStore(
                bpp_id=provider_id,
                slug=slug,
                name=store_name,
                logo_url=logo,
                bpp_uri=bpp_uri,
            )
            db.add(store)
            await db.flush()
        else:
            store.name = store_name
            if logo:
                store.logo_url = logo
            if bpp_uri:
                store.bpp_uri = bpp_uri
        store.last_pushed_at = now

        # Full replace of this store's products (cascade deletes skus + images)
        existing = (
            await db.execute(
                select(MirrorProduct).where(MirrorProduct.store_id == store.id)
            )
        ).scalars().all()
        for ep in existing:
            await db.delete(ep)
        await db.flush()

        # Group items by parent_item_id so we re-build the Product → SKU hierarchy.
        items = provider.get("items") or []
        by_parent: dict[str, list[dict]] = {}
        for item in items:
            parent = item.get("parent_item_id") or item.get("id")
            by_parent.setdefault(parent, []).append(item)

        for parent_id, group in by_parent.items():
            first = group[0]
            desc = first.get("descriptor") or {}
            name = desc.get("name") or parent_id
            product = MirrorProduct(
                store_id=store.id,
                bpp_product_id=parent_id,
                sku=parent_id,
                name=name,
                description=desc.get("long_desc") or desc.get("short_desc"),
                status="ACTIVE",
                attributes=first.get("tags") or None,
            )
            db.add(product)
            await db.flush()

            # parent-level images (use the first item's images if any are present)
            parent_imgs = []
            d_imgs = desc.get("images") or []
            for i, img in enumerate(d_imgs):
                url = img if isinstance(img, str) else img.get("url")
                if url:
                    parent_imgs.append(
                        MirrorProductImage(
                            product_id=product.id, url=url,
                            position=i, is_primary=(i == 0),
                        )
                    )
            for pi in parent_imgs:
                db.add(pi)

            for item in group:
                idesc = item.get("descriptor") or {}
                price_obj = item.get("price") or {}
                qty_obj = (item.get("quantity") or {}).get("available") or {}
                variant_name = None
                variant_value = None
                for tag in item.get("tags") or []:
                    if tag.get("code") == "variant":
                        for kv in tag.get("list") or []:
                            if kv.get("code") == "name":
                                variant_name = kv.get("value")
                            elif kv.get("code") == "value":
                                variant_value = kv.get("value")
                try:
                    price = float(price_obj.get("value") or 0)
                except (TypeError, ValueError):
                    price = 0.0
                try:
                    original = float(price_obj.get("maximum_value") or price)
                except (TypeError, ValueError):
                    original = price
                try:
                    stock = int(qty_obj.get("count") or 0)
                except (TypeError, ValueError):
                    stock = 0

                sku = MirrorSKU(
                    product_id=product.id,
                    bpp_sku_id=item.get("id") or "",
                    variant_name=variant_name,
                    variant_value=variant_value,
                    sku_code=idesc.get("code") or item.get("id") or "",
                    price=price,
                    original_price=original,
                    stock=stock,
                )
                db.add(sku)
                await db.flush()

                # SKU-level images
                for i, img in enumerate(idesc.get("images") or []):
                    url = img if isinstance(img, str) else img.get("url")
                    if url:
                        db.add(
                            MirrorSKUImage(
                                sku_id=sku.id, url=url,
                                position=i, is_primary=(i == 0),
                            )
                        )

    return None  # default ACK
