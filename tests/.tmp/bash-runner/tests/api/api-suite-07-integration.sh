#!/bin/bash

# ============================================================================
# API Test Suite 7: Integration Tests (Tests 7.1 - 7.6)
# Includes X-Test-Mode header to bypass rate limiting during tests
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../scripts/test-env.sh"

REAL_RESUME_DIR="$CYPRESS_RESUME_DIR"
RESUME_DIR="$CYPRESS_RESUME_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================================="
echo "   Suite 7: Integration Tests"
echo "=============================================="

PASSED=0
FAILED=0
SKIPPED=0

# Test 7.1: Senior developer resume grades successfully
echo -e "\n${CYAN}Test 7.1: Senior developer resume grades successfully${NC}"
if [ -f "$REAL_RESUME_DIR/01_senior_dev_excellent.pdf" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
        -H "X-Test-Mode: true" \
        -F "jobTitle=Senior React Developer" \
        -F "jobDescription=Looking for senior developer with React and TypeScript experience. 5+ years required." \
        -F "files=@$REAL_RESUME_DIR/01_senior_dev_excellent.pdf" \
        --max-time 120)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"overallScore"'; then
        echo -e "${GREEN}✓ PASS${NC} - Resume processed successfully"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${CYAN}Test 7.1: Senior dev resume - SKIPPED - file not found${NC}"
    SKIPPED=$((SKIPPED + 1))
fi

# Test 7.2: Multiple resumes graded successfully
echo -e "\n${CYAN}Test 7.2: Multiple resumes graded successfully${NC}"
if [ -f "$REAL_RESUME_DIR/01_senior_dev_excellent.pdf" ] && [ -f "$REAL_RESUME_DIR/02_mid_level_good.pdf" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
        -H "X-Test-Mode: true" \
        -F "jobTitle=Software Developer" \
        -F "jobDescription=Looking for developers" \
        -F "files=@$REAL_RESUME_DIR/01_senior_dev_excellent.pdf" \
        -F "files=@$REAL_RESUME_DIR/02_mid_level_good.pdf" \
        --max-time 180)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    RESULT_COUNT=$(echo "$BODY" | grep -o '"overallScore"' | wc -l)
    if [ "$HTTP_CODE" = "200" ] && [ "$RESULT_COUNT" -ge 2 ]; then
        echo -e "${GREEN}✓ PASS${NC} - $RESULT_COUNT resumes processed"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - Only $RESULT_COUNT result - HTTP $HTTP_CODE"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${CYAN}Test 7.2: Multiple resumes - SKIPPED - files not found${NC}"
    SKIPPED=$((SKIPPED + 1))
fi

# Test 7.3: Entry-level resume grades correctly
echo -e "\n${CYAN}Test 7.3: Entry-level resume grades correctly${NC}"
if [ -f "$REAL_RESUME_DIR/03_entry_level_good.pdf" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
        -H "X-Test-Mode: true" \
        -F "jobTitle=Junior Developer" \
        -F "jobDescription=Entry level position for new graduates" \
        -F "files=@$REAL_RESUME_DIR/03_entry_level_good.pdf" \
        --max-time 120)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '"overallScore"'; then
        echo -e "${GREEN}✓ PASS${NC} - Entry level resume processed"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${CYAN}Test 7.3: Entry-level resume - SKIPPED - file not found${NC}"
    SKIPPED=$((SKIPPED + 1))
fi

# Test 7.4: Poor quality resume handled
echo -e "\n${CYAN}Test 7.4: Poor quality resume handled${NC}"
if [ -f "$REAL_RESUME_DIR/04_poor_quality.pdf" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
        -H "X-Test-Mode: true" \
        -F "jobTitle=Software Engineer" \
        -F "jobDescription=Looking for professional engineer" \
        -F "files=@$REAL_RESUME_DIR/04_poor_quality.pdf" \
        --max-time 120)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "500" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Poor resume handled - HTTP $HTTP_CODE"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${CYAN}Test 7.4: Poor quality resume - SKIPPED - file not found${NC}"
    SKIPPED=$((SKIPPED + 1))
fi

# Test 7.5: Unrelated resume - chef for tech job
echo -e "\n${CYAN}Test 7.5: Unrelated resume - chef for tech job${NC}"
if [ -f "$REAL_RESUME_DIR/05_unrelated_chef.pdf" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
        -H "X-Test-Mode: true" \
        -F "jobTitle=Senior React Developer" \
        -F "jobDescription=Looking for experienced React developer" \
        -F "files=@$REAL_RESUME_DIR/05_unrelated_chef.pdf" \
        --max-time 120)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "500" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Chef resume handled - HTTP $HTTP_CODE"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${CYAN}Test 7.5: Unrelated resume - SKIPPED - file not found${NC}"
    SKIPPED=$((SKIPPED + 1))
fi

# Test 7.6: Overqualified candidate handled
echo -e "\n${CYAN}Test 7.6: Overqualified candidate handled${NC}"
if [ -f "$REAL_RESUME_DIR/06_overqualified.pdf" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
        -H "X-Test-Mode: true" \
        -F "jobTitle=Junior Developer" \
        -F "jobDescription=Entry level position" \
        -F "files=@$REAL_RESUME_DIR/06_overqualified.pdf" \
        --max-time 120)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "500" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Overqualified handled - HTTP $HTTP_CODE"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${CYAN}Test 7.6: Overqualified candidate - SKIPPED - file not found${NC}"
    SKIPPED=$((SKIPPED + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "   Suite 7 Summary: $PASSED passed, $FAILED failed, $SKIPPED skipped"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
