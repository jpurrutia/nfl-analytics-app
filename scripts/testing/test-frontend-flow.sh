#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Testing Complete Frontend Flow"
echo "==============================="

FRONTEND_URL="http://localhost:3000"
API_URL="http://localhost:8080/api"
TEST_EMAIL="frontendtest_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

echo -e "\n1. Testing backend health..."
if curl -s -o /dev/null -w "%{http_code}" $API_URL/health | grep -q 404; then
  echo -e "   ${GREEN}✅ Backend is running${NC}"
else
  echo -e "   ${RED}❌ Backend not responding${NC}"
fi

echo -e "\n2. Testing frontend..."
if curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL | grep -q 200; then
  echo -e "   ${GREEN}✅ Frontend is running${NC}"
else
  echo -e "   ${RED}❌ Frontend not responding${NC}"
fi

echo -e "\n3. Registering new user via frontend API..."
REGISTER_RESPONSE=$(curl -s -X POST "$FRONTEND_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Test\",\"last_name\":\"User\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
  echo -e "   ${GREEN}✅ Registration successful${NC}"
  echo "   Email: $TEST_EMAIL"
else
  echo -e "   ${RED}❌ Registration failed${NC}"
  echo "   Response: $REGISTER_RESPONSE"
  exit 1
fi

echo -e "\n4. Testing login via frontend API..."
LOGIN_RESPONSE=$(curl -s -X POST "$FRONTEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo -e "   ${GREEN}✅ Login successful${NC}"
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)
else
  echo -e "   ${RED}❌ Login failed${NC}"
  echo "   Response: $LOGIN_RESPONSE"
fi

echo -e "\n5. Creating draft session..."
DRAFT_RESPONSE=$(curl -s -X POST "$API_URL/draft/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "league_id": "test_league",
    "name": "Test Draft Session",
    "draft_type": "snake",
    "team_count": 10,
    "round_count": 15,
    "user_position": 3,
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

if echo "$DRAFT_RESPONSE" | grep -q "\"id\""; then
  SESSION_ID=$(echo "$DRAFT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
  echo -e "   ${GREEN}✅ Draft session created${NC}"
  echo "   Session ID: $SESSION_ID"
else
  echo -e "   ${RED}❌ Failed to create draft session${NC}"
  echo "   Response: $DRAFT_RESPONSE"
fi

echo -e "\n==============================="
echo "Summary:"
echo "- Frontend: http://localhost:3000"
echo "- Login: $TEST_EMAIL / $TEST_PASSWORD"
if [ -n "$SESSION_ID" ]; then
  echo "- Draft URL: $FRONTEND_URL/draft/$SESSION_ID"
fi
echo ""
echo "To test in browser:"
echo "1. Go to http://localhost:3000/login"
echo "2. Login with the credentials above"
echo "3. You should be redirected to the dashboard"
if [ -n "$SESSION_ID" ]; then
  echo "4. Visit the draft URL to see your session"
fi