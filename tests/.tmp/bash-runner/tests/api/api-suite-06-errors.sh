#!/bin/bash

# ============================================================================
# API Test Suite 6: Error Handling Tests (Tests 6.1 - 6.5)
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../scripts/test-env.sh"

TEST_DIR="$TEST_FIXTURES_DIR"
RESUME_DIR="$CYPRESS_RESUME_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================================="
echo "   Suite 6: Error Handling Tests"
echo "=============================================="

PASSED=0
FAILED=0

# Create test PDF
mkdir -p "$TEST_DIR"
cat > "$TEST_DIR/test_resume.pdf" << 'PDFEOF'
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 100 >>
stream
BT /F1 12 Tf 100 700 Td (Test Resume) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000418 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
500
%%EOF
PDFEOF

# Test 6.1: Special characters in job title accepted
echo -e "\n${CYAN}Test 6.1: Special characters in job title accepted${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Software Engineer (React/Node.js) - Senior!" \
    -F "jobDescription=Test description" \
    -F "files=@$RESUME_DIR/01_senior_dev_excellent.pdf" \
    --max-time 120)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (special chars accepted)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 6.2: Long job description handled
echo -e "\n${CYAN}Test 6.2: Long job description handled${NC}"
LONG_DESC=$(python3 -c "print('A' * 5000)" 2>/dev/null || echo "Very long description")
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Software Engineer" \
    -F "jobDescription=$LONG_DESC" \
    -F "files=@$RESUME_DIR/01_senior_dev_excellent.pdf" \
    --max-time 120)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 6.3: Unicode characters handled
echo -e "\n${CYAN}Test 6.3: Unicode characters handled${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Software Engineer" \
    -F "jobDescription=Looking for developers 你好 こんにちは مرحبا" \
    -F "files=@$RESUME_DIR/01_senior_dev_excellent.pdf" \
    --max-time 120)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 6.4: Empty job title rejected
echo -e "\n${CYAN}Test 6.4: Empty job title rejected${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=" \
    -F "jobDescription=Test" \
    --max-time 10)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (correctly rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE (expected 400/422)"
    FAILED=$((FAILED + 1))
fi

# Test 6.5: Empty job description rejected
echo -e "\n${CYAN}Test 6.5: Empty job description rejected${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=" \
    --max-time 10)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE (correctly rejected)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE (expected 400/422)"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "   Suite 6 Summary: $PASSED passed, $FAILED failed"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
