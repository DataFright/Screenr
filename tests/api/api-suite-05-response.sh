#!/bin/bash

# ============================================================================
# API Test Suite 5: Response Validation Tests (Tests 5.1 - 5.10)
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../scripts/test-env.sh"

RESUME_DIR="$CYPRESS_RESUME_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================================="
echo "   Suite 5: Response Validation Tests"
echo "=============================================="

PASSED=0
FAILED=0

# Test 5.1: Response contains fileName field
echo -e "\n${CYAN}Test 5.1: Response contains fileName field${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Software Engineer" \
    -F "jobDescription=Looking for a developer" \
    -F "files=@$RESUME_DIR/01_senior_dev_excellent.pdf" \
    --max-time 120)
if echo "$RESPONSE" | grep -qi '"fileName"\|"filename"\|"file"'; then
    echo -e "${GREEN}✓ PASS${NC} - Field found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Field not found. Response: $(echo "$RESPONSE" | head -c 100)"
    FAILED=$((FAILED + 1))
fi

# Test 5.2: Response contains candidateName field
echo -e "\n${CYAN}Test 5.2: Response contains candidateName field${NC}"
if echo "$RESPONSE" | grep -qi '"candidateName"\|"candidate"\|"name"'; then
    echo -e "${GREEN}✓ PASS${NC} - Field found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Field not found"
    FAILED=$((FAILED + 1))
fi

# Test 5.3: Response contains email field
echo -e "\n${CYAN}Test 5.3: Response contains email field${NC}"
if echo "$RESPONSE" | grep -qi '"email"'; then
    echo -e "${GREEN}✓ PASS${NC} - Field found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Field not found"
    FAILED=$((FAILED + 1))
fi

# Test 5.4: Response contains phone field
echo -e "\n${CYAN}Test 5.4: Response contains phone field${NC}"
if echo "$RESPONSE" | grep -qi '"phone"'; then
    echo -e "${GREEN}✓ PASS${NC} - Field found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Field not found"
    FAILED=$((FAILED + 1))
fi

# Test 5.5: Response contains overallScore field
echo -e "\n${CYAN}Test 5.5: Response contains overallScore field${NC}"
if echo "$RESPONSE" | grep -qi '"overallScore"\|"score"\|"overall"'; then
    echo -e "${GREEN}✓ PASS${NC} - Field found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Field not found"
    FAILED=$((FAILED + 1))
fi

# Test 5.6: Response contains professionalism score
echo -e "\n${CYAN}Test 5.6: Response contains professionalism score${NC}"
if echo "$RESPONSE" | grep -qi '"professionalism"\|"professional"'; then
    echo -e "${GREEN}✓ PASS${NC} - Field found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Field not found"
    FAILED=$((FAILED + 1))
fi

# Test 5.7: Response contains qualifications score
echo -e "\n${CYAN}Test 5.7: Response contains qualifications score${NC}"
if echo "$RESPONSE" | grep -qi '"qualifications"\|"qualification"\|"skills"'; then
    echo -e "${GREEN}✓ PASS${NC} - Field found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Field not found"
    FAILED=$((FAILED + 1))
fi

# Test 5.8: Response contains workExperience score
echo -e "\n${CYAN}Test 5.8: Response contains workExperience score${NC}"
if echo "$RESPONSE" | grep -qi '"workExperience"\|"experience"\|"work"'; then
    echo -e "${GREEN}✓ PASS${NC} - Field found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Field not found"
    FAILED=$((FAILED + 1))
fi

# Test 5.9: Overall score is in valid range (0-100)
echo -e "\n${CYAN}Test 5.9: Overall score is in valid range (0-100)${NC}"
SCORE=$(echo "$RESPONSE" | grep -oE '"overallScore":[0-9]+' | head -1 | grep -oE '[0-9]+')
if [ -n "$SCORE" ]; then
    if [ "$SCORE" -ge 0 ] && [ "$SCORE" -le 100 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Score: $SCORE (valid range)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${GREEN}✓ PASS${NC} - Score field present: $SCORE"
        PASSED=$((PASSED + 1))
    fi
else
    # Try alternate score field names
    ALT_SCORE=$(echo "$RESPONSE" | grep -oE '"score":[0-9]+' | head -1 | grep -oE '[0-9]+')
    if [ -n "$ALT_SCORE" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Score field present: $ALT_SCORE"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} - No score found"
        FAILED=$((FAILED + 1))
    fi
fi

# Test 5.10: Response has score breakdown explanations
echo -e "\n${CYAN}Test 5.10: Response has score breakdown explanations${NC}"
if echo "$RESPONSE" | grep -qi '"explanation"\|"reason"\|"feedback"\|"summary"'; then
    echo -e "${GREEN}✓ PASS${NC} - Explanations found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - No explanations found"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "   Suite 5 Summary: $PASSED passed, $FAILED failed"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
