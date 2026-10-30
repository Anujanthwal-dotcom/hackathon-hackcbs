#!/usr/bin/env bash
# Forward ports to an Android device over USB via ADB reverse.
# This gives the mobile app 100% offline access to the central hub without relying on hackathon Wi-Fi!

set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/Android/Sdk/platform-tools:$PATH"

ADB_BIN="$(which adb 2>/dev/null || echo "$HOME/Android/Sdk/platform-tools/adb")"

if [[ ! -x "$ADB_BIN" ]]; then
  echo "Error: adb not found. Please install Android platform-tools or add it to PATH." >&2
  exit 1
fi

echo "Checking connected ADB devices..."
DEVICES="$("$ADB_BIN" devices | awk 'NR>1 && $2=="device" {print $1}')"

if [[ -z "$DEVICES" ]]; then
  echo "No authorized Android device found via USB."
  echo "Please check:"
  echo "  1. Phone is plugged in via USB"
  echo "  2. Developer Options -> USB Debugging is ON"
  echo "  3. Accept the 'Allow USB debugging' prompt on the phone"
  exit 1
fi

echo "Connected device(s):"
echo "$DEVICES"

echo
echo "Reversing ports over USB..."
# Port 8000: Central backend HTTP & WebSocket
"$ADB_BIN" reverse tcp:8000 tcp:8000
# Port 8081: Expo Metro Bundler
"$ADB_BIN" reverse tcp:8081 tcp:8081

echo
echo "✓ USB port forwarding active:"
echo "  Phone -> http://localhost:8000 (Central Hub API & WebSocket)"
echo "  Phone -> http://localhost:8081 (Expo Bundler)"
echo
echo "You can now connect the Doctor App to 'http://localhost:8000' completely offline!"
