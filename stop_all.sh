#!/usr/bin/env bash
# Stop every service started by start_all.sh.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT/.cura-health/pids"
QUIET=0

for arg in "$@"; do
  case "$arg" in
    --quiet) QUIET=1 ;;
    -h|--help)
      echo "Usage: ./stop_all.sh [--quiet]"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

log() {
  if [[ "$QUIET" != "1" ]]; then
    echo "$@"
  fi
}

signal_tree() {
  local pid="$1" signal="$2"
  # start_all.sh launches each service in its own session, so the negative
  # PID targets the whole group (including Next.js children and Tk windows).
  kill "-$signal" -- "-$pid" 2>/dev/null || kill "-$signal" "$pid" 2>/dev/null || true
}

declare -a NAMES=()
declare -a PIDS=()

if [[ -f "$PID_FILE" ]]; then
  while IFS=: read -r name pid; do
    [[ -z "${name:-}" || -z "${pid:-}" ]] && continue
    NAMES+=("$name")
    PIDS+=("$pid")
  done < "$PID_FILE"
fi

if [[ ${#PIDS[@]} -eq 0 ]]; then
  log "No Cura Health runtime state found."
else
  log "Stopping Cura Health…"
  for i in "${!PIDS[@]}"; do
    pid="${PIDS[$i]}"
    if kill -0 "$pid" 2>/dev/null; then
      log "  stopping ${NAMES[$i]} (pid $pid)"
      signal_tree "$pid" TERM
    fi
  done

  # Give uvicorn and Next.js a moment for a graceful shutdown.
  deadline=$((SECONDS + 6))
  while ((SECONDS < deadline)); do
    alive=0
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        alive=1
        break
      fi
    done
    ((alive == 0)) && break
    sleep 0.25
  done

  for i in "${!PIDS[@]}"; do
    pid="${PIDS[$i]}"
    if kill -0 "$pid" 2>/dev/null; then
      log "  forcing ${NAMES[$i]} (pid $pid)"
      signal_tree "$pid" KILL
    fi
  done

  rm -f "$PID_FILE"
  log "Stopped."
fi

remaining=0
for port in 8000 8001 8002 3000 3001; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    remaining=1
    log "  port $port is still in use by pid(s): $(echo "$pids" | tr '\n' ' ')"
  fi
done

if [[ "$remaining" == "1" ]]; then
  log "Some ports are still occupied. Stop those processes manually if they are Cura Health leftovers."
elif [[ -f "$PID_FILE" ]]; then
  log "PID file remains at ${PID_FILE#"$ROOT"/}."
fi
