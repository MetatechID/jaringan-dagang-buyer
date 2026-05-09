"""BeliAmanProfile — the consumer's identity, materialized from a Firebase Google sign-in."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class BeliAmanProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A buyer's profile, keyed by Google `sub` claim from Firebase."""

    __tablename__ = "profiles"

    google_sub: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone_e164: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
