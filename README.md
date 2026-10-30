# Cura Health

**Edge-first clinical deterioration detection with human verification and atomic multi-physician dispatch.**

Cura Health is a working hackathon prototype for a post-surgical step-down ward. Three simulated bedside monitors stream vitals through an in-room edge agent, which scores NEWS2 locally, suppresses physiologically impossible SpO2 artifacts, and synthesizes an SBAR escalation brief. A nurse verifies the alert at the central hub, which then pages every on-call doctor at the same instant. Exactly one doctor wins the case.

The entire demo runs locally and offline. No cloud services or API keys are required.

---

## The 90-second demo

1. Open the **nursing station** at <http://localhost:3000> and the **doctor dispatch** portal at <http://localhost:3001>.
2. On the doctor portal, click **Arm audio alerts** once. Browsers require a user gesture before audio can play.
3. Click **Run Demo** on the nursing station. The ward resets and Bed-103 begins a compensated-shock decompensation.
4. Within ~10 seconds Bed-103 crosses NEWS2 ≥ 7. The edge agent fires an alert with a complete SBAR brief.
5. Open the alert drawer and click **Verify & Escalate**. Every on-call phone rings simultaneously with the same SBAR.
6. Click **Accept Case** on the visible phone. The roster marks that doctor **HOLDS LOCK** and the other three **STOOD DOWN**. Use the roster or the **View winner / View stand-down** shortcuts to show judges each physician's screen. If two Accept clicks land together, the hub returns HTTP 409 to the losers.
7. One phone shows **Active Case: Bed-103 — En Route**; the others show **Claimed by … — Stand Down**. The hub persists exactly one claim.

To demonstrate artifact suppression separately, open the generator console (or call the API) and trigger a **probe disconnect** on Bed-102. SpO2 collapses by 20+ points while heart rate stays flat. The edge marks `PROBE_DISCONNECTED` / `ARTIFACT_SUPPRESSED` and **no alert reaches the hub**.

---

## Architecture

```
┌──────────────────────────┐        HTTP POST /api/telemetry        ┌────────────────────────┐
│ 1 · Synthetic Generator  │ ────────────────────────────────────▶ │ 2 · Edge Agent         │
│    :8002                 │                                       │    :8001               │
│  Bed-101 / 102 / 103     │                                       │  NEWS2 scoring         │
│  Tkinter bedside console │                                       │  artifact suppression  │
└──────────────────────────┘                                       │  SBAR synthesis        │
                                                                   └───────────┬────────────┘
                                                                               │ POST /api/edge/telemetry
                                                                               │ POST /api/edge/alert
                                                                               ▼
┌──────────────────────────┐        REST verify / dismiss          ┌────────────────────────┐
│ 4 · Nurse Dashboard      │ ────────────────────────────────────▶ │ 3 · Central Backend    │
│    :3000                 │ ◀──────────── WebSocket ───────────── │    :8000  /ws         │
│  live beds, alert drawer │                                       │  hub state + broadcast │
└──────────────────────────┘                                       │  asyncio.Lock claims   │
                                                                   └───────────┬────────────┘
┌──────────────────────────┐        REST claim (race)                          │
│ 5 · Doctor Portal        │ ─────────────────────────────────────────────────┘
│    :3001                 │ ◀──────────── WebSocket ─────────────
│  selectable phone roster │
└──────────────────────────┘
```

**Key design choices**

- **Edge-first:** scoring, artifact rejection, and SBAR generation happen at the bedside. The central hub is a relay, state store, and arbitration point, not the clinical brain.
- **Human in the loop:** an edge alert is `PENDING_VERIFICATION` until a nurse explicitly verifies it. The doctor portal ignores raw `ALERT_NEW` events entirely.
- **Transport split:** telemetry flows generator → edge → hub. Alerts flow edge → hub. Browser updates flow hub → WebSocket clients. Claims and nurse actions are REST calls back to the hub.
- **Deterministic core:** NEWS2 bands and artifact logic are pure functions with unit tests. The optional LLM only writes narrative prose; it can never change the score or suppress an alarm.

---

## Repository layout

