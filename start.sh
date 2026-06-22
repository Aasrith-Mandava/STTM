#!/usr/bin/env bash
#
# UST STTM — single-command local launcher (standalone, no GCP/Vertex).
# Starts the FastAPI backend (:8001) and the Vite frontend (:5173) together.
#
#   ./start.sh
#
# Ctrl+C stops both. Override ports with BACKEND_PORT / FRONTEND_PORT env vars.

set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/datamap_backend"
FRONTEND_DIR="$ROOT_DIR/datamap_frontend"
BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

BACKEND_PID=""
FRONTEND_PID=""

log() { printf "\033[1;36m[start]\033[0m %s\n" "$*"; }

cleanup() {
  echo ""
  log "Shutting down..."
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  pkill -f "uvicorn api.main:app" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# Free the backend port if something is already bound to it.
pkill -f "uvicorn api.main:app" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
cd "$BACKEND_DIR"

if [ ! -d .venv ]; then
  log "Creating backend virtualenv (.venv)..."
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.12 .venv
  else
    "$(command -v python3.12 || command -v python3)" -m venv .venv
  fi
fi

# shellcheck disable=SC1091
source .venv/bin/activate

# Install/refresh deps only when something is missing.
if ! python -c "import uvicorn, fastapi, litellm, sqlite_vec, google.genai" >/dev/null 2>&1; then
  log "Installing backend dependencies..."
  if command -v uv >/dev/null 2>&1; then
    uv pip install -r requirements.txt
  else
    pip install -r requirements.txt
  fi
fi
# ydata-profiling needs pkg_resources (setuptools <81 still ships it).
python -c "import pkg_resources" >/dev/null 2>&1 || {
  log "Installing setuptools (<81) for pkg_resources..."
  if command -v uv >/dev/null 2>&1; then uv pip install "setuptools<81"; else pip install "setuptools<81"; fi
}

# Ensure a .env exists (LLM keys live here).
if [ ! -f .env ]; then
  [ -f .env.example ] && cp .env.example .env || printf "LLM_PROVIDER=gemini\nGOOGLE_API_KEY=\nGOOGLE_GENAI_USE_VERTEXAI=FALSE\n" > .env
  log "Created datamap_backend/.env — add GOOGLE_API_KEY or GROQ_API_KEY for LLM features."
fi

log "Starting backend on http://localhost:$BACKEND_PORT ..."
uvicorn api.main:app --host 127.0.0.1 --port "$BACKEND_PORT" &
BACKEND_PID=$!

# Wait for the backend to become healthy (best effort).
log "Waiting for backend health..."
for _ in $(seq 1 40); do
  if curl -sf -m 2 "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
    log "Backend is healthy."
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    log "Backend process exited during startup. See output above."
    exit 1
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
cd "$FRONTEND_DIR"

if [ ! -d node_modules ]; then
  log "Installing frontend dependencies (npm install)..."
  npm install
fi

# Point the frontend at this backend (matches default if unchanged).
export VITE_REACT_API_BASE_URL="http://localhost:$BACKEND_PORT"

log "Starting frontend on http://localhost:$FRONTEND_PORT ..."
npm run dev -- --port "$FRONTEND_PORT" --strictPort &
FRONTEND_PID=$!

echo ""
log "UST STTM is running:"
log "  Frontend : http://localhost:$FRONTEND_PORT"
log "  Backend  : http://localhost:$BACKEND_PORT  (health: /health)"
log "Press Ctrl+C to stop both."
echo ""

# Keep running until either process exits or Ctrl+C (portable; bash 3.2-safe).
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
  sleep 2
done
cleanup
