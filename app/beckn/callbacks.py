"""Beckn callback endpoints (on_search, on_select, on_init, etc.).

These endpoints receive async responses from BPPs (routed via the Gateway
for on_search, or directly from BPPs for all others). Each callback:

1. Validates the incoming BecknResponse
2. Looks up the relevant DB record by transaction_id
3. Stores the response data
4. Returns a synchronous ACK

The frontend polls separate REST endpoints to retrieve these results.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from python.message import AckMessage, AckResponse, AckStatus, BecknResponse

from app.database import get_db
from app.models.cart import Cart
from app.models.order import BuyerOrder, OrderStatus
from app.models.search_session import SearchSession, SearchStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/beckn", tags=["beckn-callbacks"])


def _ack() -> dict[str, Any]:
    """Return a Beckn ACK response."""
    return AckResponse(
        message=AckMessage(status=AckStatus.ACK),
    ).model_dump()


def _nack(error_msg: str) -> dict[str, Any]:
    """Return a Beckn NACK response."""
    return AckResponse(
        message=AckMessage(status=AckStatus.NACK),
    ).model_dump()


# ------------------------------------------------------------------
# on_search -- catalog results from BPPs (routed via Gateway)
# ------------------------------------------------------------------


@router.post("/on_search")
async def on_search(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Receive catalog results from a BPP via the Gateway.

    Multiple on_search callbacks arrive for a single search request (one
    per BPP that has matching results). Results are accumulated in the
    SearchSession.results dict, keyed by bpp_id.
    """
    body = await request.json()

    try:
        resp = BecknResponse.model_validate(body)
    except Exception:
        logger.exception("Invalid on_search payload")
        return _nack("Invalid payload")

    txn_id = resp.context.transaction_id
    bpp_id = resp.context.bpp_id or "unknown"

    logger.info("on_search received from bpp=%s txn=%s", bpp_id, txn_id)

    # Find the search session by transaction_id
    result = await db.execute(
        select(SearchSession).where(SearchSession.transaction_id == txn_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        logger.warning("on_search: no session for txn=%s", txn_id)
        return _nack("Session not found")

    # Accumulate results keyed by bpp_id
    catalog_data = resp.message.get("catalog", {}) if resp.message else {}
    existing_results = session.results or {}
    existing_results[bpp_id] = {
        "bpp_id": bpp_id,
        "bpp_uri": resp.context.bpp_uri,
        "catalog": catalog_data,
    }
    session.results = existing_results
    session.status = SearchStatus.ACTIVE

    # Force SQLAlchemy to detect the JSONB mutation
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(session, "results")

    await db.flush()

    return _ack()


# ------------------------------------------------------------------
# on_select -- quote from BPP
# ------------------------------------------------------------------


@router.post("/on_select")
async def on_select(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Receive a price quote from a BPP in response to a select request."""
    body = await request.json()

    try:
        resp = BecknResponse.model_validate(body)
    except Exception:
        logger.exception("Invalid on_select payload")
        return _nack("Invalid payload")

    txn_id = resp.context.transaction_id
    logger.info("on_select received txn=%s", txn_id)

    # Find the cart by transaction_id
    result = await db.execute(
        select(Cart).where(Cart.transaction_id == txn_id)
    )
    cart = result.scalar_one_or_none()

    if not cart:
        logger.warning("on_select: no cart for txn=%s", txn_id)
        return _nack("Cart not found")

    # Store the quote from the BPP
    order_data = resp.message.get("order", {}) if resp.message else {}
    cart.quote = order_data.get("quote")

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(cart, "quote")
    await db.flush()

    return _ack()


# ------------------------------------------------------------------
# on_init -- draft order details from BPP
# ------------------------------------------------------------------


@router.post("/on_init")
async def on_init(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Receive draft order details from a BPP in response to an init request.

    The BPP returns finalized payment terms, fulfillment options, and any
    adjustments to the order before the buyer confirms.
    """
    body = await request.json()

    try:
        resp = BecknResponse.model_validate(body)
    except Exception:
        logger.exception("Invalid on_init payload")
        return _nack("Invalid payload")

    txn_id = resp.context.transaction_id
    logger.info("on_init received txn=%s", txn_id)

    result = await db.execute(
        select(Cart).where(Cart.transaction_id == txn_id)
    )
    cart = result.scalar_one_or_none()

    if not cart:
        logger.warning("on_init: no cart for txn=%s", txn_id)
        return _nack("Cart not found")

    # Store the full order draft returned by the BPP
    order_data = resp.message.get("order", {}) if resp.message else {}
    cart.order_draft = order_data
    cart.quote = order_data.get("quote", cart.quote)

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(cart, "order_draft")
    flag_modified(cart, "quote")
    await db.flush()

    return _ack()


# ------------------------------------------------------------------
# on_confirm -- confirmed order from BPP
# ------------------------------------------------------------------


@router.post("/on_confirm")
async def on_confirm(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Receive a confirmed order from a BPP.

    The BPP assigns an order ID and confirms the order. This creates or
    updates the BuyerOrder record.
    """
    body = await request.json()

    try:
        resp = BecknResponse.model_validate(body)
    except Exception:
        logger.exception("Invalid on_confirm payload")
        return _nack("Invalid payload")

    txn_id = resp.context.transaction_id
    logger.info("on_confirm received txn=%s", txn_id)

    order_data = resp.message.get("order", {}) if resp.message else {}

    # Find the buyer order by transaction_id
    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.beckn_transaction_id == txn_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        logger.warning("on_confirm: no order for txn=%s", txn_id)
        return _nack("Order not found")

    # Update with confirmed details from BPP
    order.beckn_order_id = order_data.get("id")
    order.status = OrderStatus.CONFIRMED
    order.items = order_data.get("items", order.items)
    order.quote = order_data.get("quote", order.quote)
    order.fulfillment = order_data.get("fulfillments", order.fulfillment)

    # Store payment details from BPP
    payment = order_data.get("payment") or order_data.get("payments")
    if payment:
        order.payment = payment if isinstance(payment, dict) else {"payments": payment}

    await db.flush()

    return _ack()


# ------------------------------------------------------------------
# on_status -- order status update
# ------------------------------------------------------------------


@router.post("/on_status")
async def on_status(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Receive an order status update from a BPP."""
    body = await request.json()

    try:
        resp = BecknResponse.model_validate(body)
    except Exception:
        logger.exception("Invalid on_status payload")
        return _nack("Invalid payload")

    txn_id = resp.context.transaction_id
    logger.info("on_status received txn=%s", txn_id)

    order_data = resp.message.get("order", {}) if resp.message else {}

    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.beckn_transaction_id == txn_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        logger.warning("on_status: no order for txn=%s", txn_id)
        return _nack("Order not found")

    # Map Beckn order state to our OrderStatus
    beckn_state = order_data.get("state", "")
    state_map = {
        "Created": OrderStatus.CREATED,
        "Accepted": OrderStatus.CONFIRMED,
        "In-progress": OrderStatus.IN_PROGRESS,
        "Completed": OrderStatus.COMPLETED,
        "Cancelled": OrderStatus.CANCELLED,
    }
    if beckn_state in state_map:
        order.status = state_map[beckn_state]

    order.fulfillment = order_data.get("fulfillments", order.fulfillment)
    order.quote = order_data.get("quote", order.quote)

    await db.flush()

    return _ack()


# ------------------------------------------------------------------
# on_track -- tracking info
# ------------------------------------------------------------------


@router.post("/on_track")
async def on_track(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Receive tracking information from a BPP."""
    body = await request.json()

    try:
        resp = BecknResponse.model_validate(body)
    except Exception:
        logger.exception("Invalid on_track payload")
        return _nack("Invalid payload")

    txn_id = resp.context.transaction_id
    logger.info("on_track received txn=%s", txn_id)

    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.beckn_transaction_id == txn_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        logger.warning("on_track: no order for txn=%s", txn_id)
        return _nack("Order not found")

    tracking_data = resp.message.get("tracking", {}) if resp.message else {}
    order.tracking = tracking_data

    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(order, "tracking")
    await db.flush()

    return _ack()


# ------------------------------------------------------------------
# on_cancel -- cancellation confirmation
# ------------------------------------------------------------------


@router.post("/on_cancel")
async def on_cancel(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Receive cancellation confirmation from a BPP."""
    body = await request.json()

    try:
        resp = BecknResponse.model_validate(body)
    except Exception:
        logger.exception("Invalid on_cancel payload")
        return _nack("Invalid payload")

    txn_id = resp.context.transaction_id
    logger.info("on_cancel received txn=%s", txn_id)

    order_data = resp.message.get("order", {}) if resp.message else {}

    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.beckn_transaction_id == txn_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        logger.warning("on_cancel: no order for txn=%s", txn_id)
        return _nack("Order not found")

    order.status = OrderStatus.CANCELLED
    order.cancellation = order_data.get("cancellation")

    await db.flush()

    return _ack()


# ------------------------------------------------------------------
# on_update -- order update from BPP
# ------------------------------------------------------------------


@router.post("/on_update")
async def on_update(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    """Receive an order update from a BPP (e.g. partial fulfillment changes)."""
    body = await request.json()

    try:
        resp = BecknResponse.model_validate(body)
    except Exception:
        logger.exception("Invalid on_update payload")
        return _nack("Invalid payload")

    txn_id = resp.context.transaction_id
    logger.info("on_update received txn=%s", txn_id)

    order_data = resp.message.get("order", {}) if resp.message else {}

    result = await db.execute(
        select(BuyerOrder).where(BuyerOrder.beckn_transaction_id == txn_id)
    )
    order = result.scalar_one_or_none()

    if not order:
        logger.warning("on_update: no order for txn=%s", txn_id)
        return _nack("Order not found")

    # Apply updates
    if order_data.get("items"):
        order.items = order_data["items"]
    if order_data.get("quote"):
        order.quote = order_data["quote"]
    if order_data.get("fulfillments"):
        order.fulfillment = order_data["fulfillments"]

    await db.flush()

    return _ack()
