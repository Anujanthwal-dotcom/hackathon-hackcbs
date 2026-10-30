from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .models import AlertPacket, ClaimRecord, DemoState, EnrichedTelemetry

log = logging.getLogger("curahealth.central")


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


class AlertNotFound(Exception):
    pass


class InvalidTransition(Exception):
    pass


class ClaimConflict(Exception):
    def __init__(self, message: str, claimed_by: str | None = None) -> None:
        super().__init__(message)
        self.claimed_by = claimed_by


@dataclass
class ClientInfo:
    role: str
    doctor_id: str | None = None
    doctor_name: str | None = None


class Hub:
    def __init__(self) -> None:
        self.beds: dict[str, EnrichedTelemetry] = {}
        self.alerts: dict[str, AlertPacket] = {}
        self.claims: dict[str, ClaimRecord] = {}
        self.clients: dict[Any, ClientInfo] = {}
        self.demo = DemoState()
        self.started_at = datetime.now(timezone.utc)
        self.lock = asyncio.Lock()

    def snapshot(self) -> dict[str, Any]:
        alerts = sorted(self.alerts.values(), key=lambda item: item.timestamp)
        return {
            "beds": {bed_id: bed.model_dump(mode="json") for bed_id, bed in self.beds.items()},
            "alerts": [alert.model_dump(mode="json") for alert in alerts],
            "claims": {
                alert_id: claim.model_dump(mode="json")
                for alert_id, claim in self.claims.items()
            },
            "demo": self.demo.model_dump(mode="json"),
            "server_time": utc_iso(),
        }

    async def add_client(self, websocket: Any, info: ClientInfo) -> None:
        self.clients[websocket] = info
        await websocket.send_json({"type": "STATE_SNAPSHOT", "data": self.snapshot()})
        log.info(
            "WS connected role=%s doctor=%s clients=%s",
            info.role,
            info.doctor_id or "-",
            len(self.clients),
        )

    def remove_client(self, websocket: Any) -> None:
        self.clients.pop(websocket, None)
        log.info("WS disconnected clients=%s", len(self.clients))

    async def broadcast(self, event: dict[str, Any]) -> None:
        dead: list[Any] = []
        for websocket in list(self.clients):
            try:
                await websocket.send_json(event)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.clients.pop(websocket, None)

    async def ingest_alert(self, alert: AlertPacket) -> AlertPacket:
        async with self.lock:
            alert = alert.model_copy(update={"status": "PENDING_VERIFICATION"})
            self.alerts[alert.alert_id] = alert
        await self.broadcast({"type": "ALERT_NEW", "data": alert.model_dump(mode="json")})
        log.info(
            "ALERT_NEW id=%s bed=%s news2=%s sbar_source=%s",
            alert.alert_id,
            alert.bed_id,
            alert.news2_score,
            alert.sbar_source,
        )
        return alert

    async def nurse_action(
        self, alert_id: str, action: str, nurse_id: str
    ) -> AlertPacket:
        async with self.lock:
            alert = self.alerts.get(alert_id)
            if alert is None:
                raise AlertNotFound(alert_id)
            if alert.status != "PENDING_VERIFICATION":
                raise InvalidTransition(
                    f"Alert {alert_id} is already {alert.status.lower()}."
                )
            status = "VERIFIED" if action == "VERIFIED" else "DISMISSED"
            updated = alert.model_copy(update={"status": status})
            self.alerts[alert_id] = updated

        event_type = "ALERT_VERIFIED" if status == "VERIFIED" else "ALERT_DISMISSED"
        await self.broadcast({"type": event_type, "data": updated.model_dump(mode="json")})
        log.info("%s id=%s nurse=%s", event_type, alert_id, nurse_id)
        return updated

    async def claim(self, alert_id: str, doctor_id: str, doctor_name: str) -> ClaimRecord:
        async with self.lock:
            alert = self.alerts.get(alert_id)
            if alert is None:
                raise AlertNotFound(alert_id)
            existing = self.claims.get(alert_id)
            if existing is not None:
                raise ClaimConflict(
                    f"Already claimed by {existing.doctor_name}.",
                    claimed_by=existing.doctor_name,
                )
            if alert.status != "VERIFIED":
                raise InvalidTransition(
                    f"Alert {alert_id} must be nurse-verified before a doctor can claim it "
                    f"(current status: {alert.status})."
                )
            claim = ClaimRecord(
                alert_id=alert_id,
                doctor_id=doctor_id,
                doctor_name=doctor_name,
                claimed_at=utc_iso(),
            )
            self.claims[alert_id] = claim
            self.alerts[alert_id] = alert.model_copy(update={"status": "CLAIMED"})

        await self.broadcast({"type": "CASE_CLAIMED", "data": claim.model_dump(mode="json")})
        log.info("CASE_CLAIMED id=%s doctor=%s (%s)", alert_id, doctor_name, doctor_id)
        return claim

    def clear(self) -> None:
        self.beds.clear()
        self.alerts.clear()
        self.claims.clear()
        self.demo = DemoState()
