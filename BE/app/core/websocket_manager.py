import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Maps each role name to the set of event types it should receive.
# "admin" receives everything — enforced in broadcast(), not here.
ROLE_EVENT_MAP: dict[str, set[str]] = {
    "Fleet Manager": {
        "vehicle_status_changed",
        "maintenance_opened",
        "maintenance_closed",
        "trip_status_changed",
    },
    "Dispatcher": {
        "trip_status_changed",
        "trip_created",
        "vehicle_status_changed",
        "driver_status_changed",
    },
    "Safety Officer": {
        "driver_status_changed",
        "license_expiring_soon",
        "license_expired",
        "safety_score_low",
        "driver_suspended",
        "maintenance_opened",
    },
    "Financial Analyst": {
        "expense_logged",
        "fuel_logged",
        "large_expense_alert",
        "trip_status_changed",
    },
}

# Threshold constants
SAFETY_SCORE_THRESHOLD = 70
LARGE_EXPENSE_THRESHOLD = 10_000
LICENSE_EXPIRY_WARNING_DAYS = 30


class ConnectionManager:
    """
    Manages active WebSocket connections keyed by role.

    Structure:
        _connections: { role_name: { websocket, websocket, ... } }

    A single user can have multiple open connections (e.g. two browser tabs).
    Each connection stores its role on the WebSocket's `state` attribute so
    we never need to look it up again.
    """

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, role: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[role].add(websocket)
        logger.info("WS connect: role=%s total_for_role=%d", role, len(self._connections[role]))

    async def disconnect(self, websocket: WebSocket, role: str) -> None:
        async with self._lock:
            self._connections[role].discard(websocket)
        logger.info("WS disconnect: role=%s total_for_role=%d", role, len(self._connections[role]))

    async def broadcast(self, event_type: str, payload: dict[str, Any]) -> None:
        """
        Send an event to every connection whose role is subscribed to that event type.
        Admin always receives every event.
        Dead connections are silently removed.
        """

        message = json.dumps({"event": event_type, "data": payload})
        dead: list[tuple[str, WebSocket]] = []

        for role, connections in self._connections.items():
            # admin gets everything; others check ROLE_EVENT_MAP
            if role != "Admin" and event_type not in ROLE_EVENT_MAP.get(role, set()):
                continue

            for ws in connections:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append((role, ws))

        # clean up dead connections outside the iteration
        async with self._lock:
            for role, ws in dead:
                self._connections[role].discard(ws)


# Single shared instance — import this everywhere
manager = ConnectionManager()


# def broadcast_safe(event_type: str, payload: dict[str, Any]) -> None:
#     """
#     Fire-and-forget broadcast that silently degrades when no event loop is
#     running (e.g. during synchronous tests).
#     """
#     try:
#         loop = asyncio.get_running_loop()
#         loop.create_task(manager.broadcast(event_type, payload))
#     except RuntimeError:
#         # No running event loop — tests or script context. Safe to ignore.
#         pass

# def broadcast_safe(event_type: str, payload: dict[str, Any]) -> None:
#     """
#     Fire-and-forget broadcast that works from both sync and async contexts.
#     Sync routes run in a threadpool, so we can't use get_running_loop() —
#     instead we grab the main loop that FastAPI is running on.
#     """
#     try:
#         loop = asyncio.get_event_loop()
#         print(f"[broadcast_safe] event={event_type} loop_running={loop.is_running()}")  # ← add this
#         if loop.is_running():
#             asyncio.run_coroutine_threadsafe(
#                 manager.broadcast(event_type, payload), loop
#             )
#         else:
#             loop.run_until_complete(manager.broadcast(event_type, payload))
#     except Exception as e:
#         logger.warning("broadcast_safe failed: %s", e)

# Module-level variable to hold the main event loop
_main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _main_loop
    _main_loop = loop


def broadcast_safe(event_type: str, payload: dict[str, Any]) -> None:
    global _main_loop
    if _main_loop is None or not _main_loop.is_running():
        logger.warning("broadcast_safe: no running event loop, dropping event %s", event_type)
        return
    asyncio.run_coroutine_threadsafe(
        manager.broadcast(event_type, payload), _main_loop
    )
