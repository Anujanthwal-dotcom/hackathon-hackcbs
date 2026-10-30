from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.models import Sbar, TelemetryPacket
from app.news2 import compute_news2
from app.sbar import SbarSynthesizer
from app.state import BedState


def make_bed_state() -> tuple[BedState, TelemetryPacket]:
    bed = BedState(bed_id="Room-101", patient_name="Marcus Vance", patient_context="Post-Op Day 1 right hemicolectomy")
    packet = TelemetryPacket(
        bed_id="Room-101",
        patient_name="Marcus Vance",
        timestamp="2026-10-30T12:00:00Z",
        heart_rate=122,
        systolic_bp=88,
        diastolic_bp=58,
        respiratory_rate=26,
        spo2=90,
        temp_c=38.8,
    )
    return bed, packet


@pytest.mark.anyio
async def test_sbar_default_local_fallback() -> None:
    with patch("app.sbar.GEMINI_API_KEY", ""), patch("app.sbar.OPENAI_API_KEY", ""):
        synth = SbarSynthesizer()
        assert not synth.enabled
        assert synth.provider == "LOCAL_FALLBACK"

        bed, packet = make_bed_state()
        news2 = compute_news2(packet)
        sbar, source = await synth.synthesize(bed, packet, news2)

        assert source == "LOCAL_FALLBACK"
        assert isinstance(sbar, Sbar)
        assert "critical deterioration" in sbar.situation.lower()
        assert sbar.recommendation != ""


@pytest.mark.anyio
async def test_sbar_gemini_synthesis_success() -> None:
    bed, packet = make_bed_state()
    news2 = compute_news2(packet)

    mock_resp = MagicMock()
    mock_resp.choices = [
        MagicMock(
            message=MagicMock(
                content=json.dumps(
                    {
                        "situation": "Acute deterioration with high NEWS2 score.",
                        "background": "Post-Op Day 1 right hemicolectomy.",
                        "assessment": "Patient is tachycardic and hypotensive.",
                        "recommendation": "Fluid bolus and immediate physician bedside review.",
                    }
                )
            )
        )
    ]

    with patch("app.sbar.GEMINI_API_KEY", "dummy-gemini-key"), patch(
        "app.sbar.GEMINI_MODEL", "gemini-2.0-flash"
    ), patch("app.sbar.OPENAI_API_KEY", ""):
        synth = SbarSynthesizer()
        assert synth.enabled
        assert synth.provider == "GEMINI"
        assert "Gemini" in synth.provider_label

        synth.client = MagicMock()
        synth.client.chat = MagicMock()
        synth.client.chat.completions = MagicMock()
        synth.client.chat.completions.create = AsyncMock(return_value=mock_resp)

        sbar, source = await synth.synthesize(bed, packet, news2)
        assert source == "GEMINI"
        assert sbar.situation == "Acute deterioration with high NEWS2 score."
        assert sbar.recommendation == "Fluid bolus and immediate physician bedside review."


@pytest.mark.anyio
async def test_sbar_gemini_error_falls_back_to_local() -> None:
    bed, packet = make_bed_state()
    news2 = compute_news2(packet)

    with patch("app.sbar.GEMINI_API_KEY", "dummy-gemini-key"), patch(
        "app.sbar.GEMINI_MODEL", "gemini-2.0-flash"
    ):
        synth = SbarSynthesizer()
        synth.client = MagicMock()
        synth.client.chat = MagicMock()
        synth.client.chat.completions = MagicMock()
        synth.client.chat.completions.create = AsyncMock(side_effect=RuntimeError("Gemini quota exceeded"))

        sbar, source = await synth.synthesize(bed, packet, news2)
        assert source == "LOCAL_FALLBACK"
        assert isinstance(sbar, Sbar)
        assert sbar.situation != ""
