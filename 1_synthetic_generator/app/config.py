from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

PORT = int(os.getenv("GENERATOR_PORT", "8002"))
EDGE_URL = os.getenv("EDGE_URL", "http://localhost:8001").rstrip("/")
TELEMETRY_INTERVAL = float(os.getenv("TELEMETRY_INTERVAL_SECONDS", "1.5"))
PATIENTS_FILE = ROOT / "shared_contracts" / "patients.json"
HEADLESS = os.getenv("CURA_HEALTH_HEADLESS", "").lower() in {"1", "true", "yes"}
