"""Checkout API -- confirms a cart into an order.

Flow:
    1. POST /api/checkout/{cart_id}/confirm -- buyer confirms the order
       -> BAP creates a BuyerOrder, sends Beckn confirm to BPP
    2. GET /api/checkout/{cart_id}/status -- poll for confirmation (from on_confirm)

After confirmation, the order moves to the orders API for tracking.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.beckn.sender import BecknSender
from app.database import get_db
from app.models.cart import Cart, CartStatus
from app.models.order import BuyerOrder, OrderStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


# ------------------------------------------------------------------
# Response schemas
# ------------------------------------------------------------------


class CheckoutConfirmResponse(BaseModel):
    """Response after sending confirm."""

    order_id: str
    cart_id: str
    status: str
    message: str


class CheckoutStatusResponse(BaseModel):
    """Response with order confirmation status."""

    order_id: str | None
    beckn_order_id: str | None
    status: str
    payment: Any
    fulfillment: Any


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


@router.post("/{cart_id}/confirm", response_model=CheckoutConfirmResponse)
async def confirm_order(
    cart_id: str,
    db: AsyncSession = Depends(get_db),
) -> CheckoutConfirmResponse:
    """Confirm the order and send Beckn confirm to the BPP.

    This is the point of no return. The buyer commits to the order.
    The cart must have a valid order_draft (from on_init) before confirming.

    Creates a BuyerOrder record and marks the cart as checked_out.
    """
    result = await db.execute(select(Cart).where(Cart.id == cart_id))
    cart = result.scalar_one_or_none()

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    if cart.status != CartStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Cart is {cart.status.value}")
    if not cart.order_draft:
        raise HTTPException(
            status_code=400,
            detail="Cart has no order draft. Send init first.",
        )

    # Create the buyer order
    order_draft = cart.order_draft or {}
    buyer_order = BuyerOrder(
        cart_id=cart.id,
        beckn_transaction_id=cart.transaction_id,
        bpp_id=cart.bpp_id,
        bpp_uri=cart.bpp_uri,
        provider_id=cart.provider_id,
        items=cart.items,
        billing=order_draft.get("billing"),
        shipping=order_draft.get("fulfillments"),
        quote=cart.quote,
        status=OrderStatus.CREATED,
    )
    db.add(buyer_order)

    # Mark cart as checked out
    cart.status = CartStatus.CHECKED_OUT
    await db.flush()

    # Build the Beckn confirm order from the draft
    beckn_order: dict[str, Any] = {
        "provider": {"id": cart.provider_id},
        "items": cart.items,
    }
    # Carry over billing, fulfillments, payment from the draft
    for key in ("billing", "fulfillments", "payment", "payments", "quote"):
        if key in order_draft:
            beckn_order[key] = order_draft[key]

    # Send confirm to the BPP
    sender = BecknSender()
    try:
        ack = await sender.send_confirm(
            transaction_id=cart.transaction_id,
            bpp_id=cart.bpp_id,
            bpp_uri=cart.bpp_uri,
            order=beckn_order,
        )
        ack_status = ack.message.status.value
    except Exception:
        logger.exception("Failed to send confirm to BPP %s", cart.bpp_id)
        ack_status = "SEND_FAILED"
    finally:
        await sender.close()

    return CheckoutConfirmResponse(
        order_id=buyer_order.id,
        cart_id=cart.id,
        status=buyer_order.status.value,
        message=f"Confirm sent to BPP (ack={ack_status}). Poll for confirmation.",
    )


@router.get("/{cart_id}/status", response_model=CheckoutStatusResponse)
async def get_checkout_status(
    cart_id: str,
    db: AsyncSession = Depends(get_db),
) -> CheckoutStatusResponse:
    """Poll for order confirmation status.

    The frontend polls this after POST /api/checkout/{cart_id}/confirm
    to check if the on_confirm callback has arrived from the BPP.
    """
    # Find the order associated with this cart
    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.cart_id == cart_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="No order found for this cart. Confirm first.",
        )

    return CheckoutStatusResponse(
        order_id=order.id,
        beckn_order_id=order.beckn_order_id,
        status=order.status.value,
        payment=order.payment,
        fulfillment=order.fulfillment,
    )
