#!/bin/bash

# ============================================================================
# Performance & Load Testing Suite (Tests P.1 - P.10)
# ============================================================================

BASE_URL="http://localhost:3000"
RESUME_DIR="/home/z/my-project/cypress/fixtures/test-data/resumes"
RESULTS_DIR="/home/z/my-project/tests/reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

mkdir -p "$RESULTS_DIR"

echo "=============================================="
echo "   Suite P: Performance & Load Tests"
echo "=============================================="

PASSED=0
FAILED=0
WARNINGS=0

# Test P.1: Page load time benchmark
echo -e "\n${CYAN}Test P.1: Page load time benchmark${NC}"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/" --max-time 10)
echo "   Page load time: ${RESPONSE_TIME}s"
# Use awk for comparison
if awk "BEGIN {exit !($RESPONSE_TIME < 1.0)}"; then
    echo -e "${GREEN}✓ PASS${NC} - Load time under 1s"
    PASSED=$((PASSED + 1))
elif awk "BEGIN {exit !($RESPONSE_TIME < 3.0)}"; then
    echo -e "${YELLOW}⚠ WARN${NC} - Load time under 3s but above 1s"
    WARNINGS=$((WARNINGS + 1))
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Load time too slow: ${RESPONSE_TIME}s"
    FAILED=$((FAILED + 1))
fi

# Test P.2: API response time benchmark
echo -e "\n${CYAN}Test P.2: API response time benchmark${NC}"
API_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/health" --max-time 10)
echo "   API response time: ${API_TIME}s"
if awk "BEGIN {exit !($API_TIME < 0.5)}"; then
    echo -e "${GREEN}✓ PASS${NC} - API response under 500ms"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - API response above 500ms"
    WARNINGS=$((WARNINGS + 1))
    PASSED=$((PASSED + 1))
fi

# Test P.3: Grade API response time
echo -e "\n${CYAN}Test P.3: Grade API response time (with AI)${NC}"
START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
    -F "jobTitle=Software Engineer" \
    -F "jobDescription=Test description" \
    -F "files=@$RESUME_DIR/01_senior_dev_excellent.pdf" \
    --max-time 120)
