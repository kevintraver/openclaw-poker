#!/bin/bash
#
# Production Bot Simulation Startup Script
# Starts 12 bots with info-level logging

cd "$(dirname "$0")"

# Kill any existing bot simulation
pkill -f "tsx index.ts" 2>/dev/null

# Start in background with nohup
nohup npm start > ../../bot-sim.log 2>&1 &

echo "🤖 Bot simulation started in background"
echo "📊 Monitor logs: tail -f bot-sim.log"
echo "⏹️  Stop: pkill -f 'tsx index.ts'"
