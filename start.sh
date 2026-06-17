#!/bin/bash

# Custom Costing Tool - Launch Script
# This script starts both the FastAPI backend and the Vite frontend.

echo "Stopping any existing processes..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "Starting Backend..."
cd backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "========================================="
echo "Application is starting!"
echo "Backend running on http://127.0.0.1:8000"
echo "Frontend should be available on http://localhost:5173"
echo "========================================="
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C (SIGINT) to kill both processes
trap "echo -e '\nShutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Keep the script running to hold the processes
wait
