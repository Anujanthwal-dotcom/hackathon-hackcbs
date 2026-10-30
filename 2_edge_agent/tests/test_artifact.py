from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.artifact import detect_probe_artifact
from app.models import TelemetryPacket

BASE = datetime(2026, 10, 29, 23, 15, tzinfo=timezone.utc)


def packet(seconds: float, *, hr: float = 76, spo2: float = 98) -> tuple[datetime, TelemetryPacket]:
    return (
        BASE + timedelta(seconds=seconds),
        TelemetryPacket(
            bed_id="Room-101",
            patient_name="David Kim",
            timestamp=(BASE + timedelta(seconds=seconds)).isoformat(),
            heart_rate=hr,
            systolic_bp=118,
            diastolic_bp=76,
            respiratory_rate=16,
            spo2=spo2,
            temp_c=37.0,
        ),
    )


def test_detects_sudden_desaturation_with_stable_hr() -> None:
    history = [packet(0), packet(1.5, hr=77, spo2=68)]
    finding = detect_probe_artifact(history)
    assert finding is not None
    assert finding.drop == 30
    assert finding.hr_range == 1


def test_ignores_gradual_hypoxaemia() -> None:
    history = [packet(0), packet(5, spo2=88), packet(10, spo2=84)]
    assert detect_probe_artifact(history) is None


def test_ignores_desaturation_with_tachycardic_response() -> None:
    history = [packet(0, hr=76), packet(1.5, hr=122, spo2=68)]
    assert detect_probe_artifact(history) is None


def test_requires_history() -> None:
    assert detect_probe_artifact([]) is None
    assert detect_probe_artifact([packet(0)]) is None
