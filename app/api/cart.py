"""Cart API -- manages item selection and order initialization.

Flow:
    1. POST /api/cart/select -- buyer selects items from a specific BPP/provider
       -> BAP sends Beckn select to the BPP, returns cart_id
    2. GET /api/cart/{cart_id} -- poll for the quote (from on_select callback)
    3. POST /api/cart/{cart_id}/init -- buyer provides billing/shipping
       -> BAP sends Beckn init to the BPP
    4. GET /api/cart/{cart_id}/order-draft -- poll for draft order (from on_init)

A cart is always tied to a single BPP + provider. This is a Beckn constraint:
you cannot mix items from different providers in one transaction.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.beckn.sender import BecknSender
from app.database import get_db
from app.models.cart import Cart, CartStatus
from app.models.search_session import SearchSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cart", tags=["cart"])


# ------------------------------------------------------------------
# Request / Response schemas
# ------------------------------------------------------------------


class CartSelectItem(BaseModel):
    """An item to add to the cart."""

    id: str = Field(..., description="Item ID from the catalog")
    quantity: int = Field(default=1, ge=1, description="Number of units")


class CartSelectRequest(BaseModel):
    """Request to create a cart by selecting items from a BPP."""

    session_id: str = Field(..., description="Search session ID")
    bpp_id: str = Field(..., description="BPP subscriber ID")
    bpp_uri: str = Field(..., description="BPP subscriber URL")
    provider_id: str = Field(..., description="Provider ID within the BPP")
    items: list[CartSelectItem] = Field(..., min_length=1, description="Items to select")


class CartSelectResponse(BaseModel):
    """Response after creating a cart / sending select."""

    cart_id: str
    status: str
    message: str


class CartInitRequest(BaseModel):
    """Request to initialize an order with billing and shipping details."""

    billing: dict[str, Any] = Field(
        ...,
        description="Billing details (name, address, phone, email)",
    )
    shipping: dict[str, Any] = Field(
        ...,
        description="Shipping/fulfillment details (end location, contact)",
    )


class CartDetailResponse(BaseModel):
    """Cart details including quote from BPP."""

    cart_id: str
    bpp_id: str
    provider_id: str
    items: Any
    quote: Any
    status: str


class OrderDraftResponse(BaseModel):
    """Draft order details from on_init."""

    cart_id: str
    order_draft: Any
    quote: Any
    status: str


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


@router.post("/select", response_model=CartSelectResponse)
async def select_items(
    body: CartSelectRequest,
    db: AsyncSession = Depends(get_db),
) -> CartSelectResponse:
    """Select items from a specific BPP/provider and request a quote.

    Creates a Cart record and sends a Beckn select to the BPP. The BPP
    responds asynchronously via on_select with the price quote.
    """
    # Look up the search session to get the transaction_id
    result = await db.execute(
        select(SearchSession).where(SearchSession.id == body.session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Search session not found")

    # Build items list for storage and Beckn message
    items_data = [
        {"id": item.id, "quantity": {"selected": {"count": item.quantity}}}
        for item in body.items
    ]

    # Create the cart
    cart = Cart(
        session_id=body.session_id,
        transaction_id=session.transaction_id,
        bpp_id=body.bpp_id,
        bpp_uri=body.bpp_uri,
        provider_id=body.provider_id,
        items=items_data,
        status=CartStatus.ACTIVE,
    )
    db.add(cart)
    await db.flush()

    # Build Beckn select order
    beckn_order = {
        "provider": {"id": body.provider_id},
        "items": items_data,
    }

    # Send select to the BPP (fire-and-forget)
    sender = BecknSender()
    try:
        ack = await sender.send_select(
            transaction_id=session.transaction_id,
            bpp_id=body.bpp_id,
            bpp_uri=body.bpp_uri,
            order=beckn_order,
        )
        ack_status = ack.message.status.value
    except Exception:
        logger.exception("Failed to send select to BPP %s", body.bpp_id)
        ack_status = "SEND_FAILED"
    finally:
        await sender.close()

    return CartSelectResponse(
        cart_id=cart.id,
        status=cart.status.value,
        message=f"Select sent to BPP (ack={ack_status}). Poll for quote.",
    )


@router.get("/{cart_id}", response_model=CartDetailResponse)
async def get_cart(
    cart_id: str,
    db: AsyncSession = Depends(get_db),
) -> CartDetailResponse:
    """Get cart details including the quote from the BPP.

    The frontend polls this after POST /api/cart/select to check if the
    on_select callback has arrived with a price quote.
    """
    result = await db.execute(select(Cart).where(Cart.id == cart_id))
    cart = result.scalar_one_or_none()

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    return CartDetailResponse(
        cart_id=cart.id,
        bpp_id=cart.bpp_id,
        provider_id=cart.provider_id,
        items=cart.items,
        quote=cart.quote,
        status=cart.status.value,
    )


@router.post("/{cart_id}/init")
async def init_order(
    cart_id: str,
    body: CartInitRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Initialize an order with billing and shipping details.

    Sends a Beckn init to the BPP with the buyer's billing address,
    shipping address, and selected items. The BPP responds via on_init
    with finalized payment terms and fulfillment options.
    """
    result = await db.execute(select(Cart).where(Cart.id == cart_id))
    cart = result.scalar_one_or_none()

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    if cart.status != CartStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=f"Cart is {cart.status.value}")

    # Build Beckn init order
    beckn_order = {
        "provider": {"id": cart.provider_id},
        "items": cart.items,
        "billing": body.billing,
        "fulfillments": [
            {
                "id": "fulfillment-1",
                "type": "Delivery",
                "end": body.shipping,
            }
        ],
    }

    # Send init to the BPP
    sender = BecknSender()
    try:
        ack = await sender.send_init(
            transaction_id=cart.transaction_id,
            bpp_id=cart.bpp_id,
            bpp_uri=cart.bpp_uri,
            order=beckn_order,
        )
        ack_status = ack.message.status.value
    except Exception:
        logger.exception("Failed to send init to BPP %s", cart.bpp_id)
        ack_status = "SEND_FAILED"
    finally:
        await sender.close()

    return {
        "cart_id": cart.id,
        "status": "init_sent",
        "message": f"Init sent to BPP (ack={ack_status}). Poll for order draft.",
    }


@router.get("/{cart_id}/order-draft", response_model=OrderDraftResponse)
async def get_order_draft(
    cart_id: str,
    db: AsyncSession = Depends(get_db),
) -> OrderDraftResponse:
    """Get the draft order details from the BPP's on_init response.

    The frontend polls this after POST /api/cart/{id}/init to see the
    finalized payment terms, delivery estimates, and total quote before
    the buyer confirms.
    """
    result = await db.execute(select(Cart).where(Cart.id == cart_id))
    cart = result.scalar_one_or_none()

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    return OrderDraftResponse(
        cart_id=cart.id,
        order_draft=cart.order_draft,
        quote=cart.quote,
        status=cart.status.value,
    )
