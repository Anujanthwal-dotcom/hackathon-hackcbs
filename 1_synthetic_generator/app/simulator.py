from __future__ import annotations

import asyncio
import logging
import math
import queue
import random
import threading
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import httpx

from .config import EDGE_URL, TELEMETRY_INTERVAL
from .profiles import PatientProfile, load_profiles

log = logging.getLogger("curahealth.generator")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


class BedRuntime:
    def __init__(self, profile: PatientProfile) -> None:
        self.profile = profile
        self.tick = 0
        self.artifact_ticks = 0
        self.artifact_active = False
        self.shock_progress = 0.0
        self.shock_mode = "normal"
        self.vitals: dict[str, float] = dict(profile.baseline)

    def reset(self) -> None:
        self.tick = 0
        self.artifact_ticks = 0
        self.artifact_active = False
        self.shock_progress = 0.0
        self.shock_mode = "normal"
        self.vitals = dict(self.profile.baseline)

    def trigger_artifact(self) -> None:
        self.artifact_ticks = 0
        self.artifact_active = True

    def accelerate_shock(self) -> None:
        self.shock_mode = "accelerated"
        self.shock_progress = max(self.shock_progress, 0.18)

    @property
    def status(self) -> str:
        if self.artifact_active:
            return "SENSOR ARTIFACT"
        if self.profile.profile == "STABLE":
            return "STABLE"
        if self.profile.profile == "ARTIFACT_TRAP":
            return "STABLE"
        if self.shock_progress >= 0.85:
            return "CRITICAL TREND"
        if self.shock_progress >= 0.55:
            return "DETERIORATING"
        if self.shock_progress >= 0.25:
            return "DRIFTING"
        return "BASELINE"


@dataclass
class TxEntry:
    seq: int
    ts: str
    text: str
    ok: bool


