#!/usr/bin/env bash
# bootstrap.sh — toolBox unified init & update entry point
# This is a thin wrapper that delegates to bootstrap.mjs (Node.js, cross-platform).
#
# Usage:
#   New user:  git clone <repo> toolBox && cd toolBox && bash bootstrap.sh
#   Existing:  cd toolBox && git pull && bash bootstrap.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check Node.js availability
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed. Please install Node.js >= 18 first."
  echo "  macOS:   brew install node"
  echo "  Linux:   https://nodejs.org/"
  exit 1
fi

# Delegate to cross-platform Node.js bootstrap
exec node "$SCRIPT_DIR/bootstrap.mjs" "$@"
