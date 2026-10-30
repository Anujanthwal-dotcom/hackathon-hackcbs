from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager, suppress
from datetime import timedelta
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .artifact import ArtifactFinding, detect_probe_artifact
from .config import ALERT_NEWS2_THRESHOLD, CENTRAL_URL, PORT
from .models import AlertPacket, EnrichedTelemetry, TelemetryPacket
from .news2 import News2Result, compute_news2, map_value
from .sbar import SbarSynthesizer
from .state import BedState, EdgeState, utc_iso, utc_now

log = logging.getLogger("curahealth.edge")


class EdgeRuntime:
    def __init__(self) -> None:
        self.state = EdgeState()
        self.synthesizer = SbarSynthesizer()
        self.http = httpx.AsyncClient(timeout=2.5)
        self._locks = {bed_id: asyncio.Lock() for bed_id in self.state.beds}
        self._tasks: set[asyncio.Task[Any]] = set()
        self._telemetry_error_logged = False

    async def close(self) -> None:
        for task in list(self._tasks):
            task.cancel()
        for task in list(self._tasks):
            with suppress(asyncio.CancelledError):
                await task
        await self.http.aclose()

    async def process_telemetry(self, packet: TelemetryPacket) -> EnrichedTelemetry:
        bed = self.state.beds.get(packet.bed_id)
        if bed is None:
            raise HTTPException(status_code=404, detail=f"Unknown bed {packet.bed_id}")
        lock = self._locks[packet.bed_id]
        async with lock:
            return await self._process_locked(bed, packet)

    async def _process_locked(
        self, bed: BedState, packet: TelemetryPacket
    ) -> EnrichedTelemetry:
        now = utc_now()
        bed.history.append((now, packet))
        while bed.history and (now - bed.history[0][0]).total_seconds() > 120:
            bed.history.popleft()

        news2 = compute_news2(packet)
        finding = detect_probe_artifact(list(bed.history))
        was_suppressed = bed.filter_status == "ARTIFACT_SUPPRESSED"

        if finding is not None:
            bed.artifact_until = now + timedelta(seconds=15)
            bed.artifact_reason = finding.reason
            if not was_suppressed or bed.last_artifact_log is None or (
                now - bed.last_artifact_log
            ).total_seconds() > 20:
                bed.last_artifact_log = now
                self.state.append_log(
                    "artifact",
                    f"ARTIFACT SUPPRESSED  {bed.bed_id}  {finding.reason}",
                )
                self.state.append_log(
                    "artifact",
                    f"NO UPLINK  {bed.bed_id} would-be NEWS2 {news2.total} withheld from central alarm bus.",
                )

        if packet.spo2 >= 95:
            bed.artifact_until = None
            bed.artifact_reason = None
        elif bed.artifact_until is not None and now >= bed.artifact_until:
            bed.artifact_until = None
            bed.artifact_reason = None

        suppressed = bed.artifact_until is not None and now < bed.artifact_until
        filter_status = "ARTIFACT_SUPPRESSED" if suppressed else "PASS"
        sensor_status = "PROBE_DISCONNECTED" if suppressed else "OK"

        enriched = EnrichedTelemetry(
            **packet.model_dump(),
            map=map_value(packet),
            news2_score=news2.total,
            news2_components=news2.components,
            filter_status=filter_status,
            sensor_status=sensor_status,
            patient_context=bed.patient_context,
            received_at=utc_iso(now),
        )

        bed.latest = enriched
        bed.news2 = news2
        bed.filter_status = filter_status
        bed.sensor_status = sensor_status
        self.state.last_ingest_at = now
        self.state.telemetry_count += 1

        await self._forward_telemetry(enriched)
        self._update_alert_latch(bed, packet, news2, suppressed, now)
        return enriched

    def _update_alert_latch(
        self,
        bed: BedState,
        packet: TelemetryPacket,
        news2: News2Result,
        suppressed: bool,
        now: Any,
    ) -> None:
        if suppressed:
            return

        if (
            news2.total >= ALERT_NEWS2_THRESHOLD
            and not bed.alert_active
            and not bed.alert_pending
        ):
            bed.alert_active = True
            bed.alert_pending = True
            bed.alert_score = news2.total
            bed.alert_id = f"alt_{bed.bed_id.replace('Bed-', '')}_{uuid.uuid4().hex[:8]}"
            bed.sbar = None
            bed.sbar_source = None
            self.state.append_log(
                "alert",
                f"THRESHOLD CROSSED  {bed.bed_id} NEWS2 {news2.total} >= "
                f"{ALERT_NEWS2_THRESHOLD}; synthesizing SBAR.",
            )
            task = asyncio.create_task(
                self._raise_alert(bed, packet.model_copy(deep=True), news2, self.state.epoch)
            )
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)
            return

        # Re-arm only after sustained clinical recovery, preventing alarm spam.
        if bed.alert_active and not bed.alert_pending:
            if news2.total < 5 and packet.spo2 >= 95:
                if bed.stable_since is None:
                    bed.stable_since = now
                elif (now - bed.stable_since).total_seconds() > 20:
                    bed.alert_active = False
                    bed.stable_since = None
                    bed.sbar = None
                    bed.sbar_source = None
                    self.state.append_log(
                        "info", f"{bed.bed_id} sustained recovery; alert latch re-armed."
                    )
            else:
                bed.stable_since = None

    async def _raise_alert(
        self,
        bed: BedState,
        packet: TelemetryPacket,
        news2: News2Result,
        epoch: int,
    ) -> None:
        alert_id = bed.alert_id or f"alt_{uuid.uuid4().hex[:8]}"
        self.state.append_log(
            "llm",
            f"SBAR SYNTHESIS  {bed.bed_id} using {self.synthesizer.provider_label}.",
        )
        sbar, source = await self.synthesizer.synthesize(bed, packet, news2)
        if self.state.epoch != epoch:
            return

        bed.sbar = sbar
        bed.sbar_source = source
        bed.alert_pending = False
        bed.alert_score = news2.total
        self.state.last_llm_source = source
        self.state.append_log(
            "llm", f"SBAR READY  {bed.bed_id} source={source}."
        )

        alert = AlertPacket(
            alert_id=alert_id,
            bed_id=packet.bed_id,
            patient_name=packet.patient_name,
            severity=news2.severity,
            news2_score=news2.total,
            sbar=sbar,
            timestamp=utc_iso(),
            patient_context=bed.patient_context,
            news2_components=news2.components,
            sbar_source=source,
            status="PENDING_VERIFICATION",
        )
        payload = alert.model_dump(mode="json")
        url = f"{CENTRAL_URL}/api/edge/alert"
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await self.http.post(url, json=payload)
                if response.status_code >= 300:
                    raise RuntimeError(f"HTTP {response.status_code}: {response.text[:160]}")
                self.state.alerts_sent += 1
                self.state.uplink_ok = True
                self.state.uplink_last_ok = utc_now()
                self.state.uplink_last_error = None
                self.state.append_log(
                    "uplink",
                    f"UPLINK OK  {alert_id} -> {url}",
                )
                return
            except Exception as exc:
                last_error = exc
                if attempt < 2:
                    await asyncio.sleep(1.0 + attempt)
        self.state.uplink_ok = False
        self.state.uplink_last_error = str(last_error)
        self.state.append_log(
            "error", f"UPLINK FAILED  {alert_id}: {last_error}"
        )

    async def _forward_telemetry(self, enriched: EnrichedTelemetry) -> None:
        url = f"{CENTRAL_URL}/api/edge/telemetry"
        try:
            response = await self.http.post(url, json=enriched.model_dump(mode="json"))
            if response.status_code >= 300:
                raise RuntimeError(f"HTTP {response.status_code}")
            if self._telemetry_error_logged:
                self.state.append_log("uplink", "Central telemetry stream restored.")
                self._telemetry_error_logged = False
            self.state.uplink_ok = True
        except Exception as exc:
            if not self._telemetry_error_logged:
                self._telemetry_error_logged = True
                self.state.uplink_last_error = str(exc)
                self.state.append_log(
                    "error", f"Central telemetry stream unavailable: {exc}"
                )

    def reset(self) -> None:
        self.state.reset()
        self._telemetry_error_logged = False


