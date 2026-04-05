"""SearchSession model.

Tracks a buyer's search request through the Beckn network. The session
accumulates catalog results from multiple BPPs as on_search callbacks arrive.

Lifecycle:
    1. POST /api/search creates a session (status=pending)
    2. BAP sends Beckn search to Gateway
    3. Gateway multicasts to BPPs
    4. BPPs respond via on_search callbacks -> results accumulate
    5. Frontend polls GET /api/search/{session_id}/results
    6. Session expires after TTL (status=expired)
"""

import enum
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SearchStatus(str, enum.Enum):
    """Status of a search session."""

    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"


class SearchSession(Base):
    """A search session that collects results from multiple BPPs."""

    __tablename__ = "search_sessions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    transaction_id: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        comment="Beckn transaction_id, reused throughout the order lifecycle",
    )
    query: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Free-text search query from the buyer",
    )
    category: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Category filter for the search",
    )
    domain: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="nic2004:52110",
        comment="Beckn domain for this search",
    )
    city_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="ID:JKT",
        comment="City code for location context",
    )
    status: Mapped[SearchStatus] = mapped_column(
        Enum(SearchStatus, name="search_status"),
        nullable=False,
        default=SearchStatus.PENDING,
    )
    results: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        default=None,
        comment="Accumulated catalog results from on_search callbacks, keyed by bpp_id",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc) + timedelta(seconds=30),
    )

    def __repr__(self) -> str:
        return f"<SearchSession id={self.id} status={self.status} query={self.query!r}>"
