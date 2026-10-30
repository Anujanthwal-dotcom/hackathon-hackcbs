from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TelemetryPacket(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bed_id: str
    patient_name: str
    timestamp: str
    heart_rate: float = Field(ge=0, le=300)
    systolic_bp: float = Field(ge=0, le=300)
    diastolic_bp: float = Field(ge=0, le=200)
    respiratory_rate: float = Field(ge=0, le=80)
    spo2: float = Field(ge=0, le=100)
    temp_c: float = Field(ge=20, le=45)


class News2Component(BaseModel):
    parameter: str
    label: str
    value: float
    score: int


class Sbar(BaseModel):
    situation: str
    background: str
    assessment: str
    recommendation: str


class EnrichedTelemetry(TelemetryPacket):
    map: float
    news2_score: int
    news2_components: list[News2Component]
    filter_status: str
    sensor_status: str
    patient_context: str
    received_at: str


class AlertPacket(BaseModel):
    alert_id: str
    bed_id: str
    patient_name: str
    severity: str
    news2_score: int
    sbar: Sbar
    timestamp: str
    patient_context: str
    news2_components: list[News2Component]
    sbar_source: str
    status: str = "PENDING_VERIFICATION"


class SbarSynthesis(BaseModel):
    sbar: Sbar
    source: str
