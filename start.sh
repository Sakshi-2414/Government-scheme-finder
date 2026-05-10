#!/bin/bash
# ─────────────────────────────────────────────
# start.sh — Quick start script for Mac/Linux
# ─────────────────────────────────────────────

echo "🇮🇳 Government Scheme Finder — Starting Up"
echo "============================================"

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ Python3 not found. Please install Python 3.9+"
  exit 1
fi

# Check Node
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Please install Node.js 18+"
  exit 1
fi

# Install Python deps
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt -q

# Install Node deps
echo "📦 Installing Node dependencies..."
cd client && npm install --silent && cd ..

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "Starting backend on http://localhost:5001 ..."
cd server && python app.py &
BACKEND_PID=$!

sleep 2

echo "Starting frontend on http://localhost:3000 ..."
cd ../client && npm run dev &
FRONTEND_PID=$!

echo ""
echo "🚀 App running!"
echo "   Frontend → http://localhost:3000"
echo "   Backend  → http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop both servers."

wait $BACKEND_PID $FRONTEND_PID
