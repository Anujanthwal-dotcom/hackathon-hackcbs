from __future__ import annotations

from dataclasses import dataclass

from .models import News2Component, TelemetryPacket


@dataclass(frozen=True)
class News2Result:
    total: int
    components: list[News2Component]

    @property
    def severity(self) -> str:
        if self.total >= 7:
            return "CRITICAL"
        if self.total >= 5:
            return "HIGH"
        return "MEDIUM"


def _rounded(value: float) -> int:
    return int(round(value))


def score_respiratory_rate(value: float) -> int:
    v = _rounded(value)
    if v <= 8:
        return 3
    if v <= 11:
        return 1
    if v <= 20:
        return 0
    if v <= 24:
        return 2
    return 3


def score_spo2(value: float) -> int:
    v = _rounded(value)
    if v <= 91:
        return 3
    if v <= 93:
        return 2
    if v <= 95:
        return 1
    return 0


def score_systolic_bp(value: float) -> int:
    v = _rounded(value)
    if v <= 90:
        return 3
    if v <= 100:
        return 2
    if v <= 110:
        return 1
    if v <= 219:
        return 0
    return 3


def score_heart_rate(value: float) -> int:
    v = _rounded(value)
    if v <= 40:
        return 3
    if v <= 50:
        return 1
    if v <= 90:
        return 0
    if v <= 110:
        return 1
    if v <= 130:
        return 2
    return 3


def score_temperature(value: float) -> int:
    v = round(float(value), 1)
    if v <= 35.0:
        return 3
    if v <= 36.0:
        return 1
    if v <= 38.0:
        return 0
    if v <= 39.0:
        return 1
    return 2


def compute_news2(packet: TelemetryPacket) -> News2Result:
    """Compute the five-parameter NEWS2 score available from the bed streams.

    ACVPU and supplemental-oxygen points are assumed to be zero in this
    synthetic environment; the displayed score therefore uses the full NHS
    NEWS2 bands while remaining 0-15 from the five measured parameters.
    """
    components = [
        News2Component(
            parameter="respiratory_rate",
            label="Respiratory rate",
            value=packet.respiratory_rate,
            score=score_respiratory_rate(packet.respiratory_rate),
        ),
        News2Component(
            parameter="spo2",
            label="SpO2",
            value=packet.spo2,
            score=score_spo2(packet.spo2),
        ),
        News2Component(
            parameter="systolic_bp",
            label="Systolic BP",
            value=packet.systolic_bp,
            score=score_systolic_bp(packet.systolic_bp),
        ),
        News2Component(
            parameter="heart_rate",
            label="Heart rate",
            value=packet.heart_rate,
            score=score_heart_rate(packet.heart_rate),
        ),
        News2Component(
            parameter="temp_c",
            label="Temperature",
            value=packet.temp_c,
            score=score_temperature(packet.temp_c),
        ),
    ]
    return News2Result(total=sum(c.score for c in components), components=components)


def map_value(packet: TelemetryPacket) -> float:
    return round((packet.systolic_bp + 2 * packet.diastolic_bp) / 3.0, 1)
