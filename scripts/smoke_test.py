#!/usr/bin/env python3
"""End-to-end smoke test for the Cura Health demo.

Exercises the live services over plain HTTP so it has no third-party
dependencies:

1. artifact suppression on Room-101
2. demo decompensation on Room-101
3. nurse verification
4. simultaneous doctor claims (exactly one 200, one 409)
5. clean reset

Usage:
    python3 scripts/smoke_test.py
    python3 scripts/smoke_test.py --keep      # leave the claimed state for review
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

CENTRAL_URL = os.getenv("CENTRAL_URL", "http://127.0.0.1:8000").rstrip("/")
EDGE_URL = os.getenv("EDGE_URL", "http://127.0.0.1:8001").rstrip("/")
GENERATOR_URL = os.getenv("GENERATOR_URL", "http://127.0.0.1:8002").rstrip("/")

DOCTORS = [
    {"doctor_id": "doc_chen", "doctor_name": "Dr. Sarah Chen"},
    {"doctor_id": "doc_okafor", "doctor_name": "Dr. James Okafor"},
]

GREEN = "\033[92m"
RED = "\033[91m"
AMBER = "\033[93m"
DIM = "\033[2m"
RESET = "\033[0m"


def call(
    method: str,
    url: str,
    payload: dict[str, Any] | None = None,
    timeout: float = 6.0,
) -> tuple[int, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read()
            return response.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read()
        try:
            parsed: Any = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"detail": body.decode("utf-8", "replace")}
        return exc.code, parsed


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)
    print(f"  {GREEN}✓{RESET} {message}")


def state() -> dict[str, Any]:
    status, payload = call("GET", f"{CENTRAL_URL}/api/state")
    if status != 200:
        raise AssertionError(f"central state unavailable (HTTP {status})")
    return payload


def wait_for(
    description: str,
    predicate: Callable[[], Any],
    *,
    timeout: float,
    interval: float = 0.5,
) -> Any:
    deadline = time.monotonic() + timeout
    last: Any = None
    while time.monotonic() < deadline:
        last = predicate()
        if last:
            return last
        time.sleep(interval)
    raise AssertionError(f"timed out after {timeout:.0f}s waiting for {description}")


def wait_for_services(timeout: float = 25.0) -> None:
    targets = [
        ("central hub", f"{CENTRAL_URL}/api/health"),
        ("edge agent", f"{EDGE_URL}/api/health"),
        ("generator", f"{GENERATOR_URL}/api/health"),
    ]
    print(f"\n{AMBER}Checking services{RESET}")
    for name, url in targets:
        try:
            wait_for(
                name,
                lambda u=url: call("GET", u, timeout=1.5)[0] == 200,
                timeout=timeout,
                interval=0.4,
            )
        except AssertionError:
            raise SystemExit(
                f"{RED}✗ {name} is not responding at {url}{RESET}\n"
                "  Start the stack first: ./start_all.sh --headless"
            ) from None
        print(f"  {GREEN}✓{RESET} {name} reachable")


def reset_system(label: str) -> None:
    status, payload = call("POST", f"{CENTRAL_URL}/api/reset")
    check(status == 200, f"{label}: reset accepted (HTTP {status})")
    errors = payload.get("service_errors") or []
    if errors:
        print(f"  {DIM}service warnings: {errors}{RESET}")
    time.sleep(1.6)


def artifact_stage() -> None:
    print(f"\n{AMBER}Stage 1 · SpO2 artifact suppression (Room-101){RESET}")
    reset_system("artifact")
    status, _ = call("POST", f"{GENERATOR_URL}/api/control/artifact")
    check(status == 200, "bedside probe-disconnect queued on the generator")

    def suppressed() -> dict[str, Any] | None:
        payload = state()
        bed = payload["beds"].get("Room-101")
        if bed and bed["filter_status"] == "ARTIFACT_SUPPRESSED":
            return bed
        return None

    bed = wait_for("Room-101 artifact suppression", suppressed, timeout=20)
    check(bed["sensor_status"] == "PROBE_DISCONNECTED", "sensor marked PROBE_DISCONNECTED")
    check(
        all(alert["bed_id"] != "Room-101" for alert in state()["alerts"]),
        "no Room-101 alert reached the central alarm bus",
    )
    print(
        f"  {DIM}suppressed SpO2 reading: {bed['spo2']:.0f}% · "
        f"NEWS2 {bed['news2_score']}{RESET}"
    )


def demo_stage(claim_timeout: float) -> None:
    print(f"\n{AMBER}Stage 2 · Run Demo → nurse verify → doctor race{RESET}")
    reset_system("demo pre-roll")
    status, payload = call("POST", f"{CENTRAL_URL}/api/demo/start")
    check(status == 200, f"demo trigger accepted (HTTP {status})")
    check(payload.get("target_bed_id") == "Room-101", "demo target is Room-101")

    def pending_alert() -> dict[str, Any] | None:
        payload = state()
        for alert in payload["alerts"]:
            if (
                alert["bed_id"] == "Room-101"
                and alert["status"] == "PENDING_VERIFICATION"
            ):
                return alert
        return None

    alert = wait_for("Room-101 edge alert", pending_alert, timeout=claim_timeout)
    check(alert["news2_score"] >= 7, f"NEWS2 {alert['news2_score']} crossed the threshold")
    check(alert["severity"] == "CRITICAL", "severity escalated to CRITICAL")
    check(
        all(alert["sbar"].get(section) for section in ("situation", "background", "assessment", "recommendation")),
        "all four SBAR sections are populated",
    )
    check(
        alert["sbar_source"] in {"OPENAI", "LOCAL_FALLBACK"},
        f"SBAR source = {alert['sbar_source']}",
    )
    print(f"  {DIM}{alert['sbar']['situation']}{RESET}")

    alert_id = alert["alert_id"]
    status, payload = call(
        "POST",
        f"{CENTRAL_URL}/api/nurse/action",
        {
            "alert_id": alert_id,
            "action": "VERIFIED",
            "nurse_id": "nurse-ward-4b",
        },
    )
    check(status == 200, f"nurse verification accepted (HTTP {status})")
    check(payload["alert"]["status"] == "VERIFIED", "alert escalated to VERIFIED")

    barrier = threading.Barrier(len(DOCTORS))

    def race(doctor: dict[str, str]) -> tuple[dict[str, str], int, Any]:
        barrier.wait(timeout=10)
        code, body = call(
            "POST",
            f"{CENTRAL_URL}/api/doctor/claim",
            {
                "alert_id": alert_id,
                "doctor_id": doctor["doctor_id"],
                "doctor_name": doctor["doctor_name"],
            },
        )
        return doctor, code, body

    with ThreadPoolExecutor(max_workers=len(DOCTORS)) as pool:
        results = list(pool.map(race, DOCTORS))

    codes = sorted(code for _, code, _ in results)
    check(codes == [200, 409], f"atomic claim race returned {codes}")

    winner = next((doctor for doctor, code, _ in results if code == 200), None)
    loser = next((doctor for doctor, code, _ in results if code == 409), None)
    assert winner is not None and loser is not None
    check(True, f"{winner['doctor_name']} won the first-to-claim lock")
    check(True, f"{loser['doctor_name']} was stood down with HTTP 409")

    loser_body = next(body for _, code, body in results if code == 409)
    check(
        "already claimed" in str(loser_body.get("detail", "")).lower(),
        f"loser detail: {loser_body.get('detail')}",
    )

    final = state()
    stored = next(item for item in final["alerts"] if item["alert_id"] == alert_id)
    check(stored["status"] == "CLAIMED", "alert status is CLAIMED")
    claim = final["claims"].get(alert_id)
    check(claim is not None, "claim persisted in the hub snapshot")
    assert claim is not None
    check(
        claim["doctor_id"] == winner["doctor_id"],
        f"persisted claim belongs to {winner['doctor_name']}",
    )
    print(
        f"  {DIM}claim id: {alert_id} · claimed at {claim['claimed_at']}{RESET}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--keep",
        action="store_true",
        help="leave the claimed demo state in place instead of resetting",
    )
    parser.add_argument(
        "--skip-artifact",
        action="store_true",
        help="skip the Room-101 artifact-suppression stage",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=45.0,
        help="seconds to wait for the demo alert (default: 45)",
    )
    args = parser.parse_args()

    print(f"{DIM}Cura Health · end-to-end smoke test{RESET}")
    print(f"{DIM}hub={CENTRAL_URL} edge={EDGE_URL} generator={GENERATOR_URL}{RESET}")

    try:
        wait_for_services()
        if not args.skip_artifact:
            artifact_stage()
        demo_stage(args.timeout)
    except AssertionError as exc:
        print(f"\n{RED}✗ FAILED:{RESET} {exc}")
        print(f"{DIM}State left in place for inspection: {CENTRAL_URL}/api/state{RESET}")
        return 1
    except KeyboardInterrupt:
        print("\nInterrupted.")
        return 130

    if args.keep:
        print(f"\n{AMBER}Claimed state kept for review.{RESET}")
    else:
        reset_system("cleanup")
        print(f"\n{GREEN}PASS{RESET} · demo flow, atomic claim race, and reset all verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
