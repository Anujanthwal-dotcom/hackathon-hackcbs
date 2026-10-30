#!/usr/bin/env python3
"""Drive the doctor portal through Chrome DevTools Protocol.

Verifies the full browser demo: standby -> demo -> nurse verify ->
all four roster phones show the alert -> all Accept buttons clicked ->
one winner and three stand-downs -> roster perspective switching.
"""

from __future__ import annotations

import json
import time
import urllib.request

import websocket

CDP = "http://127.0.0.1:9222"
DEVICE_COUNT = 4


def http(method: str, url: str, payload: dict | None = None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, method=method, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read()
        return resp.status, (json.loads(body) if body else {})


def page_target() -> str:
    with urllib.request.urlopen(f"{CDP}/json", timeout=10) as resp:
        targets = json.load(resp)
    for target in targets:
        if target.get("type") == "page" and target.get("url", "").startswith("http://127.0.0.1:3001"):
            return target["webSocketDebuggerUrl"]
    raise SystemExit("doctor page target not found")


class Session:
    def __init__(self, url: str):
        self.ws = websocket.create_connection(url, timeout=40)
        self.next_id = 0

    def send(self, method: str, params: dict | None = None):
        self.next_id += 1
        msg_id = self.next_id
        self.ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        while True:
            raw = self.ws.recv()
            msg = json.loads(raw)
            if msg.get("id") == msg_id:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    def eval(self, expression: str):
        result = self.send(
            "Runtime.evaluate",
            {"expression": expression, "returnByValue": True, "awaitPromise": True},
        )
        if "exceptionDetails" in result:
            raise RuntimeError(result["exceptionDetails"])
        return result["result"].get("value")

    def wait_for(self, expression: str, timeout: float, label: str):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.eval(expression):
                print(f"  ✓ {label}")
                return
            time.sleep(0.5)
        raise SystemExit(f"✗ timed out waiting for {label}")

    def click_all(self, needle: str):
        expr = f"""
        (() => {{
          const buttons = [...document.querySelectorAll('button')];
          const targets = buttons.filter((b) => (b.innerText || '').includes({json.dumps(needle)}));
          targets.forEach((b) => b.click());
          return targets.length;
        }})()
        """
        return self.eval(expr)


def main() -> int:
    session = Session(page_target())
    session.send("Runtime.enable")

    print("Doctor portal browser test")
    print("Verified via Chrome DevTools Protocol against the live page\n")

    print("Reset + standby")
    status, _ = http("POST", "http://127.0.0.1:8000/api/reset")
    assert status == 200, status
    time.sleep(2.5)
    session.eval("location.reload(); true")
    time.sleep(4)
    session.wait_for(
        "document.body.innerText.includes('No active escalations')",
        30,
        "roster phone on standby",
    )
    session.wait_for(
        "document.querySelectorAll('button').length > 0 && !![...document.querySelectorAll('button')].find(b => b.innerText.includes('Arm audio alerts'))",
        15,
        "audio arm control present",
    )

    print("\nRun demo")
    status, payload = http("POST", "http://127.0.0.1:8000/api/demo/start")
    assert status == 200 and payload.get("target_bed_id") == "Room-101", (status, payload)
    session.wait_for(
        "document.body.innerText.includes('DEMO LIVE')",
        15,
        "phones show demo live banner",
    )

    print("\nWait for edge alert + nurse verify")
    deadline = time.monotonic() + 60
    alert_id = None
    while time.monotonic() < deadline:
        _, state = http("GET", "http://127.0.0.1:8000/api/state")
        for alert in state.get("alerts", []):
            if alert["bed_id"] == "Room-101" and alert["status"] == "PENDING_VERIFICATION":
                alert_id = alert["alert_id"]
                print(f"  ✓ edge alert arrived (NEWS2 {alert['news2_score']})")
                break
        if alert_id:
            break
        time.sleep(0.5)
    assert alert_id, "no Room-101 alert arrived"

    # Doctor portal must ignore ALERT_NEW: still standby until verified.
    still_standby = session.eval(
        "document.body.innerText.includes('No active escalations')"
    )
    assert still_standby, "doctor portal showed an unverified ALERT_NEW"
    print("  ✓ doctor portal ignored raw ALERT_NEW (still standby)")

    status, _ = http(
        "POST",
        "http://127.0.0.1:8000/api/nurse/action",
        {"alert_id": alert_id, "action": "VERIFIED", "nurse_id": "nurse-ward-4b"},
    )
    assert status == 200, status

    session.wait_for(
        "document.body.innerText.includes('CRITICAL ESCALATION')",
        20,
        "ALERT_VERIFIED reached every roster phone",
    )
    accepts = session.eval(
        "[...document.querySelectorAll('button')].filter(b => b.innerText.includes('Accept Case')).length"
    )
    assert accepts == DEVICE_COUNT, (
        f"expected {DEVICE_COUNT} Accept Case buttons, found {accepts}"
    )
    print("  ✓ all roster phones show SBAR + Accept Case")
    print("  ✓ every on-call device armed on the same alert")

    print("\nSimultaneous claim via every browser button")
    clicked = session.click_all("Accept Case")
    print(f"  ✓ clicked {clicked} Accept Case buttons")
    assert clicked == DEVICE_COUNT, clicked

    session.wait_for(
        "document.body.textContent.includes('CASE LOCKED')",
        20,
        "one phone locked the case",
    )
    session.wait_for(
        "document.body.textContent.includes('CASE LOCKED ELSEWHERE')",
        20,
        "competing phones stood down",
    )

    report = session.eval(
        """(() => {
          const text = document.body.textContent || '';
          const count = (needle) => text.split(needle).length - 1;
          return {
            winner: count('Active Case: Room-101 — En Route'),
            standDown: count('Stand Down'),
            claimedElsewhere: count('CASE LOCKED ELSEWHERE'),
            acceptButtons: [...document.querySelectorAll('button')].filter(b => b.innerText.includes('Accept Case')).length,
          };
        })()"""
    )
    print("\nDOM result")
    print(json.dumps(report, indent=2))

    assert report["winner"] == 1, report
    assert report["standDown"] == DEVICE_COUNT - 1, report
    assert report["claimedElsewhere"] == DEVICE_COUNT - 1, report
    assert report["acceptButtons"] == 0, report

    print("\nPerspective switching")
    won = session.eval(
        """(() => {
          const button = [...document.querySelectorAll('button')]
            .find((b) => b.innerText.includes('HOLDS LOCK'));
          button?.click();
          return Boolean(button);
        })()"""
    )
    assert won, "winner roster card not found"
    session.wait_for(
        "document.body.innerText.includes('CASE LOCKED') && !document.body.innerText.includes('CASE LOCKED ELSEWHERE')",
        10,
        "winner perspective visible",
    )

    stood_down = session.eval(
        """(() => {
          const button = [...document.querySelectorAll('button')]
            .find((b) => b.innerText.includes('STOOD DOWN'));
          button?.click();
          return Boolean(button);
        })()"""
    )
    assert stood_down, "stood-down roster card not found"
    session.wait_for(
        "document.body.innerText.includes('CASE LOCKED ELSEWHERE')",
        10,
        "stand-down perspective visible",
    )
    print("  ✓ roster switches between winner and stood-down screens")

    _, final = http("GET", "http://127.0.0.1:8000/api/state")
    claim = final["claims"].get(alert_id)
    assert claim is not None, "no claim persisted"
    stored = next(a for a in final["alerts"] if a["alert_id"] == alert_id)
    assert stored["status"] == "CLAIMED", stored["status"]
    print(f"\n  ✓ hub persisted CLAIMED for {claim['doctor_name']}")

    print(
        f"\nPASS · one winner, {DEVICE_COUNT - 1} stand-downs, zero double claims, "
        "perspective switching verified."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
