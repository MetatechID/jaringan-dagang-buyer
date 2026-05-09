"""FastAPI dependencies: DB session, current profile, admin guard."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.firebase import verify_id_token
from config import settings
from database import get_db
from models.profile import BeliAmanProfile


async def _get_or_create_profile(
    db: AsyncSession, *, google_sub: str, email: str, display_name: str | None, photo_url: str | None
) -> BeliAmanProfile:
    """Find a profile by Google sub or create one on first sign-in."""
    result = await db.execute(
        select(BeliAmanProfile).where(BeliAmanProfile.google_sub == google_sub)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = BeliAmanProfile(
            google_sub=google_sub,
            email=email,
            display_name=display_name,
            photo_url=photo_url,
            last_seen_at=datetime.now(timezone.utc),
        )
        db.add(profile)
        await db.flush()
    else:
        profile.last_seen_at = datetime.now(timezone.utc)
        # Refresh stale display fields (e.g. user changed their Google photo)
        if email and profile.email != email:
            profile.email = email
        if display_name and profile.display_name != display_name:
            profile.display_name = display_name
        if photo_url and profile.photo_url != photo_url:
            profile.photo_url = photo_url
    return profile


async def get_current_profile(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> BeliAmanProfile:
    """Verify a Firebase ID token from the Authorization header and resolve to a profile."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header (expected: Bearer <id_token>)",
        )

    id_token = authorization.split(" ", 1)[1].strip()
    try:
        decoded = verify_id_token(id_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        ) from e

    return await _get_or_create_profile(
        db,
        google_sub=decoded["sub"],
        email=decoded.get("email", ""),
        display_name=decoded.get("name"),
        photo_url=decoded.get("picture"),
    )


def require_admin_token(x_admin_token: str | None = Header(None)) -> None:
    """Guard for admin / internal-mock endpoints. 403 if header doesn't match."""
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing X-Admin-Token header",
        )
