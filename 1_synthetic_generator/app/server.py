from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import PORT
from .simulator import Simulator


def create_app() -> tuple[FastAPI, Simulator]:
    simulator = Simulator()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = asyncio.create_task(simulator.run())
        try:
            yield
        finally:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    app = FastAPI(
        title="Cura Health Bedside Telemetry Generator",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.simulator = simulator
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
            "service": "synthetic_generator",
            "port": PORT,
            "tick": simulator.snapshot()["tick"],
        }

    @app.get("/api/state")
    async def state() -> dict[str, Any]:
        return simulator.snapshot()

    @app.post("/api/control/artifact")
    async def force_artifact() -> dict[str, Any]:
        simulator.request("artifact")
        return {"ok": True, "message": "Room-101 probe disconnect queued"}

    @app.post("/api/control/shock")
    async def accelerate_shock() -> dict[str, Any]:
        simulator.request("shock")
        return {"ok": True, "message": "Room-101 decompensation accelerated"}

    @app.post("/api/control/reset")
    async def reset() -> dict[str, Any]:
        simulator.request("reset")
        return {"ok": True, "message": "Baselines restored"}

    return app, simulator
