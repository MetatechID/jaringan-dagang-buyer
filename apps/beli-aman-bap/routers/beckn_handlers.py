"""Beckn on_* handler stubs — wired one phase at a time.

Each handler takes (context: dict, message: dict, db: AsyncSession)
and returns the response body to ACK back to the BPP (usually just ACK).

Phase 2 plugs handle_on_search to upsert the catalog mirror.
Phase 3 plugs handle_on_select / handle_on_init / handle_on_confirm.
Phase 4 plugs handle_on_status.
Phase 5 plugs handle_on_update.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# Phase 1: no handlers wired yet — endpoints just ACK + log.
# Functions get added below as later phases ship.
