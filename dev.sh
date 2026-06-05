#!/bin/bash
# Local dev launcher — starts backend, frontend, and ngrok tunnel together.
# Run once after filling in backend/.env and frontend/.env.local

set -e

# Check .env is filled in
if grep -q "your-bot-token" backend/.env; then
  echo "❌ Fill in backend/.env before running dev.sh"
  exit 1
fi

echo "🍗 Starting Wingdings dev environment..."

# Start backend
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for backend to be up, then open ngrok tunnel
sleep 3
echo ""
echo "🌐 Opening ngrok tunnel on port 3000..."
ngrok http 3000 &
NGROK_PID=$!

echo ""
echo "✅ Services running:"
echo "   Backend  → http://localhost:3000"
echo "   Frontend → http://localhost:3001  (or check terminal for Next.js port)"
echo "   ngrok    → check http://localhost:4040 for the public URL"
echo ""
echo "📋 Copy the ngrok HTTPS URL and paste it into:"
echo "   Slack → Your App → Slash Commands → Request URL"
echo "   (append /slack/events  e.g. https://abc123.ngrok-free.app/slack/events)"
echo ""
echo "Press Ctrl+C to stop everything."

trap "kill $BACKEND_PID $FRONTEND_PID $NGROK_PID 2>/dev/null; exit" INT
wait