def create_app() -> tuple[FastAPI, EdgeRuntime]:
    runtime = EdgeRuntime()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logging.info("Edge agent online on :%s -> %s", PORT, CENTRAL_URL)
        try:
            yield
        finally:
            await runtime.close()

    app = FastAPI(
        title="Cura Health In-Room Edge Agent",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.runtime = runtime
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    async def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "service": "edge_agent",
            "port": PORT,
            "ingestion_active": runtime.state.ingestion_active(),
            "llm_enabled": runtime.synthesizer.enabled,
        }

    @app.get("/api/state")
    async def state() -> dict[str, Any]:
        return runtime.state.snapshot()

    @app.post("/api/telemetry")
    async def ingest(packet: TelemetryPacket) -> dict[str, Any]:
        enriched = await runtime.process_telemetry(packet)
        bed = runtime.state.beds[packet.bed_id]
        return {
            "ok": True,
            "bed_id": packet.bed_id,
            "news2_score": enriched.news2_score,
            "filter_status": enriched.filter_status,
            "alert_active": bed.alert_active,
            "alert_pending": bed.alert_pending,
        }

    @app.post("/api/reset")
    async def reset() -> dict[str, Any]:
        runtime.reset()
        return {"ok": True, "message": "Edge buffers, latches, and SBAR preview cleared."}

    return app, runtime
