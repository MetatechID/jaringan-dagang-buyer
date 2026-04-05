"""BuyerOrder model.

Represents an order from the buyer's perspective, tracking it through the
full Beckn lifecycle: created -> confirmed -> in_progress -> completed/cancelled.

Created when the buyer confirms a cart (POST /api/checkout/{cart_id}/confirm).
Updated as on_confirm, on_status, on_track, on_cancel, on_update callbacks arrive.
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OrderStatus(str, enum.Enum):
    """Status of a buyer order, mirroring the Beckn order lifecycle."""

    CREATED = "created"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BuyerOrder(Base):
    """A buyer's order tracked through the Beckn lifecycle."""

    __tablename__ = "buyer_orders"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    cart_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("carts.id"),
        nullable=False,
        index=True,
        comment="Cart that was checked out to create this order",
    )
    beckn_order_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        comment="Order ID assigned by the BPP (from on_confirm)",
    )
    beckn_transaction_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
        comment="Beckn transaction_id for the full lifecycle",
    )
    bpp_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="BPP subscriber ID",
    )
    bpp_uri: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="BPP subscriber URL",
    )
    provider_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Provider ID within the BPP",
    )
    items: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Ordered items",
    )
    billing: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Billing details",
    )
    shipping: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Shipping/delivery details",
    )
    quote: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Final quote",
    )
    payment: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Payment details from BPP",
    )
    fulfillment: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Fulfillment details including tracking",
    )
    tracking: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Tracking information from on_track",
    )
    cancellation: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Cancellation details if order was cancelled",
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status"),
        nullable=False,
        default=OrderStatus.CREATED,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<BuyerOrder id={self.id} beckn_order={self.beckn_order_id} status={self.status}>"
