from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from .models import TelemetryPacket

SPO2_DROP_THRESHOLD = 20.0
DROP_WINDOW_SECONDS = 3.0
HR_STABILITY_BPM = 5.0


@dataclass(frozen=True)
class ArtifactFinding:
    previous_spo2: float
    current_spo2: float
    drop: float
    hr_range: float
    window_seconds: float

    @property
    def reason(self) -> str:
        return (
            f"SpO2 fell {self.drop:.0f} points in {self.window_seconds:.1f}s while "
            f"heart rate varied only {self.hr_range:.1f} bpm - physiologically "
            "inconsistent with true hypoxaemia; probable probe disconnect."
        )


def detect_probe_artifact(
    history: list[tuple[datetime, TelemetryPacket]],
    *,
    drop_threshold: float = SPO2_DROP_THRESHOLD,
    window_seconds: float = DROP_WINDOW_SECONDS,
    hr_stability: float = HR_STABILITY_BPM,
) -> ArtifactFinding | None:
    """Detect an abrupt SpO2 collapse without a corresponding HR response.

    This is intentionally deterministic and local: it never calls an LLM and
    never reaches the central network. A sudden desaturation without any
    sympathetic tachycardic response is treated as a sensor artifact until the
    probe recovers.
    """
    if len(history) < 2:
        return None

    now, current = history[-1]
    window_start = now - timedelta(seconds=window_seconds)
    recent = [(ts, packet) for ts, packet in history if ts >= window_start]

    for previous_ts, previous in recent[:-1]:
        gap = (now - previous_ts).total_seconds()
        if gap <= 0 or gap > window_seconds:
            continue
        drop = previous.spo2 - current.spo2
        if drop < drop_threshold:
            continue

        hr_values = [packet.heart_rate for ts, packet in recent if ts >= previous_ts]
        mean_hr = sum(hr_values) / max(1, len(hr_values))
        hr_range = max(hr_values) - min(hr_values)
        allowed = max(hr_stability, mean_hr * 0.05)
        if hr_range <= allowed:
            return ArtifactFinding(
                previous_spo2=previous.spo2,
                current_spo2=current.spo2,
                drop=drop,
                hr_range=hr_range,
                window_seconds=gap,
            )
    return None