class Simulator:
    def __init__(self) -> None:
        profiles = load_profiles()
        self.rng = random.Random(2026)
        self.beds: dict[str, BedRuntime] = {p.bed_id: BedRuntime(p) for p in profiles}
        self.tx_log: deque[TxEntry] = deque(maxlen=120)
        self._lock = threading.Lock()
        self._commands: queue.SimpleQueue[str] = queue.SimpleQueue()
        self._seq = 0
        self._sent = 0
        self._failed = 0
        self._last_error: str | None = None
        self._tick = 0

    # ------------------------------------------------------------------
    # Public controls (safe from Tk main thread and FastAPI event loop)
    # ------------------------------------------------------------------
    def request(self, command: str) -> None:
        self._commands.put(command)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "tick": self._tick,
                "beds": {
                    bed_id: {
                        "bed_id": bed_id,
                        "patient_name": bed.profile.patient_name,
                        "patient_context": bed.profile.patient_context,
                        "age": bed.profile.age,
                        "sex": bed.profile.sex,
                        "profile": bed.profile.profile,
                        "vitals": dict(bed.vitals),
                        "status": bed.status,
                        "shock_progress": round(bed.shock_progress, 3),
                        "artifact_active": bed.artifact_active,
                    }
                    for bed_id, bed in self.beds.items()
                },
                "tx_log": [
                    {"seq": e.seq, "ts": e.ts, "text": e.text, "ok": e.ok}
                    for e in self.tx_log
                ],
                "uplink": {
                    "edge_url": EDGE_URL,
                    "sent": self._sent,
                    "failed": self._failed,
                    "last_error": self._last_error,
                },
            }

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _drain_commands(self) -> None:
        while True:
            try:
                command = self._commands.get_nowait()
            except queue.Empty:
                return
            if command == "artifact":
                target = self.beds.get("Room-101") or self.beds.get("Bed-102") or next(iter(self.beds.values()))
                target.trigger_artifact()
                self._append_log(f"MANUAL CONTROL  Artifact forced on {target.profile.bed_id} (probe disconnect)", True)
            elif command == "shock":
                target = self.beds.get("Room-101") or self.beds.get("Bed-103") or next(iter(self.beds.values()))
                target.accelerate_shock()
                self._append_log(f"MANUAL CONTROL  Accelerated decompensation on {target.profile.bed_id}", True)
            elif command == "reset":
                for bed in self.beds.values():
                    bed.reset()
                self.rng.seed(2026)
                self._tick = 0
                self._append_log("MANUAL CONTROL  All baselines restored", True)

    def _append_log(self, text: str, ok: bool) -> None:
        self._seq += 1
        entry = TxEntry(
            seq=self._seq,
            ts=datetime.now().strftime("%H:%M:%S"),
            text=text,
            ok=ok,
        )
        with self._lock:
            self.tx_log.append(entry)

    def _vitals_for(self, bed: BedRuntime, t: float) -> dict[str, float]:
        rng = self.rng
        b = bed.profile.baseline
        profile = bed.profile.profile
        bed.tick += 1

        if profile == "STABLE":
            vitals = {
                "heart_rate": 74 + 1.4 * math.sin(t / 7.0) + rng.uniform(-0.5, 0.5),
                "systolic_bp": 121 + 2.1 * math.sin(t / 9.0 + 1.0) + rng.uniform(-0.7, 0.7),
                "diastolic_bp": 78 + 1.3 * math.sin(t / 8.0 + 2.0) + rng.uniform(-0.5, 0.5),
                "respiratory_rate": 16 + 0.5 * math.sin(t / 6.0) + rng.uniform(-0.3, 0.3),
                "spo2": 98 + 0.4 * math.sin(t / 5.0) + rng.uniform(-0.2, 0.2),
                "temp_c": 36.9 + 0.1 * math.sin(t / 12.0),
            }
        elif profile == "ARTIFACT_TRAP":
            vitals = {
                "heart_rate": 76 + 0.6 * math.sin(t / 8.0) + rng.uniform(-0.4, 0.4),
                "systolic_bp": 118 + 1.0 * math.sin(t / 10.0) + rng.uniform(-0.5, 0.5),
                "diastolic_bp": 76 + 0.8 * math.sin(t / 9.0) + rng.uniform(-0.4, 0.4),
                "respiratory_rate": 16 + 0.4 * math.sin(t / 7.0) + rng.uniform(-0.2, 0.2),
                "spo2": 98 + rng.uniform(-0.2, 0.2),
                "temp_c": 37.0 + 0.05 * math.sin(t / 11.0),
            }
        else:
            # COMPENSATED_SHOCK / Room-101
            rate = 0.12 if bed.shock_mode == "accelerated" else 0.0025
            bed.shock_progress = min(1.0, bed.shock_progress + rate)
            p = bed.shock_progress
            vitals = {
                "heart_rate": 76 + 46 * p + rng.uniform(-1.0, 1.0),
                "systolic_bp": 120 - 32 * p + rng.uniform(-0.8, 0.8),
                "diastolic_bp": 80 - 22 * p + rng.uniform(-0.6, 0.6),
                "respiratory_rate": 16 + 10 * p + rng.uniform(-0.3, 0.3),
                "spo2": 98 - 8 * p + rng.uniform(-0.2, 0.2),
                "temp_c": 37.0 + 1.8 * p,
            }

        if bed.artifact_active:
            bed.artifact_ticks += 1
            # Abrupt drop within one 1.5s packet, then a short hold while
            # the probe is dangling before the nurse reconnects it.
            if bed.artifact_ticks <= 7:
                vitals["spo2"] = 68.0
            elif bed.artifact_ticks == 8:
                vitals["spo2"] = 82.0
            elif bed.artifact_ticks == 9:
                vitals["spo2"] = 94.0
            else:
                bed.artifact_active = False
                vitals["spo2"] = 98.0

        return vitals

    @staticmethod
    def _round_vitals(vitals: dict[str, float]) -> dict[str, float]:
        return {
            "heart_rate": float(round(vitals["heart_rate"])),
            "systolic_bp": float(round(vitals["systolic_bp"])),
            "diastolic_bp": float(round(vitals["diastolic_bp"])),
            "respiratory_rate": float(round(vitals["respiratory_rate"])),
            "spo2": float(round(vitals["spo2"])),
            "temp_c": round(vitals["temp_c"], 1),
        }

    def _packet(self, bed: BedRuntime, vitals: dict[str, float]) -> dict[str, Any]:
        return {
            "bed_id": bed.profile.bed_id,
            "patient_name": bed.profile.patient_name,
            "timestamp": utc_now_iso(),
            "heart_rate": vitals["heart_rate"],
            "systolic_bp": vitals["systolic_bp"],
            "diastolic_bp": vitals["diastolic_bp"],
            "respiratory_rate": vitals["respiratory_rate"],
            "spo2": vitals["spo2"],
            "temp_c": vitals["temp_c"],
        }

    async def run(self) -> None:
        log.info("Synthetic telemetry loop started -> %s", EDGE_URL)
        async with httpx.AsyncClient(timeout=2.0) as client:
            while True:
                self._drain_commands()
                self._tick += 1
                packets: list[tuple[BedRuntime, dict[str, Any]]] = []
                for bed in self.beds.values():
                    vitals = self._round_vitals(self._vitals_for(bed, self._tick))
                    bed.vitals = vitals
                    packets.append((bed, self._packet(bed, vitals)))

                for bed, packet in packets:
                    await self._transmit(client, bed, packet)

                await asyncio.sleep(TELEMETRY_INTERVAL)

    async def _transmit(
        self, client: httpx.AsyncClient, bed: BedRuntime, packet: dict[str, Any]
    ) -> None:
        status = bed.status
        text = (
            f"{bed.profile.bed_id} {bed.profile.patient_name:<13} "
            f"HR {packet['heart_rate']:>3.0f}  "
            f"BP {packet['systolic_bp']:>3.0f}/{packet['diastolic_bp']:<3.0f}  "
            f"RR {packet['respiratory_rate']:>2.0f}  "
            f"SpO2 {packet['spo2']:>3.0f}%  "
            f"T {packet['temp_c']:>4.1f}C  [{status}]"
        )
        try:
            response = await client.post(f"{EDGE_URL}/api/telemetry", json=packet)
            if response.status_code >= 400:
                raise RuntimeError(f"HTTP {response.status_code}")
            self._sent += 1
            self._last_error = None
            self._append_log(f"[TX -> :8001] {text}", True)
        except Exception as exc:  # edge may still be booting; keep generating
            self._failed += 1
            self._last_error = str(exc)
            self._append_log(f"[TX -> :8001] EDGE OFFLINE: {exc}", False)
