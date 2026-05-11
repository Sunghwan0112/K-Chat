#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

if [ ! -d "node_modules" ]; then
  echo "[K-Chat] node_modules not found. Running npm install..."
  npm install
fi

APP_URL="${KCHAT_URL:-http://localhost:3000}"
APP_PORT="${KCHAT_PORT:-3000}"

# Toggle behavior:
# - If running: stop server
# - If stopped: start server
if command -v curl >/dev/null 2>&1 && curl -fsS "${APP_URL}" >/dev/null 2>&1; then
  echo "[K-Chat] Server detected. Stopping..."
  if command -v pkill >/dev/null 2>&1; then
    pkill -f "${PROJECT_ROOT}/server.js" >/dev/null 2>&1 || true
    pkill -f "node server.js" >/dev/null 2>&1 || true
  fi
  sleep 1
  if command -v curl >/dev/null 2>&1 && curl -fsS "${APP_URL}" >/dev/null 2>&1; then
    echo "[K-Chat] Stop failed. Still running at ${APP_URL}"
    exit 1
  fi
  echo "[K-Chat] Stopped."
  exit 0
fi

# If a stale K-Chat server process is hanging, stop it first.
if command -v pkill >/dev/null 2>&1; then
  pkill -f "${PROJECT_ROOT}/server.js" >/dev/null 2>&1 || true
fi

# If port is occupied by another process, free it once (best effort).
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${APP_PORT}/tcp" >/dev/null 2>&1 || true
fi

echo "[K-Chat] Starting server..."
nohup npm start > /tmp/k-chat.log 2>&1 &
SERVER_PID=$!

sleep 2

# If startup failed because port is already in use, still open browser.
if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
  echo "[K-Chat] Server failed to start. Check /tmp/k-chat.log"
  exit 1
fi

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${APP_URL}" >/dev/null 2>&1 || true
fi

echo "[K-Chat] Running (PID: ${SERVER_PID}) at ${APP_URL}"
echo "[K-Chat] Logs: /tmp/k-chat.log"
