"""Search API -- lets the storefront search for products across the Beckn network.

Flow:
    1. Frontend POSTs /api/search with a query, category, city
    2. BAP creates a SearchSession and sends Beckn search to the Gateway
    3. Frontend polls GET /api/search/{session_id}/results
    4. Results accumulate as on_search callbacks arrive from multiple BPPs
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.beckn.sender import BecknSender
from app.config import settings
from app.database import get_db
from app.models.search_session import SearchSession, SearchStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])


# ------------------------------------------------------------------
# Request / Response schemas
# ------------------------------------------------------------------


class SearchRequest(BaseModel):
    """Request body for initiating a search."""

    query: str | None = Field(default=None, description="Free-text search query")
    category: str | None = Field(default=None, description="Category filter")
    city: str | None = Field(default=None, description="City code override (e.g. 'ID:JKT')")


class SearchResponse(BaseModel):
    """Response after initiating a search."""

    session_id: str
    transaction_id: str
    status: str
    message: str


class SearchResultsResponse(BaseModel):
    """Response with accumulated search results."""

    session_id: str
    status: str
    result_count: int
    results: dict[str, Any]


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


@router.post("", response_model=SearchResponse)
async def create_search(
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
) -> SearchResponse:
    """Initiate a product search across the Beckn network.

    Creates a SearchSession, builds a Beckn search intent, and sends it
    to the Gateway. The Gateway multicasts to all registered BPPs.

    Returns a session_id that the frontend uses to poll for results.
    """
    # Create the search session
    session = SearchSession(
        query=body.query,
        category=body.category,
        domain=settings.domain,
        city_code=body.city or settings.city_code,
        status=SearchStatus.PENDING,
        results={},
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.search_ttl_seconds),
    )
    db.add(session)
    await db.flush()

    # Build Beckn search intent
    intent: dict[str, Any] = {}
    if body.query:
        intent["descriptor"] = {"name": body.query}
    if body.category:
        intent["category"] = {"descriptor": {"code": body.category}}
    # Add fulfillment location context
    intent["fulfillment"] = {
        "type": "Delivery",
        "end": {
            "location": {
                "gps": "",  # Frontend would supply GPS in a real implementation
                "area_code": "",
            },
        },
    }

    # Send search to Gateway (fire-and-forget)
    sender = BecknSender()
    try:
        ack = await sender.send_search(
            transaction_id=session.transaction_id,
            intent=intent,
            city_code=body.city,
        )
        ack_status = ack.ack_status
    except Exception:
        logger.exception("Failed to send search to Gateway")
        ack_status = "SEND_FAILED"
    finally:
        await sender.close()

    return SearchResponse(
        session_id=session.id,
        transaction_id=session.transaction_id,
        status=session.status.value,
        message=f"Search sent to Gateway (ack={ack_status}). Poll for results.",
    )


@router.get("/{session_id}/results", response_model=SearchResultsResponse)
async def get_search_results(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> SearchResultsResponse:
    """Poll for search results.

    Returns accumulated catalog results from on_search callbacks. The
    frontend should poll this endpoint until status changes to 'completed'
    or 'expired', or until enough results have been collected.
    """
    result = await db.execute(
        select(SearchSession).where(SearchSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Search session not found")

    # Check if the session has expired
    if session.expires_at < datetime.now(timezone.utc):
        if session.status != SearchStatus.EXPIRED:
            session.status = SearchStatus.EXPIRED
            await db.flush()

    results = session.results or {}

    return SearchResultsResponse(
        session_id=session.id,
        status=session.status.value,
        result_count=len(results),
        results=results,
    )
