#!/bin/bash
# OpenClaw Poker API Test Script
# Usage: ./scripts/test-api.sh [CONVEX_SITE_URL]
# Example: ./scripts/test-api.sh https://happy-animal-123.convex.site

set -e

BASE_URL="${1:-http://localhost:3001}"
echo "🦞🃏 OpenClaw Poker API Tests"
echo "=============================="
echo "Base URL: $BASE_URL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

# ============================================
# Test 1: Public Leaderboard (no auth)
# ============================================
echo "Test 1: Public Leaderboard"
LEADERBOARD=$(curl -s "$BASE_URL/api/v1/leaderboard")
if echo "$LEADERBOARD" | grep -q '"success":true'; then
    pass "Leaderboard endpoint works"
else
    fail "Leaderboard failed: $LEADERBOARD"
fi

# ============================================
# Test 2: Register Bot 1
# ============================================
echo ""
echo "Test 2: Register Bot 1 (AlphaBot)"
BOT1_RESULT=$(curl -s -X POST "$BASE_URL/api/v1/agents/register" \
    -H "Content-Type: application/json" \
    -d '{"name": "AlphaBot", "description": "Test bot 1"}')

if echo "$BOT1_RESULT" | grep -q '"success":true'; then
    BOT1_KEY=$(echo "$BOT1_RESULT" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
    BOT1_ID=$(echo "$BOT1_RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    pass "Registered AlphaBot"
    info "API Key: ${BOT1_KEY:0:20}..."
else
    fail "Registration failed: $BOT1_RESULT"
fi

# ============================================
# Test 3: Register Bot 2
# ============================================
echo ""
echo "Test 3: Register Bot 2 (BetaBot)"
BOT2_RESULT=$(curl -s -X POST "$BASE_URL/api/v1/agents/register" \
    -H "Content-Type: application/json" \
    -d '{"name": "BetaBot", "description": "Test bot 2"}')

if echo "$BOT2_RESULT" | grep -q '"success":true'; then
    BOT2_KEY=$(echo "$BOT2_RESULT" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
    BOT2_ID=$(echo "$BOT2_RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    pass "Registered BetaBot"
    info "API Key: ${BOT2_KEY:0:20}..."
else
    fail "Registration failed: $BOT2_RESULT"
fi

# ============================================
# Test 4: Get Profile (authenticated)
# ============================================
echo ""
echo "Test 4: Get Bot Profile"
PROFILE=$(curl -s "$BASE_URL/api/v1/agents/me" \
    -H "Authorization: Bearer $BOT1_KEY")

if echo "$PROFILE" | grep -q '"name":"AlphaBot"'; then
    SHELLS=$(echo "$PROFILE" | grep -o '"shells":[0-9]*' | cut -d':' -f2)
    pass "Profile retrieved - Shells: $SHELLS"
else
    fail "Profile failed: $PROFILE"
fi

# ============================================
# Test 5: List Tables
# ============================================
echo ""
echo "Test 5: List Tables"
TABLES=$(curl -s "$BASE_URL/api/v1/tables" \
    -H "Authorization: Bearer $BOT1_KEY")

if echo "$TABLES" | grep -q '"success":true'; then
    TABLE_COUNT=$(echo "$TABLES" | grep -o '"id"' | wc -l)
    pass "Listed tables - Count: $TABLE_COUNT"
    
    # Get first table ID
    TABLE_ID=$(echo "$TABLES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    info "Using table: $TABLE_ID"
else
    fail "List tables failed: $TABLES"
fi

if [ -z "$TABLE_ID" ]; then
    echo ""
    echo -e "${YELLOW}No tables found! Run: npx convex run init:seed${NC}"
    exit 0
fi

# ============================================
# Test 6: Bot 1 Joins Table
# ============================================
echo ""
echo "Test 6: AlphaBot joins table"
JOIN1=$(curl -s -X POST "$BASE_URL/api/v1/tables/$TABLE_ID/join" \
    -H "Authorization: Bearer $BOT1_KEY" \
    -H "Content-Type: application/json" \
    -d '{"buyIn": 50}')

if echo "$JOIN1" | grep -q '"success":true'; then
    SEAT1=$(echo "$JOIN1" | grep -o '"seatIndex":[0-9]*' | cut -d':' -f2)
    pass "AlphaBot joined at seat $SEAT1"
else
    fail "Join failed: $JOIN1"
fi

# ============================================
# Test 7: Bot 2 Joins Table
# ============================================
echo ""
echo "Test 7: BetaBot joins table"
JOIN2=$(curl -s -X POST "$BASE_URL/api/v1/tables/$TABLE_ID/join" \
    -H "Authorization: Bearer $BOT2_KEY" \
    -H "Content-Type: application/json" \
    -d '{"buyIn": 50}')

if echo "$JOIN2" | grep -q '"success":true'; then
    SEAT2=$(echo "$JOIN2" | grep -o '"seatIndex":[0-9]*' | cut -d':' -f2)
    pass "BetaBot joined at seat $SEAT2"
else
    fail "Join failed: $JOIN2"
fi

# ============================================
# Test 8: Get Table State
# ============================================
echo ""
echo "Test 8: Get Table State"
STATE=$(curl -s "$BASE_URL/api/v1/tables/$TABLE_ID/state" \
    -H "Authorization: Bearer $BOT1_KEY")

if echo "$STATE" | grep -q '"success":true'; then
    pass "Table state retrieved"
    PLAYER_COUNT=$(echo "$STATE" | grep -o '"name":"[A-Za-z]*Bot"' | wc -l)
    info "Players at table: $PLAYER_COUNT"
else
    fail "State failed: $STATE"
fi

# ============================================
# Test 9: Check for Actions
# ============================================
echo ""
echo "Test 9: Check for pending actions"
CHECK=$(curl -s "$BASE_URL/api/v1/check" \
    -H "Authorization: Bearer $BOT1_KEY")

if echo "$CHECK" | grep -q '"success":true'; then
    HAS_ACTION=$(echo "$CHECK" | grep -o '"hasPendingAction":[a-z]*' | cut -d':' -f2)
    pass "Check endpoint works - hasPendingAction: $HAS_ACTION"
else
    fail "Check failed: $CHECK"
fi

# ============================================
# Test 10: Leaderboard with bots
# ============================================
echo ""
echo "Test 10: Verify bots on leaderboard"
LEADERBOARD=$(curl -s "$BASE_URL/api/v1/leaderboard")
if echo "$LEADERBOARD" | grep -q '"AlphaBot"' && echo "$LEADERBOARD" | grep -q '"BetaBot"'; then
    pass "Both bots appear on leaderboard"
else
    fail "Bots not on leaderboard: $LEADERBOARD"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "=============================="
echo -e "${GREEN}All tests passed!${NC}"
echo ""
echo "Saved credentials for manual testing:"
echo "  AlphaBot API Key: $BOT1_KEY"
echo "  BetaBot API Key: $BOT2_KEY"
echo "  Table ID: $TABLE_ID"
echo ""
echo "Next: Start a hand in the Convex dashboard or add a mutation to start hands automatically"
