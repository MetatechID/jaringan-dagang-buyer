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
from models.order import Order

logger = logging.getLogger(__name__)


_SLUG_OVERRIDES = {
    "bpp.antarestar.local": "antarestar",
    "bpp.gendes.local": "gendes",
    "bpp.yourbrand.local": "yourbrand",
    "bpp.jaringan-dagang.local": "default",
    "matchamu.jaringan-dagang.id": "matchamu",
    "optimumnutrition.jaringan-dagang.id": "optimumnutrition",
}


def _slug_from_bpp_id(bpp_id: str, name: str | None = None) -> str:
    """Map a Beckn subscriber_id to a storefront slug.

    Tries (in order): override map → `<slug>.bpp.metatech.id` pattern → name slugified.
    """
    if bpp_id in _SLUG_OVERRIDES:
        return _SLUG_OVERRIDES[bpp_id]
    parts = bpp_id.split(".")
    if len(parts) >= 3 and parts[1] == "bpp":
        return parts[0]
    if name:
        import re
        slugged = re.sub(r"[^a-z0-9]+", "", name.lower())
        if slugged:
            return slugged
    return bpp_id.replace(".", "-")


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
        store_name = (provider.get("descriptor") or {}).get("name") or provider_id
        slug = _slug_from_bpp_id(provider_id, store_name)
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
                            # Beckn TagValue: code lives under descriptor.code
                            code = kv.get("code") or (kv.get("descriptor") or {}).get("code")
                            if code == "name":
                                variant_name = kv.get("value")
                            elif code == "value":
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


async def handle_on_status(
    context: dict[str, Any],
    message: dict[str, Any],
    db: AsyncSession,
) -> dict | None:
    """Update local Order with fulfillment state from /on_status."""
    order_msg = message.get("order") or {}
    bpp_order_id = order_msg.get("id")
    if not bpp_order_id:
        return None

    # Match either by seller_order_ref or our local id (UUID string).
    candidate = (await db.execute(
        select(Order).where(Order.seller_order_ref == bpp_order_id)
    )).scalar_one_or_none()
    if candidate is None and len(bpp_order_id) == 36:
        # bpp_order_id might be our local id in some flows
        candidate = (await db.execute(
            select(Order).where(Order.id == bpp_order_id)
        )).scalar_one_or_none()
    if candidate is None:
        logger.info("on_status for unknown order %s — ignoring", bpp_order_id)
        return None

    fulfillments = order_msg.get("fulfillments") or []
    if not fulfillments:
        return None
    f = fulfillments[0]
    state_code = (f.get("state") or {}).get("descriptor", {}).get("code")
    if state_code:
        candidate.fulfillment_status = state_code
    awb = f.get("tracking_id")
    if awb:
        candidate.fulfillment_awb = awb
    track_url = f.get("tracking_url")
    if track_url:
        candidate.fulfillment_tracking_url = track_url
    from datetime import datetime, timezone
    candidate.fulfillment_last_event_at = datetime.now(timezone.utc)
    return None


async def handle_on_confirm(
    context: dict[str, Any],
    message: dict[str, Any],
    db: AsyncSession,
) -> dict | None:
    """Record the seller-assigned order id when /confirm completes."""
    order_msg = message.get("order") or {}
    bpp_order_id = order_msg.get("id")
    txn_id = context.get("transaction_id")
    if not bpp_order_id or not txn_id:
        return None
    # Find local order by transaction or by seller_order_ref
    candidate = (await db.execute(
        select(Order).where(Order.seller_order_ref == bpp_order_id)
    )).scalar_one_or_none()
    if candidate is None:
        # No correlation field for transaction_id today; skip if unmatched.
        return None
    candidate.seller_order_ref = bpp_order_id
    return None


async def handle_on_update(
    context: dict[str, Any],
    message: dict[str, Any],
    db: AsyncSession,
) -> dict | None:
    """Track refund lifecycle updates from the BPP.

    Tags we listen for:
      - refund_pending  → record bpp_refund_request_id on the Dispute
      - refund_approved → mark Dispute as brand_responding (Xendit pending)
      - refund_denied   → mark Dispute as resolved (denied)
      - refund_settled  → mark Dispute resolved + flip Order to REFUNDED
    """
    from models.dispute import Dispute, DisputeStatus
    from models.order import OrderState

    order_msg = message.get("order") or {}
    bpp_order_id = order_msg.get("id")
    if not bpp_order_id:
        return None

    # Find the local order
    order = (await db.execute(
        select(Order).where(Order.seller_order_ref == bpp_order_id)
    )).scalar_one_or_none()
    if order is None and len(bpp_order_id) == 36:
        order = (await db.execute(
            select(Order).where(Order.id == bpp_order_id)
        )).scalar_one_or_none()
    if order is None:
        return None

    dispute = (await db.execute(
        select(Dispute).where(Dispute.order_id == order.id).order_by(Dispute.created_at.desc())
    )).scalars().first()

    for tag in order_msg.get("tags") or []:
        code = tag.get("code")
        kv = {x.get("code"): x.get("value") for x in tag.get("list") or []}
        if code == "refund_pending" and dispute is not None:
            dispute.bpp_refund_request_id = kv.get("refund_request_id")
        elif code == "refund_approved" and dispute is not None:
            dispute.bpp_refund_request_id = kv.get("refund_request_id") or dispute.bpp_refund_request_id
            dispute.status = DisputeStatus.BRAND_RESPONDING
        elif code == "refund_denied" and dispute is not None:
            dispute.status = DisputeStatus.RESOLVED
            dispute.resolution = "denied"
            dispute.note = kv.get("seller_note") or dispute.note
        elif code == "refund_settled":
            if dispute is not None:
                dispute.status = DisputeStatus.RESOLVED
                dispute.resolution = "refunded"
            if order.state != OrderState.REFUNDED:
                order.state = OrderState.REFUNDED
    return None
