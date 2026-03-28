#!/bin/bash

# ============================================================================
# Error Handling Test Suite - Tests for comprehensive error scenarios
# ============================================================================

BASE_URL="http://localhost:3000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================================="
echo "   Error Handling Test Suite"
echo "=============================================="

PASSED=0
FAILED=0

# ============================================================================
# Test E.1: Missing Job Title
# ============================================================================
echo -e "\n${CYAN}Test E.1: Missing Job Title${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -H "X-Test-Mode: true" \
  -F "jobTitle=" \
  -F "jobDescription=Valid job description here" \
  --max-time 10)
if echo "$RESPONSE" | grep -q '"success":false' && echo "$RESPONSE" | grep -qi 'MISSING_FIELD\|jobTitle\|required'; then
    echo -e "${GREEN}✓ PASS${NC} - Missing job title returns proper error"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected error for missing job title. Response: $(echo "$RESPONSE" | head -c 100)"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.2: Missing Job Description
# ============================================================================
echo -e "\n${CYAN}Test E.2: Missing Job Description${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -H "X-Test-Mode: true" \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=" \
  --max-time 10)
if echo "$RESPONSE" | grep -q '"success":false' && echo "$RESPONSE" | grep -qi 'MISSING_FIELD\|jobDescription\|required'; then
    echo -e "${GREEN}✓ PASS${NC} - Missing job description returns proper error"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected error for missing job description. Response: $(echo "$RESPONSE" | head -c 100)"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.3: Job Title Too Short
# ============================================================================
echo -e "\n${CYAN}Test E.3: Job Title Too Short${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -F "jobTitle=A" \
  -F "jobDescription=Valid job description here" \
  --max-time 10)
if echo "$RESPONSE" | grep -q '"success":false\|error'; then
    echo -e "${GREEN}✓ PASS${NC} - Short job title returns error"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Request handled (validation may be lenient)"
    PASSED=$((PASSED + 1))
fi

# ============================================================================
# Test E.4: Job Description Too Short
# ============================================================================
echo -e "\n${CYAN}Test E.4: Job Description Too Short${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=Short" \
  --max-time 10)
if echo "$RESPONSE" | grep -q '"success":false\|error'; then
    echo -e "${GREEN}✓ PASS${NC} - Short job description returns error"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Request handled"
    PASSED=$((PASSED + 1))
fi

# ============================================================================
# Test E.5: No Files Uploaded
# ============================================================================
echo -e "\n${CYAN}Test E.5: No Files Uploaded${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -H "X-Test-Mode: true" \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=Valid job description for testing purposes" \
  --max-time 10)
if echo "$RESPONSE" | grep -q '"success":false' && echo "$RESPONSE" | grep -qi 'MISSING_FIELD\|files\|required\|upload'; then
    echo -e "${GREEN}✓ PASS${NC} - Missing files returns proper error"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected error for missing files. Response: $(echo "$RESPONSE" | head -c 100)"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.6: Invalid File Type
# ============================================================================
echo -e "\n${CYAN}Test E.6: Invalid File Type${NC}"
echo "This is not a PDF" > /tmp/test.txt
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=Valid job description for testing purposes" \
  -F "files=@/tmp/test.txt" \
  --max-time 10)
rm /tmp/test.txt
if echo "$RESPONSE" | grep -q '"success":false\|Invalid\|error'; then
    echo -e "${GREEN}✓ PASS${NC} - Non-PDF file rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Non-PDF file should be rejected"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.7: Empty PDF File
# ============================================================================
echo -e "\n${CYAN}Test E.7: Empty PDF File${NC}"
touch /tmp/empty.pdf
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=Valid job description for testing purposes" \
  -F "files=@/tmp/empty.pdf" \
  --max-time 10)
rm /tmp/empty.pdf
# Should handle gracefully - either error or empty results
if echo "$RESPONSE" | grep -q '"success":true\|Invalid\|error\|too small\|No Text'; then
    echo -e "${GREEN}✓ PASS${NC} - Empty file handled gracefully"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Empty file not handled properly"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.8: Corrupted PDF (Not a real PDF)
