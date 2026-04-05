"""Cart model.

Represents a buyer's cart tied to a single BPP. In Beckn, you cannot mix
items from different BPPs in one transaction -- each cart maps to exactly
one provider on one BPP.

Lifecycle:
    1. POST /api/cart/select creates a cart (status=active)
    2. BAP sends Beckn select to the specific BPP
    3. BPP responds via on_select with a quote -> stored here
    4. POST /api/cart/{id}/init sends Beckn init -> draft order details stored
    5. Cart transitions to checked_out after confirm
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CartStatus(str, enum.Enum):
    """Status of a cart."""

    ACTIVE = "active"
    CHECKED_OUT = "checked_out"
    EXPIRED = "expired"


class Cart(Base):
    """A buyer's cart for items from a single BPP/provider."""

    __tablename__ = "carts"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    session_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
        comment="SearchSession that originated this cart",
    )
    transaction_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        comment="Beckn transaction_id carried from the search session",
    )
    bpp_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Subscriber ID of the BPP",
    )
    bpp_uri: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Subscriber URL of the BPP (for direct communication)",
    )
    provider_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Provider ID within the BPP",
    )
    items: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Selected items with quantities [{id, quantity, ...}]",
    )
    quote: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Quote returned by BPP via on_select",
    )
    order_draft: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Draft order details from on_init (billing, shipping, payment terms)",
    )
    status: Mapped[CartStatus] = mapped_column(
        Enum(CartStatus, name="cart_status"),
        nullable=False,
        default=CartStatus.ACTIVE,
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
        return f"<Cart id={self.id} bpp={self.bpp_id} provider={self.provider_id} status={self.status}>"
