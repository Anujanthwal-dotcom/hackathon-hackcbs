from __future__ import annotations

import pytest

from app.models import TelemetryPacket
from app.news2 import (
    compute_news2,
    score_heart_rate,
    score_respiratory_rate,
    score_spo2,
    score_systolic_bp,
    score_temperature,
)


def packet(**overrides: float) -> TelemetryPacket:
    values = {
        "bed_id": "Room-101",
        "patient_name": "Marcus Vance",
        "timestamp": "2026-10-29T23:15:00Z",
        "heart_rate": 76,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "respiratory_rate": 16,
        "spo2": 98,
        "temp_c": 37.0,
    }
    values.update(overrides)
    return TelemetryPacket(**values)


def test_stable_patient_scores_zero() -> None:
    assert compute_news2(packet()).total == 0


def test_critical_sepsis_pattern() -> None:
    result = compute_news2(
        packet(
            heart_rate=122,
            systolic_bp=88,
            diastolic_bp=58,
            respiratory_rate=26,
            spo2=90,
            temp_c=38.8,
        )
    )
    assert result.total == 12
    assert result.severity == "CRITICAL"


@pytest.mark.parametrize(
    ("value", "expected"),
    [(8, 3), (9, 1), (11, 1), (12, 0), (20, 0), (21, 2), (24, 2), (25, 3)],
)
def test_respiratory_rate_bands(value: float, expected: int) -> None:
    assert score_respiratory_rate(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [(91, 3), (92, 2), (93, 2), (94, 1), (95, 1), (96, 0)],
)
def test_spo2_bands(value: float, expected: int) -> None:
    assert score_spo2(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [(90, 3), (91, 2), (100, 2), (101, 1), (110, 1), (111, 0), (219, 0), (220, 3)],
)
def test_systolic_bands(value: float, expected: int) -> None:
    assert score_systolic_bp(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (40, 3),
        (41, 1),
        (50, 1),
        (51, 0),
        (90, 0),
        (91, 1),
        (110, 1),
        (111, 2),
        (130, 2),
        (131, 3),
    ],
)
def test_heart_rate_bands(value: float, expected: int) -> None:
    assert score_heart_rate(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (35.0, 3),
        (35.1, 1),
        (36.0, 1),
        (36.1, 0),
        (38.0, 0),
        (38.1, 1),
        (39.0, 1),
        (39.1, 2),
    ],
)
def test_temperature_bands(value: float, expected: int) -> None:
    assert score_temperature(value) == expected
