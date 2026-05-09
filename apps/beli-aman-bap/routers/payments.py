"""POST /api/v1/orders/{id}/confirm-payment — the heart of the demo.

This is where 'mock paid' happens: CART_REVIEWED → ESCROW_HELD. We write the
HOLD ledger row and best-effort POST the order to the seller.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from deps import get_current_profile
from models.order import Order, OrderState
from models.profile import BeliAmanProfile
from services import escrow as escrow_service
from services import seller_bridge
from services.state_machine import StateTransitionError, lock_order_for_update, transition

router = APIRouter(prefix="/api/v1/orders", tags=["payments"])


@router.post("/{order_id}/confirm-payment")
async def confirm_payment(
    order_id: str,
    profile: BeliAmanProfile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mock 'user paid' — flips CART_REVIEWED → ESCROW_HELD. Idempotent."""
    order = await lock_order_for_update(db, order_id)
    if not order or order.profile_id != profile.id:
        raise HTTPException(404, "Order not found")

    if order.state == OrderState.ESCROW_HELD:
        # idempotent — return the existing order
        return _short(order, message="Already in ESCROW_HELD")

    try:
        await transition(
            db, order, OrderState.ESCROW_HELD,
            actor=f"buyer:{profile.id}",
            payload={"mock_paid_via": "Beli Aman Xendit-style mock"},
        )
    except StateTransitionError as e:
        raise HTTPException(409, str(e))

    await escrow_service.hold(
        db, order_id=order.id, amount_idr=order.total_idr,
        description="Funds held by Beli Aman pending receipt",
    )

    # Best-effort: post to seller. Don't fail the request if this fails.
    await seller_bridge.post_order(order_dict={
        "order_id": order.id,
        "bap_id": order.bap_id,
        "bpp_id": order.bpp_id,
        "buyer": {
            "id": profile.id,
            "email": profile.email,
            "display_name": profile.display_name,
            "photo_url": profile.photo_url,
        },
        "items": order.items,
        "subtotal_idr": order.subtotal_idr,
        "shipping_idr": order.shipping_idr,
        "total_idr": order.total_idr,
        "shipping_address": order.shipping_address,
        "escrow_status": "held",
    })

    return _short(order, message="ESCROW_HELD")


def _short(order: Order, *, message: str) -> dict:
    return {
        "id": order.id,
        "state": order.state.value,
        "total_idr": order.total_idr,
        "message": message,
    }