```
.
├── 1_synthetic_generator/   Python · bedside monitor simulator + Tkinter UI
├── 2_edge_agent/            Python · NEWS2, artifact filter, SBAR, uplink + Tkinter UI
├── 3_central_backend/       Python · FastAPI hub, WebSocket fan-out, atomic claims
├── 4_nurse_dashboard/       Next.js · ward overview, Run Demo, verification drawer
├── 5_doctor_portal/         Next.js · selectable 4-device phone simulator + race console
├── shared_contracts/        schemas.json, types.ts, patients.json (single source of truth)
├── scripts/
│   ├── smoke_test.py        end-to-end API test
│   └── browser_test.py      Chrome DevTools Protocol DOM test for the claim race
├── start_all.sh             start all five services
├── stop_all.sh              stop everything and free the ports
└── .env.example             optional configuration
```

---

## Quick start

### Prerequisites

- Python **3.10+** with [uv](https://docs.astral.sh/uv/)
- [Bun](https://bun.sh/) **1.1+**
- A display for the native Tkinter consoles (optional — the stack runs headless)
- Chrome/Chromium only if you want to run the browser test

### Install

```bash
git clone <repo> cura-health
cd cura-health

# Python dependencies (one isolated env per service)
(cd 1_synthetic_generator && uv sync)
(cd 2_edge_agent       && uv sync)
(cd 3_central_backend  && uv sync)

# TypeScript workspace + shared contracts
bun install
```

### Run

```bash
./start_all.sh              # Tkinter consoles + all web services
./start_all.sh --headless   # no GUI (CI, SSH, no DISPLAY)
```

The script waits for every health check, writes PIDs to `.cura-health/pids`, and logs to `.cura-health/logs/`. It automatically falls back to headless mode when `DISPLAY` is unset.

| Service | URL |
| --- | --- |
| Nursing station | <http://localhost:3000> |
| Doctor dispatch | <http://localhost:3001> |
| Central hub (Swagger) | <http://localhost:8000/docs> |
| Edge agent (Swagger) | <http://localhost:8001/docs> |
| Generator (Swagger) | <http://localhost:8002/docs> |

### Stop

```bash
./stop_all.sh
```

Each service runs in its own process group, so stopping also terminates Next.js children and Tk windows. The script verifies that ports `8000–8002` and `3000–3001` are free.

---

## Configuration

Everything works with the defaults. Copy `.env.example` to `.env` to change behaviour.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | *(empty)* | Enables Google Gemini SBAR generation. Preferred provider when set. |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model used for SBAR narrative. |
| `OPENAI_API_KEY` | *(empty)* | Enables OpenAI SBAR generation if Gemini key is not set. |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model used for SBAR narrative. |
| `LLM_TIMEOUT_SECONDS` | `8` | LLM timeout before falling back locally. |
| `TELEMETRY_INTERVAL_SECONDS` | `1.5` | Bedside sample period. |
| `ALERT_NEWS2_THRESHOLD` | `7` | Edge alert threshold. |
| `CENTRAL_URL` / `EDGE_URL` / `GENERATOR_URL` | localhost ports | Service-to-service uplinks. |
| `NEXT_PUBLIC_CENTRAL_URL` / `NEXT_PUBLIC_WS_URL` | `localhost:8000` | Browser API and WebSocket endpoints. |
| `CURA_HEALTH_HEADLESS` | `0` | `1` skips Tkinter. |

`start_all.sh --headless` sets `CURA_HEALTH_HEADLESS=1` for all Python services.

---

## Clinical logic

### NEWS2

Five measured parameters are scored with the full NHS NEWS2 bands. ACVPU and supplemental oxygen are assumed normal in this synthetic ward, so the displayed total ranges 0–15.

| Parameter | 3 | 2 | 1 | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Respiratory rate | ≤8 | — | 9–11 | 12–20 | 21–24 | — | ≥25 |
| SpO2 | ≤91 | 92–93 | 94–95 | ≥96 | — | — | — |
| Systolic BP | ≤90 | 91–100 | 101–110 | 111–219 | — | — | ≥220 |
| Heart rate | ≤40 | 111–130 | 41–50 / 91–110 | 51–90 | — | — | ≥131 |
| Temperature | ≤35.0 | ≥39.1 | 35.1–36.0 / 38.1–39.0 | 36.1–38.0 | — | — | — |

Severity mapping: `NEWS2 ≥ 7 → CRITICAL`, `≥ 5 → HIGH`, otherwise `MEDIUM`. Alerts fire at **≥ 7**.

### Alarm latch

One alert per bed at a time. After the alert is resolved, the latch re-arms only after sustained recovery — NEWS2 < 5 **and** SpO2 ≥ 95% for more than 20 seconds. This prevents alarm storms while still re-alerting on a genuine second deterioration.

### SpO2 artifact suppression

A reading is treated as a probe artifact when **both** are true:

- SpO2 falls **≥ 20 points within 3 seconds**, and
- heart rate varies by **≤ max(5 bpm, 5% of mean HR)** across the same window.

A true hypoxaemic crash produces a compensatory tachycardic response; a probe disconnect does not. Suppressed telemetry is still streamed to the nurse dashboard for transparency, flagged `filter_status: "ARTIFACT_SUPPRESSED"` and `sensor_status: "PROBE_DISCONNECTED"`, but no alert is created and no doctor is paged.

### SBAR synthesis

When a bed crosses NEWS2 ≥ 7 the edge agent builds an SBAR from the patient context, current vitals, NEWS2 components, and the trend window.

- If `GEMINI_API_KEY` is set, `gemini-2.0-flash` (or configured `GEMINI_MODEL`) writes JSON with `situation`, `background`, `assessment`, `recommendation`.
- If `OPENAI_API_KEY` is set (and no Gemini key), `gpt-4o-mini` writes the brief.
- Otherwise — or on timeout, API error, quota limits, or malformed output — a deterministic local generator produces the same four sections.
- Every alert records `sbar_source` as `GEMINI`, `OPENAI`, or `LOCAL_FALLBACK` so the UI can show provenance.
- LLM output is validated and truncated; failure can delay the brief but never suppresses an alert.

### Atomic first-to-claim

All doctor claims go through a single `asyncio.Lock` in the central hub:

1. All on-call phones receive the same verified `AlertPacket`.
2. Each `POST /api/doctor/claim` validates the alert is `VERIFIED` and unclaimed.
3. The first claim sets status to `CLAIMED`, stores the `ClaimRecord`, and broadcasts `CASE_CLAIMED`.
4. Any later claim returns **HTTP 409** with the winning doctor's name.
5. The lock is never held across an `await`, so no request can observe a half-written claim.

---

## API reference

### Central hub · `:8000`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness and service metadata. |
| `GET` | `/api/state` | Full snapshot: beds, alerts, claims, and demo state. |
| `POST` | `/api/edge/telemetry` | Edge telemetry uplink; broadcasts `TELEMETRY_STREAM`. |
| `POST` | `/api/edge/alert` | Edge alert uplink; broadcasts `ALERT_NEW`. |
| `POST` | `/api/nurse/action` | `{alert_id, action: "VERIFIED" \| "DISMISSED", nurse_id}`. |
| `POST` | `/api/doctor/claim` | `{alert_id, doctor_id, doctor_name}`. First wins; others get 409. |
| `POST` | `/api/demo/start` | Reset everything, then accelerate Bed-103 decompensation. |
| `POST` | `/api/reset` | Reset hub, edge buffers, and generator; broadcast `SYSTEM_RESET`. |
| `WS` | `/ws` | All real-time events. Send `{"type": "PING"}` for `PONG`. |

### Edge agent · `:8001`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness, uplink status, LLM mode. |
| `GET` | `/api/state` | Per-bed enriched telemetry, trends, alerts, logs. |
| `POST` | `/api/telemetry` | Ingest a raw bedside packet from the generator. |
| `POST` | `/api/reset` | Clear history, artifact buffers, and alert latches. |

### Generator · `:8002`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness and stream status. |
| `GET` | `/api/state` | Current patient profiles and latest vitals. |
| `POST` | `/api/control/shock` | Start the Bed-103 compensated-shock trajectory. |
| `POST` | `/api/control/artifact` | Start the Bed-102 probe-disconnect artifact. |
| `POST` | `/api/control/reset` | Return all beds to baseline. |

### WebSocket events

All events are `{"type": "...", "data": ...}`. The browser dashboards hydrate from `STATE_SNAPSHOT` on connect.

| Event | Emitted when | Consumer |
| --- | --- | --- |
| `STATE_SNAPSHOT` | A client connects | Nurse, doctor |
| `TELEMETRY_STREAM` | Every enriched sample | Nurse |
| `ALERT_NEW` | Edge alert reaches hub, `PENDING_VERIFICATION` | Nurse only* |
| `ALERT_VERIFIED` | Nurse verifies | Nurse + all doctors |
| `ALERT_DISMISSED` | Nurse dismisses as artifact | Nurse |
| `CASE_CLAIMED` | First doctor claim wins | Nurse + all doctors |
| `DEMO_STARTED` | Demo trigger accepted | All clients |
| `SYSTEM_RESET` | Any reset | All clients |
| `PONG` | Client sends `PING` | Client |

\* The doctor portal deliberately ignores `ALERT_NEW`; phones only ring after human verification.

---

## Tests and verification

```bash
# 46 edge unit tests (NEWS2 bands + artifact detection)
(cd 2_edge_agent && uv run pytest -q)

# TypeScript across both apps and shared contracts
bun run typecheck

# Full API flow: artifact → demo → verify → simultaneous claim race → reset
python3 scripts/smoke_test.py

# Optional: assert the real doctor DOM (requires headless Chrome on :9222)
google-chrome --headless=new --disable-gpu --no-sandbox \
  --remote-debugging-port=9222 --user-data-dir=/tmp/pg-chrome \
  http://127.0.0.1:3001/ &
uv run --no-project --with websocket-client python scripts/browser_test.py
```

`scripts/smoke_test.py` uses only the Python standard library. It asserts artifact suppression produces no Bed-102 alert, the demo produces a NEWS2 ≥ 7 alert with all four SBAR sections, a nurse verification succeeds, the concurrent claim race returns exactly `[200, 409]`, and the claim is persisted.

`scripts/browser_test.py` drives the actual doctor page over CDP. It clicks every **Accept Case** button at once and asserts the DOM contains exactly one winner, three **Stand Down** screens, and zero remaining accept buttons, then switches roster perspectives.

---

## Troubleshooting

**Ports already in use.** Run `./stop_all.sh`, then check with `lsof -i :8000 -i :8001 -i :8002 -i :3000 -i :3001`.

**Tkinter windows do not appear.** Ensure `DISPLAY` is set, or run `./start_all.sh --headless`. Both consoles are 900×860 and reposition themselves at `+20+116` and `+1000+116`.

**No alert after Run Demo.** The demo takes roughly 8–12 seconds. Verify the generator and edge health endpoints; if the generator is unreachable, `/api/demo/start` returns HTTP 503.

**Doctor phones do not ring.** Audio must be armed with a click. The phones also only react to `ALERT_VERIFIED`, so verify the alert on the nursing station first.

**SBAR says `LOCAL_FALLBACK`.** That is expected without `OPENAI_API_KEY`. It is a fully populated deterministic brief, not an error.

**Next.js first load is slow.** The first request compiles the route in dev mode; subsequent loads are fast. `start_all.sh` already waits for both dashboards to return HTTP 200.

**Stale state after a failed run.** `POST /api/reset` (or the reset control in either Tk console) clears the hub, edge buffers, and generator together.

---

## Design notes and limits

- This is a synthetic prototype. There is no PHI, authentication, persistence layer, or production deployment configuration.
- The hub stores state in memory; restarting it clears alerts and claims.
- Patient identities and baselines live in `shared_contracts/patients.json`; wire formats live in `shared_contracts/schemas.json` and `shared_contracts/types.ts`.
- Browser audio is deduplicated across all on-call phones so the room hears one chime rather than overlapping alarms.
- The claim race is verified at both the API layer (smoke test) and the DOM layer (browser test).
