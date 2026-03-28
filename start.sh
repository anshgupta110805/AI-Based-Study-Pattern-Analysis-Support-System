#!/bin/bash
echo "========== NeuroStudy AI System =========="
echo "[1] Starting FastAPI Backend on Port 8000..."

# Detect Environment and activate
if [ -d "backend/.venv" ]; then
    source backend/.venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Ensure requirements are installed for the exact python binary we will use
python3 -m pip install -r backend/requirements.txt > /dev/null 2>&1

# Launch Backend in Background
export PYTHONPATH=$(pwd)
cd backend
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "[2] Starting Frontend Server on Port 3000..."
cd frontend
python3 -m http.server 3000 &
FRONTEND_PID=$!

echo "[3] Initializing System..."
sleep 2
open http://localhost:3000

echo "✅ System Online."
echo "Press Ctrl+C to shut down both servers."

# Trap Ctrl+C to stop both background jobs
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
