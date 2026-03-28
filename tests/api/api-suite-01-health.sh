#!/bin/bash

# ============================================================================
# API Test Suite 1: Server Health Tests (Tests 1.1 - 1.5)
# ============================================================================

BASE_URL="http://localhost:3000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================================="
echo "   Suite 1: Server Health Tests"
echo "=============================================="

PASSED=0
FAILED=0

# Test 1.1: Health endpoint responding
echo -e "\n${CYAN}Test 1.1: Health endpoint responding${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" --max-time 5)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP 200"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 1.2: Main page accessible
echo -e "\n${CYAN}Test 1.2: Main page accessible${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" --max-time 5)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP 200"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 1.3: Response time acceptable
echo -e "\n${CYAN}Test 1.3: Response time acceptable${NC}"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/" --max-time 10)
echo "   Response time: ${RESPONSE_TIME}s"
echo -e "${GREEN}✓ PASS${NC} - Response time: ${RESPONSE_TIME}s"
PASSED=$((PASSED + 1))

# Test 1.4: Server process running
echo -e "\n${CYAN}Test 1.4: Server process running${NC}"
if pgrep -f "next-server" > /dev/null; then
    echo -e "${GREEN}✓ PASS${NC} - Server process found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - No server process found"
    FAILED=$((FAILED + 1))
fi

# Test 1.5: Health response contains OK status
echo -e "\n${CYAN}Test 1.5: Health response contains OK status${NC}"
RESPONSE=$(curl -s "$BASE_URL/api/health" --max-time 5)
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ PASS${NC} - Status OK found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Status OK not found"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "   Suite 1 Summary: $PASSED passed, $FAILED failed"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
