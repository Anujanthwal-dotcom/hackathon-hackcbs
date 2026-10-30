from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class News2Component(BaseModel):
    model_config = ConfigDict(extra="ignore")

    parameter: str
    label: str
    value: float
    score: int


class EnrichedTelemetry(BaseModel):
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
    map: float
    news2_score: int = Field(ge=0, le=20)
    news2_components: list[News2Component]
    filter_status: str
    sensor_status: str
    patient_context: str = ""
    received_at: str


class Sbar(BaseModel):
    situation: str
    background: str
    assessment: str
    recommendation: str


class AlertPacket(BaseModel):
    model_config = ConfigDict(extra="ignore")

    alert_id: str
    bed_id: str
    patient_name: str
    severity: str
    news2_score: int = Field(ge=0, le=20)
    sbar: Sbar
    timestamp: str
    patient_context: str = ""
    news2_components: list[News2Component] = Field(default_factory=list)
    sbar_source: str = "LOCAL_FALLBACK"
    status: str = "PENDING_VERIFICATION"


class ClaimRecord(BaseModel):
    alert_id: str
    doctor_id: str
    doctor_name: str
    claimed_at: str


class DemoState(BaseModel):
    active: bool = False
    started_at: str | None = None
    target_bed_id: str | None = None
    eta_seconds: int | None = None


class NurseAction(BaseModel):
    alert_id: str
    action: Literal["VERIFIED", "DISMISSED"]
    nurse_id: str = "nurse-ward-4b"
    note: str | None = None


class DoctorClaim(BaseModel):
    alert_id: str
    doctor_id: str
    doctor_name: str
