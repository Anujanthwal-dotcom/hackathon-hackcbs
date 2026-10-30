from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

PORT = int(os.getenv("CENTRAL_PORT", "8000"))
HOST = os.getenv("CENTRAL_HOST", "0.0.0.0")
GENERATOR_URL = os.getenv("GENERATOR_URL", "http://localhost:8002").rstrip("/")
EDGE_URL = os.getenv("EDGE_URL", "http://localhost:8001").rstrip("/")
