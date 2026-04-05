"""Orders API -- manage confirmed orders (status, tracking, cancellation).

After checkout, orders are tracked here. The frontend uses these endpoints
to list orders, check status, get tracking info, and cancel.

For status/track/cancel, the BAP sends a Beckn request to the BPP and the
response arrives asynchronously via callbacks. The frontend polls to get
the updated data.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.beckn.sender import BecknSender
from app.database import get_db
from app.models.order import BuyerOrder

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["orders"])


# ------------------------------------------------------------------
# Response schemas
# ------------------------------------------------------------------


class OrderSummary(BaseModel):
    """Brief order summary for the orders list."""

    id: str
    beckn_order_id: str | None
    bpp_id: str
    provider_id: str
    status: str
    quote: Any
    created_at: str


class OrderDetail(BaseModel):
    """Full order detail."""

    id: str
    beckn_order_id: str | None
    beckn_transaction_id: str
    bpp_id: str
    bpp_uri: str
    provider_id: str
    items: Any
    billing: Any
    shipping: Any
    quote: Any
    payment: Any
    fulfillment: Any
    tracking: Any
    cancellation: Any
    status: str
    created_at: str
    updated_at: str


class OrderActionResponse(BaseModel):
    """Response after sending a Beckn action for an order."""

    order_id: str
    action: str
    status: str
    message: str


class CancelRequest(BaseModel):
    """Request body for cancelling an order."""

    reason: str = Field(default="", description="Cancellation reason code or text")


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


@router.get("", response_model=list[OrderSummary])
async def list_orders(
    db: AsyncSession = Depends(get_db),
) -> list[OrderSummary]:
    """List all buyer orders, most recent first."""
    result = await db.execute(
        select(BuyerOrder).order_by(BuyerOrder.created_at.desc())
    )
    orders = result.scalars().all()

    return [
        OrderSummary(
            id=o.id,
            beckn_order_id=o.beckn_order_id,
            bpp_id=o.bpp_id,
            provider_id=o.provider_id,
            status=o.status.value,
            quote=o.quote,
            created_at=o.created_at.isoformat(),
        )
        for o in orders
    ]


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
) -> OrderDetail:
    """Get full order details."""
    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.id == order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return OrderDetail(
        id=order.id,
        beckn_order_id=order.beckn_order_id,
        beckn_transaction_id=order.beckn_transaction_id,
        bpp_id=order.bpp_id,
        bpp_uri=order.bpp_uri,
        provider_id=order.provider_id,
        items=order.items,
        billing=order.billing,
        shipping=order.shipping,
        quote=order.quote,
        payment=order.payment,
        fulfillment=order.fulfillment,
        tracking=order.tracking,
        cancellation=order.cancellation,
        status=order.status.value,
        created_at=order.created_at.isoformat(),
        updated_at=order.updated_at.isoformat(),
    )


@router.post("/{order_id}/status", response_model=OrderActionResponse)
async def request_status(
    order_id: str,
    db: AsyncSession = Depends(get_db),
) -> OrderActionResponse:
    """Request current order status from the BPP.

    Sends a Beckn status request. The BPP responds via on_status callback.
    The frontend should poll GET /api/orders/{order_id} to see the update.
    """
    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.id == order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order.beckn_order_id:
        raise HTTPException(
            status_code=400,
            detail="Order not yet confirmed by BPP (no beckn_order_id)",
        )

    sender = BecknSender()
    try:
        ack = await sender.send_status(
            transaction_id=order.beckn_transaction_id,
            bpp_id=order.bpp_id,
            bpp_uri=order.bpp_uri,
            order_id=order.beckn_order_id,
        )
        ack_status = ack.message.status.value
    except Exception:
        logger.exception("Failed to send status to BPP %s", order.bpp_id)
        ack_status = "SEND_FAILED"
    finally:
        await sender.close()

    return OrderActionResponse(
        order_id=order.id,
        action="status",
        status=ack_status,
        message="Status request sent. Poll order detail for updates.",
    )


@router.post("/{order_id}/track", response_model=OrderActionResponse)
async def request_tracking(
    order_id: str,
    db: AsyncSession = Depends(get_db),
) -> OrderActionResponse:
    """Request tracking information from the BPP.

    Sends a Beckn track request. The BPP responds via on_track callback.
    """
    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.id == order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order.beckn_order_id:
        raise HTTPException(
            status_code=400,
            detail="Order not yet confirmed by BPP (no beckn_order_id)",
        )

    sender = BecknSender()
    try:
        ack = await sender.send_track(
            transaction_id=order.beckn_transaction_id,
            bpp_id=order.bpp_id,
            bpp_uri=order.bpp_uri,
            order_id=order.beckn_order_id,
        )
        ack_status = ack.message.status.value
    except Exception:
        logger.exception("Failed to send track to BPP %s", order.bpp_id)
        ack_status = "SEND_FAILED"
    finally:
        await sender.close()

    return OrderActionResponse(
        order_id=order.id,
        action="track",
        status=ack_status,
        message="Track request sent. Poll order detail for tracking info.",
    )


@router.post("/{order_id}/cancel", response_model=OrderActionResponse)
async def cancel_order(
    order_id: str,
    body: CancelRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> OrderActionResponse:
    """Request order cancellation from the BPP.

    Sends a Beckn cancel request. The BPP responds via on_cancel callback.
    """
    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.id == order_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order.beckn_order_id:
        raise HTTPException(
            status_code=400,
            detail="Order not yet confirmed by BPP (no beckn_order_id)",
        )

    reason = body.reason if body else ""

    sender = BecknSender()
    try:
        ack = await sender.send_cancel(
            transaction_id=order.beckn_transaction_id,
            bpp_id=order.bpp_id,
            bpp_uri=order.bpp_uri,
            order_id=order.beckn_order_id,
            reason=reason,
        )
        ack_status = ack.message.status.value
    except Exception:
        logger.exception("Failed to send cancel to BPP %s", order.bpp_id)
        ack_status = "SEND_FAILED"
    finally:
        await sender.close()

    return OrderActionResponse(
        order_id=order.id,
        action="cancel",
        status=ack_status,
        message="Cancel request sent. Poll order detail for confirmation.",
    )
