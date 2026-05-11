#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUN_SCRIPT="${PROJECT_ROOT}/scripts/run-linux.sh"
BINARY_LAUNCHER_NAME="K-Chat-Launch"

chmod +x "${RUN_SCRIPT}"

if [ -d "${HOME}/Desktop" ]; then
  # Build a native launcher binary to avoid "open as text" behavior.
  if command -v gcc >/dev/null 2>&1; then
    TMP_C="$(mktemp /tmp/k-chat-launcher-XXXXXX.c)"
    cat > "${TMP_C}" <<EOF
#include <unistd.h>
int main(void) {
  execl("/usr/bin/env", "env", "bash", "-lc", "${RUN_SCRIPT}", (char *)0);
  return 1;
}
EOF
    gcc "${TMP_C}" -O2 -s -o "${HOME}/Desktop/${BINARY_LAUNCHER_NAME}" >/dev/null 2>&1 || true
    rm -f "${TMP_C}"
    [ -f "${HOME}/Desktop/${BINARY_LAUNCHER_NAME}" ] && chmod +x "${HOME}/Desktop/${BINARY_LAUNCHER_NAME}"
  fi
fi

echo "[K-Chat] Linux launcher installed."
if [ -d "${HOME}/Desktop" ]; then
  if [ -f "${HOME}/Desktop/${BINARY_LAUNCHER_NAME}" ]; then
    echo " - ${HOME}/Desktop/${BINARY_LAUNCHER_NAME}"
  fi
fi
