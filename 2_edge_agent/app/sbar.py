from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from .config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    LLM_TIMEOUT_SECONDS,
    OPENAI_API_KEY,
    OPENAI_MODEL,
)
from .models import Sbar, TelemetryPacket
from .news2 import News2Result
from .state import BedState

log = logging.getLogger("curahealth.edge.sbar")

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - import guard for constrained installs
    AsyncOpenAI = None  # type: ignore[assignment]


class SbarSynthesizer:
    def __init__(self) -> None:
        self.provider: str = "LOCAL_FALLBACK"
        self.model: str = ""
        self.client: Any = None

        if GEMINI_API_KEY and AsyncOpenAI is not None:
            self.provider = "GEMINI"
            self.model = GEMINI_MODEL
            self.client = AsyncOpenAI(
                api_key=GEMINI_API_KEY,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                timeout=LLM_TIMEOUT_SECONDS,
            )
        elif OPENAI_API_KEY and AsyncOpenAI is not None:
            self.provider = "OPENAI"
            self.model = OPENAI_MODEL
            self.client = AsyncOpenAI(api_key=OPENAI_API_KEY, timeout=LLM_TIMEOUT_SECONDS)

    @property
    def enabled(self) -> bool:
        return self.client is not None

    @property
    def provider_label(self) -> str:
        if self.provider == "GEMINI":
            return f"Gemini {self.model}"
        if self.provider == "OPENAI":
            return f"OpenAI {self.model}"
        return "deterministic local fallback"

    async def synthesize(
        self,
        bed: BedState,
        packet: TelemetryPacket,
        news2: News2Result,
    ) -> tuple[Sbar, str]:
        fallback = self._fallback(bed, packet, news2)
        if self.client is None:
            return fallback, "LOCAL_FALLBACK"
        try:
            completion = await self.client.chat.completions.create(
                model=self.model,
                temperature=0.2,
                max_tokens=550,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are the in-room clinical deterioration agent for a "
                            "post-surgical step-down ward. Write a concise SBAR escalation "
                            "brief for a nurse and on-call doctor. Return ONLY a JSON object "
                            "with string keys: situation, background, assessment, recommendation. "
                            "Use the supplied synthetic data. Be specific about the trend, use "
                            "measured values, avoid definitive diagnoses, and give safe immediate "
                            "bedside actions. Keep each section under 45 words. No markdown."
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            self._prompt_payload(bed, packet, news2),
                            separators=(",", ":"),
                        ),
                    },
                ],
            )
            content = completion.choices[0].message.content or ""
            parsed = json.loads(content)
            sbar = Sbar(
                situation=str(parsed["situation"]).strip()[:700],
                background=str(parsed["background"]).strip()[:700],
                assessment=str(parsed["assessment"]).strip()[:900],
                recommendation=str(parsed["recommendation"]).strip()[:900],
            )
            if not all([sbar.situation, sbar.background, sbar.assessment, sbar.recommendation]):
                raise ValueError("LLM returned an empty SBAR section")
            return sbar, self.provider
        except Exception as exc:  # API error, timeout, malformed JSON, etc.
            log.warning("LLM SBAR synthesis (%s) failed; using local fallback: %s", self.provider, exc)
            return fallback, "LOCAL_FALLBACK"

    def _prompt_payload(
        self, bed: BedState, packet: TelemetryPacket, news2: News2Result
    ) -> dict[str, Any]:
        first = bed.history[0][1] if bed.history else packet
        window = 0.0
        if len(bed.history) >= 2:
            window = (bed.history[-1][0] - bed.history[0][0]).total_seconds()
        return {
            "bed_id": packet.bed_id,
            "patient": packet.patient_name,
            "background": bed.patient_context,
            "news2_score": news2.total,
            "news2_bands": {
                c.label: {"value": c.value, "points": c.score} for c in news2.components
            },
            "current": {
                "heart_rate": packet.heart_rate,
                "blood_pressure": f"{packet.systolic_bp:.0f}/{packet.diastolic_bp:.0f}",
                "respiratory_rate": packet.respiratory_rate,
                "spo2": packet.spo2,
                "temperature_c": packet.temp_c,
            },
            "trend_window_seconds": round(window),
            "trend_start": {
                "heart_rate": first.heart_rate,
                "systolic_bp": first.systolic_bp,
                "respiratory_rate": first.respiratory_rate,
                "spo2": first.spo2,
                "temperature_c": first.temp_c,
            },
        }

    def _fallback(
        self, bed: BedState, packet: TelemetryPacket, news2: News2Result
    ) -> Sbar:
        first = bed.history[0][1] if bed.history else packet
        window_min = 0.0
        if len(bed.history) >= 2:
            window_min = (bed.history[-1][0] - bed.history[0][0]).total_seconds() / 60.0
        window_text = f"over {window_min:.1f} min" if window_min >= 1.0 else "across the monitored window"
        map_now = (packet.systolic_bp + 2 * packet.diastolic_bp) / 3.0

        rising_hr = packet.heart_rate - first.heart_rate
        falling_bp = first.systolic_bp - packet.systolic_bp
        if falling_bp >= 8 and rising_hr >= 8:
            situation = (
                f"NEWS2 {news2.total} critical deterioration with a rising heart rate and "
                "falling blood pressure, concerning for compensated shock."
            )
        elif first.spo2 - packet.spo2 >= 4:
            situation = (
                f"NEWS2 {news2.total} critical deterioration with progressive hypoxaemia "
                "and increasing respiratory effort."
            )
        else:
            situation = (
                f"NEWS2 {news2.total} critical deterioration requiring immediate bedside review."
            )

        assessment = (
            f"{window_text.capitalize()}, HR moved {first.heart_rate:.0f} to {packet.heart_rate:.0f} bpm, "
            f"systolic BP {first.systolic_bp:.0f} to {packet.systolic_bp:.0f} mmHg "
            f"(MAP {map_now:.0f}), respiratory rate {first.respiratory_rate:.0f} to "
            f"{packet.respiratory_rate:.0f}/min, SpO2 {first.spo2:.0f}% to {packet.spo2:.0f}%, "
            f"temperature {first.temp_c:.1f} to {packet.temp_c:.1f} C. "
            "Persistent tachycardia with narrowing pulse pressure and tachypnoea suggests "
            "early compensated septic shock."
        )

        return Sbar(
            situation=situation,
            background=f"{packet.patient_name} - {bed.patient_context}.",
            assessment=assessment,
            recommendation=(
                "Immediate bedside evaluation within 5 minutes. Maintain continuous telemetry, "
                "establish IV access, give a stat 500 mL crystalloid bolus if not contraindicated, "
                "draw blood cultures and lactate, and escalate to the rapid response team if MAP "
                "falls below 65 mmHg or NEWS2 continues to rise."
            ),
        )


def fallback_note(bed: BedState, packet: TelemetryPacket, news2: News2Result) -> Sbar:
    """Utility for tests and offline previews."""
    synthesizer = SbarSynthesizer()
    return synthesizer._fallback(bed, packet, news2)


def trend_age_seconds(bed: BedState) -> float:
    if len(bed.history) < 2:
        return 0.0
    return (bed.history[-1][0] - bed.history[0][0]).total_seconds()


def utc_stamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
