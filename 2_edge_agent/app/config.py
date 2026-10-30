from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

PORT = int(os.getenv("EDGE_PORT", "8001"))
CENTRAL_URL = os.getenv("CENTRAL_URL", "http://localhost:8000").rstrip("/")
GENERATOR_URL = os.getenv("GENERATOR_URL", "http://localhost:8002").rstrip("/")
PATIENTS_FILE = ROOT / "shared_contracts" / "patients.json"
HEADLESS = os.getenv("CURA_HEALTH_HEADLESS", "").lower() in {"1", "true", "yes"}

ALERT_NEWS2_THRESHOLD = int(os.getenv("ALERT_NEWS2_THRESHOLD", "7"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "8"))
