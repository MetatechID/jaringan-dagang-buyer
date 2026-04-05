"""BecknSender -- builds and sends signed Beckn protocol requests.

The BAP sends:
  - search -> Gateway (which multicasts to BPPs)
  - select, init, confirm, status, track, cancel -> directly to BPP

All sends are fire-and-forget. The BPP/Gateway responds synchronously with
an ACK/NACK, and the actual response comes later via async callbacks
(on_search, on_select, etc.).
"""

import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from nacl.signing import SigningKey

from python.context import BecknAction, BecknCity, BecknContext, BecknCountry, BecknLocation
from python.message import AckResponse, BecknRequest
from python.signer import BecknSigner

from app.config import settings

logger = logging.getLogger(__name__)


class BecknSender:
    """Builds and sends signed Beckn requests from the BAP."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=settings.request_timeout_seconds)
        self._signer: BecknSigner | None = None

        # Initialize signer if key is configured
        if settings.signing_key_base64:
            key_bytes = base64.b64decode(settings.signing_key_base64)
            signing_key = SigningKey(key_bytes)
            self._signer = BecknSigner(
                signing_key=signing_key,
                subscriber_id=settings.subscriber_id,
                unique_key_id=settings.unique_key_id,
            )

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    def _build_context(
        self,
        action: BecknAction,
        transaction_id: str,
        *,
        bpp_id: str | None = None,
        bpp_uri: str | None = None,
        domain: str | None = None,
        city_code: str | None = None,
        country_code: str | None = None,
        ttl: str | None = None,
    ) -> BecknContext:
        """Build a BecknContext for an outgoing request."""
        return BecknContext(
            domain=domain or settings.domain,
            action=action,
            core_version=settings.core_version,
            bap_id=settings.subscriber_id,
            bap_uri=settings.subscriber_url,
            bpp_id=bpp_id,
            bpp_uri=bpp_uri,
            transaction_id=transaction_id,
            message_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc),
            ttl=ttl or "PT30S",
            location=BecknLocation(
                city=BecknCity(code=city_code or settings.city_code),
                country=BecknCountry(code=country_code or settings.country_code),
            ),
        )

    async def _send(self, url: str, request: BecknRequest) -> AckResponse:
        """Serialize, sign, and POST a Beckn request. Returns the ACK."""
        body = request.model_dump_json(exclude_none=True).encode()

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self._signer:
            auth_header = self._signer.sign(body)
            headers["Authorization"] = auth_header

        logger.info(
            "Sending %s to %s (txn=%s, msg=%s)",
            request.context.action.value,
            url,
            request.context.transaction_id,
            request.context.message_id,
        )

        response = await self._client.post(url, content=body, headers=headers)
        response.raise_for_status()

        ack = AckResponse.model_validate(response.json())
        logger.info(
            "Received %s for %s (txn=%s)",
            ack.ack_status,
            request.context.action.value,
            request.context.transaction_id,
        )
        return ack

    # ------------------------------------------------------------------
    # Beckn actions
    # ------------------------------------------------------------------

    async def send_search(
        self,
        transaction_id: str,
        intent: dict[str, Any],
        *,
        domain: str | None = None,
        city_code: str | None = None,
    ) -> AckResponse:
        """Send a search request to the Gateway.

        The Gateway multicasts the search to all registered BPPs. Results
        arrive asynchronously via on_search callbacks.

        Args:
            transaction_id: Transaction ID for this search session.
            intent: The search intent (query, category, fulfillment filters).
            domain: Override the default Beckn domain.
            city_code: Override the default city code.
        """
        context = self._build_context(
            BecknAction.SEARCH,
            transaction_id,
            domain=domain,
            city_code=city_code,
            ttl=f"PT{settings.search_ttl_seconds}S",
        )
        request = BecknRequest(
            context=context,
            message={"intent": intent},
        )
        gateway_search_url = f"{settings.gateway_url}/search"
        return await self._send(gateway_search_url, request)

    async def send_select(
        self,
        transaction_id: str,
        bpp_id: str,
        bpp_uri: str,
        order: dict[str, Any],
    ) -> AckResponse:
        """Send a select request to a specific BPP.

        Asks the BPP to quote prices for the selected items. The quote
        arrives via on_select callback.

        Args:
            transaction_id: Beckn transaction ID (from search session).
            bpp_id: BPP subscriber ID.
            bpp_uri: BPP subscriber URL.
            order: Order object with provider and items to get a quote for.
        """
        context = self._build_context(
            BecknAction.SELECT,
            transaction_id,
            bpp_id=bpp_id,
            bpp_uri=bpp_uri,
        )
        request = BecknRequest(
            context=context,
            message={"order": order},
        )
        return await self._send(f"{bpp_uri}/select", request)

    async def send_init(
        self,
        transaction_id: str,
        bpp_id: str,
        bpp_uri: str,
        order: dict[str, Any],
    ) -> AckResponse:
        """Send an init request to a specific BPP.

        Provides billing and shipping details. BPP responds via on_init
        with finalized payment terms and fulfillment details.

        Args:
            transaction_id: Beckn transaction ID.
            bpp_id: BPP subscriber ID.
            bpp_uri: BPP subscriber URL.
            order: Order draft with billing, shipping, and selected items.
        """
        context = self._build_context(
            BecknAction.INIT,
            transaction_id,
            bpp_id=bpp_id,
            bpp_uri=bpp_uri,
        )
        request = BecknRequest(
            context=context,
            message={"order": order},
        )
        return await self._send(f"{bpp_uri}/init", request)

    async def send_confirm(
        self,
        transaction_id: str,
        bpp_id: str,
        bpp_uri: str,
        order: dict[str, Any],
    ) -> AckResponse:
        """Send a confirm request to a specific BPP.

        Finalizes the order. BPP responds via on_confirm with the
        confirmed order including a BPP-assigned order ID.

        Args:
            transaction_id: Beckn transaction ID.
            bpp_id: BPP subscriber ID.
            bpp_uri: BPP subscriber URL.
            order: Complete order with payment proof.
        """
        context = self._build_context(
            BecknAction.CONFIRM,
            transaction_id,
            bpp_id=bpp_id,
            bpp_uri=bpp_uri,
        )
        request = BecknRequest(
            context=context,
            message={"order": order},
        )
        return await self._send(f"{bpp_uri}/confirm", request)

    async def send_status(
        self,
        transaction_id: str,
        bpp_id: str,
        bpp_uri: str,
        order_id: str,
    ) -> AckResponse:
        """Send a status request to a specific BPP.

        Polls for the current order status. BPP responds via on_status.

        Args:
            transaction_id: Beckn transaction ID.
            bpp_id: BPP subscriber ID.
            bpp_uri: BPP subscriber URL.
            order_id: The BPP-assigned order ID.
        """
        context = self._build_context(
            BecknAction.STATUS,
            transaction_id,
            bpp_id=bpp_id,
            bpp_uri=bpp_uri,
        )
        request = BecknRequest(
            context=context,
            message={"order_id": order_id},
        )
        return await self._send(f"{bpp_uri}/status", request)

    async def send_track(
        self,
        transaction_id: str,
        bpp_id: str,
        bpp_uri: str,
        order_id: str,
    ) -> AckResponse:
        """Send a track request to a specific BPP.

        Requests real-time tracking info. BPP responds via on_track.

        Args:
            transaction_id: Beckn transaction ID.
            bpp_id: BPP subscriber ID.
            bpp_uri: BPP subscriber URL.
            order_id: The BPP-assigned order ID.
        """
        context = self._build_context(
            BecknAction.TRACK,
            transaction_id,
            bpp_id=bpp_id,
            bpp_uri=bpp_uri,
        )
        request = BecknRequest(
            context=context,
            message={
                "order_id": order_id,
                "callback_url": f"{settings.subscriber_url}/beckn/on_track",
            },
        )
        return await self._send(f"{bpp_uri}/track", request)

    async def send_cancel(
        self,
        transaction_id: str,
        bpp_id: str,
        bpp_uri: str,
        order_id: str,
        reason: str = "",
    ) -> AckResponse:
        """Send a cancel request to a specific BPP.

        Requests cancellation of an order. BPP responds via on_cancel.

        Args:
            transaction_id: Beckn transaction ID.
            bpp_id: BPP subscriber ID.
            bpp_uri: BPP subscriber URL.
            order_id: The BPP-assigned order ID.
            reason: Cancellation reason code or description.
        """
        context = self._build_context(
            BecknAction.CANCEL,
            transaction_id,
            bpp_id=bpp_id,
            bpp_uri=bpp_uri,
        )
        message: dict[str, Any] = {"order_id": order_id}
        if reason:
            message["cancellation_reason_id"] = reason
        request = BecknRequest(
            context=context,
            message=message,
        )
        return await self._send(f"{bpp_uri}/cancel", request)
