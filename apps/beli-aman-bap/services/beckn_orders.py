"""Buyer-side Beckn order helpers — send /confirm to seller's BPP.

Replaces services/seller_bridge.py which posted to a private REST endpoint.
This routes the same intent through the Beckn protocol (signed + idempotent).
"""

from __future__ import annotations

import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Any

# Make the beckn-protocol package importable
_proto_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "packages", "beckn-protocol")
)
if _proto_path not in sys.path:
    sys.path.insert(0, _proto_path)

from beckn.outbound import send_beckn_request  # noqa: E402
from config import settings  # noqa: E402

logger = logging.getLogger(__name__)


def _ctx(*, action: str, bpp_id: str, bpp_uri: str, transaction_id: str | None = None) -> dict:
    return {
        "domain": settings.domain,
        "country": settings.country_code,
        "city": settings.city_code,
        "action": action,
        "core_version": settings.core_version,
        "bap_id": settings.subscriber_id,
        "bap_uri": settings.subscriber_url,
        "bpp_id": bpp_id,
        "bpp_uri": bpp_uri,
        "transaction_id": transaction_id or str(uuid.uuid4()),
        "message_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def confirm_order(*, order_dict: dict[str, Any]) -> bool:
    """Send a Beckn /confirm to the seller's BPP.

    `order_dict` matches what seller_bridge.post_order used to send. The
    payload is embedded in the message.order portion so the seller's
    handle_confirm can upsert.
    """
    bpp_id = order_dict.get("bpp_id") or os.environ.get("DEFAULT_BPP_ID", "bpp.jaringan-dagang.local")
    bpp_uri = os.environ.get("DEFAULT_BPP_URL", "http://localhost:8001/beckn")
    target = f"{bpp_uri.rstrip('/')}/confirm"

    env = {
        "context": _ctx(action="confirm", bpp_id=bpp_id, bpp_uri=bpp_uri,
                        transaction_id=order_dict.get("transaction_id")),
        "message": {
            "order": {
                "id": order_dict.get("order_id"),
                "items": order_dict.get("items") or [],
                "billing": (order_dict.get("buyer") or {}),
                "fulfillments": [
                    {
                        "type": "Delivery",
                        "end": {"location": {"address": order_dict.get("shipping_address")}},
                    }
                ],
                "quote": {
                    "price": {"value": str(order_dict.get("total_idr") or 0), "currency": "IDR"},
                },
                "payments": [
                    {
                        "type": "PRE-FULFILLMENT",
                        "status": "PAID",
                        "params": {"amount": str(order_dict.get("total_idr") or 0), "currency": "IDR"},
                    }
                ],
                "tags": [{"code": "escrow_status", "list": [{"code": "value", "value": order_dict.get("escrow_status") or "held"}]}],
            }
        },
    }
    try:
        return await send_beckn_request(
            bpp_id=bpp_id, action="confirm", body=env, target_url=target,
        )
    except Exception:
        logger.exception("beckn /confirm to %s failed", target)
        return False