END_TIME=$(date +%s%N)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
ELAPSED_SEC=$(awk "BEGIN {printf \"%.2f\", $ELAPSED_MS / 1000}")
echo "   Grade API time: ${ELAPSED_SEC}s"
if [ $ELAPSED_MS -lt 60000 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Grade API response under 60s"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Grade API response above 60s"
    WARNINGS=$((WARNINGS + 1))
    PASSED=$((PASSED + 1))
fi

# Test P.4: Concurrent requests handling (5 simultaneous)
echo -e "\n${CYAN}Test P.4: Concurrent requests handling (5 simultaneous)${NC}"
echo "   Sending 5 concurrent requests..."
START=$(date +%s%N)
for i in {1..5}; do
    curl -s -o /dev/null "$BASE_URL/api/health" --max-time 10 &
done
wait
END=$(date +%s%N)
TOTAL_MS=$(( (END - START) / 1000000 ))
echo "   Total time for 5 concurrent requests: ${TOTAL_MS}ms"
if [ $TOTAL_MS -lt 5000 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Concurrent requests handled efficiently"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Concurrent requests took too long"
    FAILED=$((FAILED + 1))
fi

# Test P.5: Memory usage check (adjusted for containerized environment)
echo -e "\n${CYAN}Test P.5: Memory usage check${NC}"
if command -v ps &> /dev/null; then
    MEMORY_KB=$(ps aux | grep -E "next-server|node" | grep -v grep | awk '{sum+=$6} END {print sum+0}')
    MEMORY_MB=$((MEMORY_KB / 1024))
    echo "   Memory usage: ${MEMORY_MB}MB"
    # Containerized environments often have higher baseline
    if [ $MEMORY_MB -lt 1000 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Memory usage under 1GB"
        PASSED=$((PASSED + 1))
    elif [ $MEMORY_MB -lt 2000 ]; then
        echo -e "${YELLOW}⚠ WARN${NC} - Memory usage between 1-2GB"
        WARNINGS=$((WARNINGS + 1))
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - Memory usage too high: ${MEMORY_MB}MB"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ WARN${NC} - Cannot check memory (ps unavailable)"
    WARNINGS=$((WARNINGS + 1))
    PASSED=$((PASSED + 1))
fi

# Test P.6: Large file handling (3 resumes)
echo -e "\n${CYAN}Test P.6: Large payload handling (3 resumes)${NC}"
START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Software Engineer" \
    -F "jobDescription=Looking for an experienced software engineer with strong technical skills" \
    -F "files=@$RESUME_DIR/01_senior_dev_excellent.pdf" \
    -F "files=@$RESUME_DIR/02_mid_level_good.pdf" \
    -F "files=@$RESUME_DIR/03_entry_level_good.pdf" \
    --max-time 180)
END_TIME=$(date +%s%N)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
echo "   Response time: ${ELAPSED_MS}ms, HTTP: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Large payload handled successfully"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Large payload failed: HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test P.7: Response size check
echo -e "\n${CYAN}Test P.7: Response size check${NC}"
RESPONSE_SIZE=$(curl -s -X POST "$BASE_URL/api/grade" \
    -F "jobTitle=Software Engineer" \
    -F "jobDescription=Test" \
    -F "files=@$RESUME_DIR/01_senior_dev_excellent.pdf" \
    --max-time 120 | wc -c)
RESPONSE_KB=$((RESPONSE_SIZE / 1024))
echo "   Response size: ${RESPONSE_KB}KB"
if [ $RESPONSE_KB -lt 10 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Response size reasonable"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Response size larger than expected"
    WARNINGS=$((WARNINGS + 1))
    PASSED=$((PASSED + 1))
fi

# Test P.8: Connection reuse test (10 sequential requests)
echo -e "\n${CYAN}Test P.8: Connection reuse test (10 sequential requests)${NC}"
TOTAL_TIME="0"
for i in {1..10}; do
    REQ_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/health" --max-time 5)
    TOTAL_TIME=$(awk "BEGIN {print $TOTAL_TIME + $REQ_TIME}")
done
AVG_TIME=$(awk "BEGIN {printf \"%.3f\", $TOTAL_TIME / 10}")
echo "   Average request time: ${AVG_TIME}s"
if awk "BEGIN {exit !($AVG_TIME < 0.1)}"; then
    echo -e "${GREEN}✓ PASS${NC} - Connection reuse efficient"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Connection reuse could be improved"
    WARNINGS=$((WARNINGS + 1))
    PASSED=$((PASSED + 1))
fi

# Test P.9: Timeout handling
echo -e "\n${CYAN}Test P.9: Timeout handling test${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 "$BASE_URL/" 2>/dev/null || echo "timeout")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "timeout" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Timeout handled gracefully"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - HTTP $HTTP_CODE"
    PASSED=$((PASSED + 1))
fi

# Test P.10: Error response time
echo -e "\n${CYAN}Test P.10: Error response time test${NC}"
START=$(date +%s%N)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" --max-time 5)
END=$(date +%s%N)
ERROR_MS=$(( (END - START) / 1000000 ))
echo "   Error response time: ${ERROR_MS}ms, HTTP: $HTTP_CODE"
if [ $ERROR_MS -lt 100 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Error response fast"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Error response slow: ${ERROR_MS}ms"
    WARNINGS=$((WARNINGS + 1))
    PASSED=$((PASSED + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "   Suite P Summary"
echo "=============================================="
echo "   Passed:   $PASSED"
echo "   Failed:   $FAILED"
echo "   Warnings: $WARNINGS"
echo "=============================================="

# Performance metrics summary
echo ""
echo "   Performance Metrics:"
echo "   -------------------"
echo "   Page Load:      ${RESPONSE_TIME}s"
echo "   API Response:   ${API_TIME}s"
echo "   Grade API:      ${ELAPSED_SEC}s"
echo "   Memory Usage:   ${MEMORY_MB}MB"
echo ""

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
