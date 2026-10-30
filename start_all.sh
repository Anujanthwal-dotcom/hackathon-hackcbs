#!/usr/bin/env bash
# Start the full Cura Health stack.
#
#   ./start_all.sh              native Tkinter consoles + web dashboards
#   ./start_all.sh --headless   API-only Python services (CI / no display)
#
# Logs and PIDs live in .cura-health/.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Load optional root .env so both Python (dotenv) and the Next.js apps see the
# same CENTRAL_URL / NEXT_PUBLIC_* values.
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

HEADLESS="${CURA_HEALTH_HEADLESS:-0}"

usage() {
  cat <<'EOF'
Usage: ./start_all.sh [--headless | --gui]

  --headless   run the Python services without Tkinter windows
  --gui        force native Tkinter windows (default when DISPLAY is set)

Environment:
  CURA_HEALTH_HEADLESS=1   same as --headless
EOF
}

for arg in "$@"; do
  case "$arg" in
    --headless) HEADLESS=1 ;;
    --gui) HEADLESS=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage; exit 2 ;;
  esac
done

if [[ "$HEADLESS" != "1" && -z "${DISPLAY:-}" ]]; then
  echo "DISPLAY is not set; starting Python services headless."
  HEADLESS=1
fi

STATE_DIR="$ROOT/.cura-health"
LOG_DIR="$STATE_DIR/logs"
PID_FILE="$STATE_DIR/pids"
mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  echo "Previous Cura Health run detected — stopping it first."
  "$ROOT/stop_all.sh" --quiet || true
fi

export CURA_HEALTH_HEADLESS="$HEADLESS"
: > "$PID_FILE"

launch() {
  local name="$1" log="$2"
  shift 2
  setsid "$@" >"$log" 2>&1 &
  local pid=$!
  printf '%s:%s\n' "$name" "$pid" >> "$PID_FILE"
  printf '  %-12s pid %-7s %s\n' "$name" "$pid" "${log#"$ROOT"/}"
}

wait_for_http() {
  local name="$1" url="$2" attempts="${3:-80}" i
  for ((i = 0; i < attempts; i++)); do
    if curl -fsS --max-time 1 "$url" >/dev/null 2>&1; then
      printf '  %-12s ready   %s\n' "$name" "$url"
      return 0
    fi
    sleep 0.5
  done
  echo "  $name did not become ready; see $LOG_DIR/$name.log" >&2
  return 1
}

fail() {
  echo
  echo "Startup failed. Recent logs:" >&2
  for log in "$LOG_DIR"/*.log; do
    [[ -f "$log" ]] || continue
    echo "--- ${log#"$ROOT"/} (tail) ---" >&2
    tail -n 15 "$log" >&2 || true
  done
  echo
  echo "Run ./stop_all.sh to clean up, then retry." >&2
  exit 1
}

echo "Cura Health — starting stack (headless=$HEADLESS)"

echo
echo "Python services"
if ! launch backend "$LOG_DIR/backend.log" \
  uv run --directory "$ROOT/3_central_backend" python main.py; then fail; fi
wait_for_http backend "http://127.0.0.1:8000/api/health" || fail

if ! launch edge "$LOG_DIR/edge.log" \
  uv run --directory "$ROOT/2_edge_agent" python main.py; then fail; fi
wait_for_http edge "http://127.0.0.1:8001/api/health" || fail

if ! launch generator "$LOG_DIR/generator.log" \
  uv run --directory "$ROOT/1_synthetic_generator" python main.py; then fail; fi
wait_for_http generator "http://127.0.0.1:8002/api/health" || fail

echo
echo "Web dashboards"
if ! launch nurse "$LOG_DIR/nurse.log" \
  bun --cwd="$ROOT/4_nurse_dashboard" run dev; then fail; fi
wait_for_http nurse "http://127.0.0.1:3000" 160 || fail

echo
echo "Cura Health is live"
echo "  Nursing station   http://localhost:3000"
echo "  Doctor mobile     Expo app (run ./scripts/start_doctor_mobile.sh)"
echo "  Central hub       http://localhost:8000/docs"
echo "  Edge agent        http://localhost:8001/docs"
echo "  Generator         http://localhost:8002/docs"
if [[ "$HEADLESS" == "1" ]]; then
  echo "  GUI             disabled (headless)"
else
  echo "  GUI               Tkinter consoles open at the left and right of the desktop"
fi
echo
echo "Demo: click “Run Demo” on the nurse dashboard, verify the Room-101 SBAR,"
echo "then accept the case on a doctor phone and switch roster perspectives."
echo
echo "Stop everything with ./stop_all.sh"
