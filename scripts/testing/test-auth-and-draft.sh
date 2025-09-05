#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Testing Authentication and Draft Access"
echo "========================================"

API_URL="http://localhost:8080/api"
FRONTEND_URL="http://localhost:3000"
TEST_EMAIL="drafttest_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

echo -e "\n1. Registering new user..."
echo "   Email: $TEST_EMAIL"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"first_name\": \"Draft\",
    \"last_name\": \"Tester\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "error"; then
  echo -e "   ${RED}❌ Registration failed${NC}"
  echo "   Response: $REGISTER_RESPONSE"
  exit 1
fi

ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh_token', ''))" 2>/dev/null)

if [ -n "$ACCESS_TOKEN" ]; then
  echo -e "   ${GREEN}✅ Registration successful${NC}"
  echo "   Access Token: ${ACCESS_TOKEN:0:20}..."
else
  echo -e "   ${RED}❌ No access token received${NC}"
  exit 1
fi

echo -e "\n2. Testing protected endpoint with token..."
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/users/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PROFILE_RESPONSE" | grep -q "$TEST_EMAIL"; then
  echo -e "   ${GREEN}✅ Can access protected endpoints${NC}"
else
  echo -e "   ${RED}❌ Cannot access protected endpoints${NC}"
  echo "   Response: $PROFILE_RESPONSE"
fi

echo -e "\n3. Creating a draft session..."
DRAFT_RESPONSE=$(curl -s -X POST "$API_URL/draft/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "league_id": "test_league_1",
    "name": "Test Draft Session",
    "draft_type": "snake",
    "team_count": 10,
    "round_count": 15,
    "user_position": 1,
    "settings": {
      "timer_seconds": 90,
      "scoring_type": "PPR",
      "roster_slots": {
        "qb": 1,
        "rb": 2,
        "wr": 2,
        "te": 1,
        "flex": 1,
        "dst": 1,
        "k": 1,
        "bench": 6
      }
    }
  }')

echo "   Response: $DRAFT_RESPONSE"

SESSION_ID=$(echo "$DRAFT_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null)

if [ -n "$SESSION_ID" ]; then
  echo -e "   ${GREEN}✅ Draft session created${NC}"
  echo "   Session ID: $SESSION_ID"
else
  echo -e "   ${RED}❌ Failed to create draft session${NC}"
fi

echo -e "\n4. Listing user's draft sessions..."
SESSIONS_RESPONSE=$(curl -s -X GET "$API_URL/draft/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

SESSION_COUNT=$(echo "$SESSIONS_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('count', 0))" 2>/dev/null)
echo "   Found $SESSION_COUNT draft session(s)"

echo -e "\n5. Testing frontend access with cookies..."
# Note: Frontend expects cookies, not Authorization header
COOKIE_RESPONSE=$(curl -s -c - -X GET "$FRONTEND_URL/api/auth/verify" \
  -H "Cookie: access_token=$ACCESS_TOKEN; refresh_token=$REFRESH_TOKEN")

echo "   Cookie test response:"
echo "$COOKIE_RESPONSE" | grep -E "HTTP|Set-Cookie" || echo "   No cookie response"

echo -e "\n========================================"
echo "Summary:"
echo "- User registered: $TEST_EMAIL"
echo "- Access token: ${ACCESS_TOKEN:0:20}..."
if [ -n "$SESSION_ID" ]; then
  echo "- Draft session: $SESSION_ID"
  echo ""
  echo "To access the draft page in your browser:"
  echo "1. Open browser console (F12)"
  echo "2. Run: document.cookie = 'access_token=$ACCESS_TOKEN'"
  echo "3. Navigate to: $FRONTEND_URL/draft/$SESSION_ID"
else
  echo "- Draft session: Not created"
fi