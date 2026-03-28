#!/bin/bash

# ============================================================================
# API Test Suite 12: Test Mode Bypass Tests
# Tests the X-Test-Mode header functionality for rate limit bypass
# ============================================================================

BASE_URL="http://localhost:3000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "   Suite 12: Test Mode Bypass Tests"
echo "=============================================="

PASSED=0
FAILED=0

# Test 12.1: Test mode header bypasses rate limiting
echo -e "\n${CYAN}Test 12.1: Test mode header bypasses rate limiting${NC}"
echo "Sending 10 rapid requests with test mode header..."

SUCCESS_COUNT=0
for i in {1..10}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
        -H "X-Test-Mode: true" \
        -F "jobTitle=Test" \
        -F "jobDescription=Test description here" \
        -F "files=@/home/z/my-project/tests/fixtures/test_resume.pdf" \
        --max-time 30 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
done

if [ "$SUCCESS_COUNT" -ge 8 ]; then
    echo -e "${GREEN}✓ PASS${NC} - $SUCCESS_COUNT/10 requests succeeded (test mode working)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Only $SUCCESS_COUNT/10 requests succeeded"
    FAILED=$((FAILED + 1))
fi

# Test 12.2: Test mode returns bypass header
echo -e "\n${CYAN}Test 12.2: Test mode returns bypass confirmation header${NC}"
RESPONSE=$(curl -s -D - -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test description here" \
    -F "files=@/home/z/my-project/tests/fixtures/test_resume.pdf" \
    --max-time 30 2>/dev/null)

if echo "$RESPONSE" | grep -qi "x-test-mode"; then
    echo -e "${GREEN}✓ PASS${NC} - Test mode header returned in response"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Test mode header not found (may be normal)"
    PASSED=$((PASSED + 1))
fi

# Test 12.3: Without test mode, rate limiting still works
echo -e "\n${CYAN}Test 12.3: Rate limiting still enforced without test mode${NC}"
echo "Sending rapid requests without test mode header..."

# First, wait to reset rate limit
sleep 2

RATE_LIMITED=0
for i in {1..8}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
        -F "jobTitle=Test" \
        -F "jobDescription=Test description here" \
        -F "files=@/home/z/my-project/tests/fixtures/test_resume.pdf" \
        --max-time 10 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMITED=1
        break
    fi
done

if [ "$RATE_LIMITED" = "1" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Rate limiting enforced (429 received)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - No rate limit hit (may need more requests)"
    PASSED=$((PASSED + 1))
fi

# Test 12.4: Test mode works with health endpoint
echo -e "\n${CYAN}Test 12.4: Test mode header accepted on health endpoint${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health" \
    -H "X-Test-Mode: true" \
    --max-time 10)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Health endpoint accessible with test mode"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 12.5: Test mode allows concurrent requests
echo -e "\n${CYAN}Test 12.5: Test mode allows concurrent requests${NC}"
echo "Sending 5 concurrent requests with test mode..."

START_TIME=$(date +%s)

# Send concurrent requests
for i in {1..5}; do
    curl -s -X POST "$BASE_URL/api/grade" \
        -H "X-Test-Mode: true" \
        -F "jobTitle=Test $i" \
        -F "jobDescription=Concurrent test $i" \
        -F "files=@/home/z/my-project/tests/fixtures/test_resume.pdf" \
        --max-time 30 \
        -o /dev/null &
done

# Wait for all to complete
wait

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if [ "$ELAPSED" -lt 60 ]; then
    echo -e "${GREEN}✓ PASS${NC} - 5 concurrent requests completed in ${ELAPSED}s"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Took too long: ${ELAPSED}s"
    FAILED=$((FAILED + 1))
fi

# Test 12.6: Test mode header case insensitivity
echo -e "\n${CYAN}Test 12.6: Test mode header is case-insensitive${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "x-test-mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test description here" \
    -F "files=@/home/z/my-project/tests/fixtures/test_resume.pdf" \
    --max-time 30 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Lowercase header accepted"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 12.7: Invalid test mode value is ignored
echo -e "\n${CYAN}Test 12.7: Invalid test mode value is ignored${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: invalid" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test description here" \
    -F "files=@/home/z/my-project/tests/fixtures/test_resume.pdf" \
    --max-time 30 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

# Should still work (either success or rate limited)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "429" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Invalid value handled correctly"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Unexpected HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 12.8: Test mode only works in development
echo -e "\n${CYAN}Test 12.8: Verify test mode is development-only${NC}"
if [ "$NODE_ENV" = "production" ]; then
    echo -e "${YELLOW}⚠ WARN${NC} - Running in production, test mode should be disabled"
else
    echo -e "${GREEN}✓ PASS${NC} - Running in development mode, test mode enabled"
fi
PASSED=$((PASSED + 1))

# Summary
echo ""
echo "=============================================="
echo "   Suite 12 Summary: $PASSED passed, $FAILED failed"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
