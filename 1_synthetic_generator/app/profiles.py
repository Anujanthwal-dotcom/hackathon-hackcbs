from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from .config import PATIENTS_FILE


@dataclass(frozen=True)
class PatientProfile:
    bed_id: str
    patient_name: str
    age: int
    sex: str
    context: str
    profile: str
    baseline: dict[str, float]

    @property
    def patient_context(self) -> str:
        return self.context


def load_profiles() -> list[PatientProfile]:
    payload: dict[str, Any] = json.loads(PATIENTS_FILE.read_text())
    profiles = []
    for item in payload["patients"]:
        profiles.append(
            PatientProfile(
                bed_id=item["bed_id"],
                patient_name=item["patient_name"],
                age=item["age"],
                sex=item["sex"],
                context=item["context"],
                profile=item["profile"],
                baseline={k: float(v) for k, v in item["baseline"].items()},
            )
        )
    return profiles
