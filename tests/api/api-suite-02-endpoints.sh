#!/bin/bash

# ============================================================================
# API Test Suite 2: Endpoint Validation Tests (Tests 2.1 - 2.6)
# ============================================================================

BASE_URL="http://localhost:3000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================================="
echo "   Suite 2: Endpoint Validation Tests"
echo "=============================================="

PASSED=0
FAILED=0

# Test 2.1: Grade API rejects empty request
echo -e "\n${CYAN}Test 2.1: Grade API rejects empty request${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" --max-time 5)
if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (correctly rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP 200 (should reject empty request)"
    FAILED=$((FAILED + 1))
fi

# Test 2.2: Grade API validates job title
echo -e "\n${CYAN}Test 2.2: Grade API validates job title${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobDescription=Test description" --max-time 5)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (missing job title rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE (expected 400/422)"
    FAILED=$((FAILED + 1))
fi

# Test 2.3: Grade API validates job description
echo -e "\n${CYAN}Test 2.3: Grade API validates job description${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Software Engineer" --max-time 5)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (missing job description rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE (expected 400/422)"
    FAILED=$((FAILED + 1))
fi

# Test 2.4: Grade API validates files required
echo -e "\n${CYAN}Test 2.4: Grade API validates files required${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Software Engineer" \
    -F "jobDescription=Test description" --max-time 5)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (no files rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE (expected 400/422)"
    FAILED=$((FAILED + 1))
fi

# Test 2.5: Grade API rejects GET requests
echo -e "\n${CYAN}Test 2.5: Grade API rejects GET requests${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/grade" --max-time 5)
if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (GET rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP 200 (should reject GET)"
    FAILED=$((FAILED + 1))
fi

# Test 2.6: Grade API rejects invalid JSON
echo -e "\n${CYAN}Test 2.6: Grade API rejects invalid JSON${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -H "Content-Type: application/json" \
    -d '{"invalid": "json"}' --max-time 5)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "500" ] || [ "$HTTP_CODE" = "415" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (invalid JSON rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "   Suite 2 Summary: $PASSED passed, $FAILED failed"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
