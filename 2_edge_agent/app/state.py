from __future__ import annotations

import json
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from .config import (
    ALERT_NEWS2_THRESHOLD,
    CENTRAL_URL,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GENERATOR_URL,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    PATIENTS_FILE,
)
from .models import EnrichedTelemetry, News2Component, Sbar, TelemetryPacket
from .news2 import News2Result


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_iso(value: datetime | None = None) -> str:
    return (value or utc_now()).isoformat(timespec="seconds").replace("+00:00", "Z")


@dataclass
class LogEntry:
    seq: int
    ts: str
    kind: str
    text: str


@dataclass
class BedState:
    bed_id: str
    patient_name: str
    patient_context: str
    history: deque[tuple[datetime, TelemetryPacket]] = field(default_factory=lambda: deque(maxlen=120))
    latest: EnrichedTelemetry | None = None
    news2: News2Result | None = None
    artifact_until: datetime | None = None
    artifact_reason: str | None = None
    filter_status: str = "PASS"
    sensor_status: str = "OK"
    alert_active: bool = False
    alert_pending: bool = False
    alert_id: str | None = None
    sbar: Sbar | None = None
    sbar_source: str | None = None
    alert_score: int = 0
    stable_since: datetime | None = None
    last_artifact_log: datetime | None = None

    def reset(self) -> None:
        self.history.clear()
        self.latest = None
        self.news2 = None
        self.artifact_until = None
        self.artifact_reason = None
        self.filter_status = "PASS"
        self.sensor_status = "OK"
        self.alert_active = False
        self.alert_pending = False
        self.alert_id = None
        self.sbar = None
        self.sbar_source = None
        self.alert_score = 0
        self.stable_since = None
        self.last_artifact_log = None

    def recent_trend(self, limit: int = 36) -> list[dict[str, Any]]:
        items = list(self.history)[-limit:]
        return [
            {
                "t": utc_iso(ts),
                "hr": packet.heart_rate,
                "sbp": packet.systolic_bp,
                "dbp": packet.diastolic_bp,
                "rr": packet.respiratory_rate,
                "spo2": packet.spo2,
                "temp": packet.temp_c,
            }
            for ts, packet in items
        ]


class EdgeState:
    def __init__(self) -> None:
        payload = json.loads(PATIENTS_FILE.read_text())
        self.beds: dict[str, BedState] = {
            item["bed_id"]: BedState(
                bed_id=item["bed_id"],
                patient_name=item["patient_name"],
                patient_context=item["context"],
            )
            for item in payload["patients"]
        }
        self.lock = threading.RLock()
        self.logs: deque[LogEntry] = deque(maxlen=160)
        self._log_seq = 0
        self.started_at = utc_now()
        self.last_ingest_at: datetime | None = None
        self.telemetry_count = 0
        self.alerts_sent = 0
        self.uplink_ok = False
        self.uplink_last_ok: datetime | None = None
        self.uplink_last_error: str | None = None
        self.last_llm_source: str | None = None
        self.epoch = 0

    def append_log(self, kind: str, text: str) -> None:
        with self.lock:
            self._log_seq += 1
            self.logs.append(
                LogEntry(
                    seq=self._log_seq,
                    ts=datetime.now().strftime("%H:%M:%S"),
                    kind=kind,
                    text=text,
                )
            )

    def reset(self) -> None:
        with self.lock:
            self.epoch += 1
            for bed in self.beds.values():
                bed.reset()
            self.last_ingest_at = None
            self.telemetry_count = 0
            self.alerts_sent = 0
            self.uplink_ok = False
            self.uplink_last_ok = None
            self.uplink_last_error = None
            self.last_llm_source = None
            self.append_log("info", "Edge state reset; artifact buffers and alert latches cleared.")

    def ingestion_active(self) -> bool:
        with self.lock:
            if self.last_ingest_at is None:
                return False
            return utc_now() - self.last_ingest_at < timedelta(seconds=7)

    def active_artifact_bed(self) -> str | None:
        with self.lock:
            for bed in self.beds.values():
                if bed.filter_status == "ARTIFACT_SUPPRESSED":
                    return bed.bed_id
        return None

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            beds: dict[str, Any] = {}
            for bed_id, bed in self.beds.items():
                latest = bed.latest.model_dump(mode="json") if bed.latest else None
                beds[bed_id] = {
                    "bed_id": bed_id,
                    "patient_name": bed.patient_name,
                    "patient_context": bed.patient_context,
                    "telemetry": latest,
                    "news2_score": bed.latest.news2_score if bed.latest else 0,
                    "news2_components": (
                        [c.model_dump(mode="json") for c in bed.news2.components]
                        if bed.news2
                        else []
                    ),
                    "filter_status": bed.filter_status,
                    "sensor_status": bed.sensor_status,
                    "artifact_reason": bed.artifact_reason,
                    "alert_active": bed.alert_active,
                    "alert_pending": bed.alert_pending,
                    "alert_id": bed.alert_id,
                    "sbar": bed.sbar.model_dump(mode="json") if bed.sbar else None,
                    "sbar_source": bed.sbar_source,
                    "alert_score": bed.alert_score,
                    "trend": bed.recent_trend(),
                }
            artifact_bed = next(
                (b for b in self.beds.values() if b.filter_status == "ARTIFACT_SUPPRESSED"),
                None,
            )
            return {
                "beds": beds,
                "filter": {
                    "mode": "ARTIFACT_SUPPRESSED" if artifact_bed else "PASS",
                    "bed_id": artifact_bed.bed_id if artifact_bed else None,
                    "reason": artifact_bed.artifact_reason if artifact_bed else None,
                },
                "ingestion": {
                    "active": self.ingestion_active(),
                    "last_at": utc_iso(self.last_ingest_at) if self.last_ingest_at else None,
                    "source": f"{GENERATOR_URL} (Port 8002)",
                    "count": self.telemetry_count,
                },
                "uplink": {
                    "url": f"{CENTRAL_URL}/api/edge/alert",
                    "ok": self.uplink_ok,
                    "last_ok": utc_iso(self.uplink_last_ok) if self.uplink_last_ok else None,
                    "last_error": self.uplink_last_error,
                    "alerts_sent": self.alerts_sent,
                },
                "llm": {
                    "enabled": bool(GEMINI_API_KEY or OPENAI_API_KEY),
                    "provider": "GEMINI" if GEMINI_API_KEY else ("OPENAI" if OPENAI_API_KEY else "LOCAL_FALLBACK"),
                    "model": GEMINI_MODEL if GEMINI_API_KEY else OPENAI_MODEL,
                    "last_source": self.last_llm_source,
                },
                "threshold": ALERT_NEWS2_THRESHOLD,
                "logs": [
                    {"seq": e.seq, "ts": e.ts, "kind": e.kind, "text": e.text}
                    for e in self.logs
                ],
                "server_time": utc_iso(),
                "epoch": self.epoch,
            }

    @staticmethod
    def component_payload(components: list[News2Component] | None) -> list[dict[str, Any]]:
        return [c.model_dump(mode="json") for c in components or []]
