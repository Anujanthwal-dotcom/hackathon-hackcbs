from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import EDGE_URL, GENERATOR_URL, PORT
from .models import AlertPacket, DemoState, DoctorClaim, EnrichedTelemetry, NurseAction
from .state import (
    AlertNotFound,
    ClaimConflict,
    ClientInfo,
    Hub,
    InvalidTransition,
    utc_iso,
)

log = logging.getLogger("curahealth.central")


def create_app() -> tuple[FastAPI, Hub]:
    hub = Hub()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.http = httpx.AsyncClient(timeout=3.0)
        log.info("Central hub online on :%s", PORT)
        try:
            yield
        finally:
            await app.state.http.aclose()

    app = FastAPI(
        title="Cura Health Central Hospital Hub",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.hub = hub
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    async def reset_services() -> list[str]:
        errors: list[str] = []
        calls = {
            "generator": f"{GENERATOR_URL}/api/control/reset",
            "edge": f"{EDGE_URL}/api/reset",
        }
        for name, url in calls.items():
            try:
                response = await app.state.http.post(url, timeout=2.5)
                if response.status_code >= 300:
                    errors.append(f"{name}: HTTP {response.status_code}")
            except Exception as exc:
                errors.append(f"{name}: {exc}")
        return errors

    async def broadcast_reset(reason: str) -> list[str]:
        errors = await reset_services()
        async with hub.lock:
            hub.clear()
        await hub.broadcast(
            {
                "type": "SYSTEM_RESET",
                "data": hub.snapshot(),
                "reason": reason,
            }
        )
        return errors

    # ------------------------------------------------------------------
    # WebSocket
    # ------------------------------------------------------------------
    @app.websocket("/ws")
    async def websocket_endpoint(
        websocket: WebSocket,
        role: str = Query(default="nurse"),
        doctor_id: str | None = Query(default=None),
        doctor_name: str | None = Query(default=None),
    ) -> None:
        await websocket.accept()
        info = ClientInfo(role=role, doctor_id=doctor_id, doctor_name=doctor_name)
        await hub.add_client(websocket, info)
        try:
            while True:
                message = await websocket.receive_text()
                if message.strip().upper() == "PING":
                    await websocket.send_json(
                        {"type": "PONG", "data": {"server_time": utc_iso()}}
                    )
        except WebSocketDisconnect:
            pass
        except Exception as exc:
            log.warning("WebSocket error: %s", exc)
        finally:
            hub.remove_client(websocket)

    # ------------------------------------------------------------------
    # Edge ingestion
    # ------------------------------------------------------------------
    @app.post("/api/edge/telemetry")
    async def ingest_telemetry(payload: EnrichedTelemetry) -> dict[str, Any]:
        hub.beds[payload.bed_id] = payload
        await hub.broadcast(
            {"type": "TELEMETRY_STREAM", "data": payload.model_dump(mode="json")}
        )
        return {"ok": True}

    @app.post("/api/edge/alert")
    async def ingest_alert(payload: AlertPacket) -> dict[str, Any]:
        alert = await hub.ingest_alert(payload)
        return {"ok": True, "alert_id": alert.alert_id, "status": alert.status}

    # ------------------------------------------------------------------
    # Human-in-the-loop actions
    # ------------------------------------------------------------------
    @app.post("/api/nurse/action")
    async def nurse_action(payload: NurseAction) -> dict[str, Any]:
        try:
            alert = await hub.nurse_action(
                payload.alert_id, payload.action, payload.nurse_id
            )
        except AlertNotFound:
            raise HTTPException(status_code=404, detail="Alert not found.")
        except InvalidTransition as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return {"ok": True, "alert": alert.model_dump(mode="json")}

    @app.post("/api/doctor/claim")
    async def doctor_claim(payload: DoctorClaim) -> dict[str, Any]:
        try:
            claim = await hub.claim(
                payload.alert_id, payload.doctor_id, payload.doctor_name
            )
        except AlertNotFound:
            raise HTTPException(status_code=404, detail="Alert not found.")
        except ClaimConflict as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        except InvalidTransition as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return {"ok": True, "claim": claim.model_dump(mode="json")}

    # ------------------------------------------------------------------
    # Orchestration
    # ------------------------------------------------------------------
    @app.post("/api/reset")
    async def reset() -> dict[str, Any]:
        errors = await broadcast_reset("operator")
        return {
            "ok": True,
            "message": "All beds, alerts, claims, and edge buffers reset.",
            "service_errors": errors,
        }

    @app.post("/api/demo/start")
    async def start_demo() -> dict[str, Any]:
        errors = await broadcast_reset("demo-start")
        try:
            response = await app.state.http.post(
                f"{GENERATOR_URL}/api/control/shock", timeout=2.5
            )
            if response.status_code >= 300:
                raise RuntimeError(f"generator HTTP {response.status_code}")
        except Exception as exc:
            hub.demo = DemoState()
            await hub.broadcast(
                {"type": "DEMO_STARTED", "data": hub.demo.model_dump(mode="json")}
            )
            raise HTTPException(
                status_code=503,
                detail=f"Could not reach the bedside generator: {exc}",
            )

        target_bed = next(iter(hub.beds.keys()), "Room-101")
        hub.demo = DemoState(
            active=True,
            started_at=utc_iso(),
            target_bed_id=target_bed,
            eta_seconds=10,
        )
        await hub.broadcast(
            {"type": "DEMO_STARTED", "data": hub.demo.model_dump(mode="json")}
        )
        log.info("DEMO_STARTED %s; reset errors=%s", target_bed, errors)
        return {
            "ok": True,
            "message": f"{target_bed} decompensation accelerated. Awaiting edge SBAR.",
            "target_bed_id": target_bed,
            "eta_seconds": 10,
        }

    # ------------------------------------------------------------------
    # Observability
    # ------------------------------------------------------------------
    @app.get("/api/health")
    async def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "service": "central_backend",
            "port": PORT,
            "clients": len(hub.clients),
            "beds": len(hub.beds),
            "alerts": len(hub.alerts),
            "claims": len(hub.claims),
            "demo": hub.demo.model_dump(mode="json"),
            "server_time": utc_iso(),
        }

    @app.get("/api/state")
    async def state() -> dict[str, Any]:
        return hub.snapshot()

    return app, hub