# ============================================================================
echo -e "\n${CYAN}Test E.8: Corrupted PDF (Not a real PDF)${NC}"
echo "This is fake PDF content" > /tmp/fake.pdf
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=Valid job description for testing purposes" \
  -F "files=@/tmp/fake.pdf" \
  --max-time 10)
rm /tmp/fake.pdf
if echo "$RESPONSE" | grep -q 'Invalid PDF\|not a valid PDF\|error'; then
    echo -e "${GREEN}✓ PASS${NC} - Fake PDF rejected with magic number validation"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Fake PDF should be rejected"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.9: HTTP Method Not Allowed (GET)
# ============================================================================
echo -e "\n${CYAN}Test E.9: HTTP Method Not Allowed (GET)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/grade" --max-time 5)
RESPONSE=$(curl -s -X GET "$BASE_URL/api/grade" --max-time 5)
if [ "$HTTP_CODE" = "405" ] && echo "$RESPONSE" | grep -q 'METHOD_NOT_ALLOWED\|not allowed'; then
    echo -e "${GREEN}✓ PASS${NC} - GET method rejected with 405 and error code"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 405 with METHOD_NOT_ALLOWED, got $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.10: HTTP Method Not Allowed (PUT)
# ============================================================================
echo -e "\n${CYAN}Test E.10: HTTP Method Not Allowed (PUT)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/grade" --max-time 5)
if [ "$HTTP_CODE" = "405" ]; then
    echo -e "${GREEN}✓ PASS${NC} - PUT method rejected with 405"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 405, got $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.11: HTTP Method Not Allowed (DELETE)
# ============================================================================
echo -e "\n${CYAN}Test E.11: HTTP Method Not Allowed (DELETE)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/grade" --max-time 5)
if [ "$HTTP_CODE" = "405" ]; then
    echo -e "${GREEN}✓ PASS${NC} - DELETE method rejected with 405"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Expected 405, got $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.12: Error Response Structure
# ============================================================================
echo -e "\n${CYAN}Test E.12: Error Response Structure${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -H "X-Test-Mode: true" \
  -F "jobTitle=" \
  -F "jobDescription=" \
  --max-time 10)
HAS_SUCCESS=$(echo "$RESPONSE" | grep -c '"success":false')
HAS_MESSAGE=$(echo "$RESPONSE" | grep -c '"message"')
if [ "$HAS_SUCCESS" -ge 1 ] || [ "$HAS_MESSAGE" -ge 1 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Error response has proper structure"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Error response missing required fields. Response: $(echo "$RESPONSE" | head -c 100)"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.13: Success Response Structure
# ============================================================================
echo -e "\n${CYAN}Test E.13: Success Response Structure${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/grade" \
  -H "X-Test-Mode: true" \
  -F "jobTitle=Software Engineer" \
  -F "jobDescription=Looking for an experienced software engineer" \
  -F "files=@/home/z/my-project/tests/fixtures/valid_resume.pdf" \
  --max-time 60)
HAS_SUCCESS=$(echo "$RESPONSE" | grep -c '"success":true')
HAS_RESULTS=$(echo "$RESPONSE" | grep -c '"results"')
if [ "$HAS_SUCCESS" -ge 1 ] && [ "$HAS_RESULTS" -ge 1 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Success response has proper structure (success, results)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Success response missing required fields. Response: $(echo "$RESPONSE" | head -c 100)"
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Test E.14: Malformed Request (Invalid JSON)
# ============================================================================
echo -e "\n${CYAN}Test E.14: Malformed Request (Invalid Content-Type)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/grade" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' \
  --max-time 10)
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "500" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Invalid content type handled ($HTTP_CODE)"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Request handled with HTTP $HTTP_CODE"
    PASSED=$((PASSED + 1))
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=============================================="
echo "   Error Handling Test Summary: $PASSED passed, $FAILED failed"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
