#!/usr/bin/env bash
# Start the Expo React Native Metro bundler for Doctor Portal Mobile

set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.local/node/bin:$PATH"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/5_doctor_portal"

# Find LAN IP
LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || echo "localhost")"

echo "=========================================================="
echo " Starting Cura Health Doctor Portal Mobile (React Native) "
echo "=========================================================="
echo "Central Backend is expected at:"
echo "  - USB Reverse mode:    http://localhost:8000"
echo "  - Local Wi-Fi mode:    http://${LAN_IP}:8000"
echo "  - Android Emulator:    http://10.0.2.2:8000"
echo
echo "To connect phone via USB (Offline Mode):"
echo "  Run: ./scripts/connect_phone_usb.sh"
echo "=========================================================="
echo

bun run start
