#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")"
PYTHON_BIN="${LUX_PYTHON:-/home/vossapov/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3}"
if [ ! -x "$PYTHON_BIN" ]; then PYTHON_BIN=python3; fi
exec "$PYTHON_BIN" demo/server.py --host "${LUX_HOST:-0.0.0.0}" --port "${LUX_PORT:-8080}"
