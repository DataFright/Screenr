#!/bin/bash

# ============================================================================
# API Test Suite 3: Page Structure Tests (Tests 3.1 - 3.9)
# ============================================================================

BASE_URL="http://localhost:3000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================================="
echo "   Suite 3: Page Structure Tests"
echo "=============================================="

PASSED=0
FAILED=0

PAGE_CONTENT=$(curl -s "$BASE_URL/" --max-time 10)

# Test 3.1: Page contains 'Screenr' title
echo -e "\n${CYAN}Test 3.1: Page contains 'Screenr' title${NC}"
if echo "$PAGE_CONTENT" | grep -q "Screenr"; then
    echo -e "${GREEN}✓ PASS${NC} - Title found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Title not found"
    FAILED=$((FAILED + 1))
fi

# Test 3.2: Page contains 'Job Details' section
echo -e "\n${CYAN}Test 3.2: Page contains 'Job Details' section${NC}"
if echo "$PAGE_CONTENT" | grep -q "Job Details"; then
    echo -e "${GREEN}✓ PASS${NC} - Section found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Section not found"
    FAILED=$((FAILED + 1))
fi

# Test 3.3: Page contains 'Upload Resumes' section
echo -e "\n${CYAN}Test 3.3: Page contains 'Upload Resumes' section${NC}"
if echo "$PAGE_CONTENT" | grep -q "Upload Resumes"; then
    echo -e "${GREEN}✓ PASS${NC} - Section found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Section not found"
    FAILED=$((FAILED + 1))
fi

# Test 3.4: Page contains 'Grading Results' section
echo -e "\n${CYAN}Test 3.4: Page contains 'Grading Results' section${NC}"
if echo "$PAGE_CONTENT" | grep -q "Grading Results"; then
    echo -e "${GREEN}✓ PASS${NC} - Section found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Section not found"
    FAILED=$((FAILED + 1))
fi

# Test 3.5: Page has file input element
echo -e "\n${CYAN}Test 3.5: Page has file input element${NC}"
if echo "$PAGE_CONTENT" | grep -q 'type="file"'; then
    echo -e "${GREEN}✓ PASS${NC} - File input found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - File input not found"
    FAILED=$((FAILED + 1))
fi

# Test 3.6: File input has PDF filter
echo -e "\n${CYAN}Test 3.6: File input has PDF filter${NC}"
if echo "$PAGE_CONTENT" | grep -q 'accept=".pdf"'; then
    echo -e "${GREEN}✓ PASS${NC} - PDF filter found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - PDF filter not found"
    FAILED=$((FAILED + 1))
fi

# Test 3.7: Page has textarea for job description
echo -e "\n${CYAN}Test 3.7: Page has textarea for job description${NC}"
if echo "$PAGE_CONTENT" | grep -q 'textarea'; then
    echo -e "${GREEN}✓ PASS${NC} - Textarea found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Textarea not found"
    FAILED=$((FAILED + 1))
fi

# Test 3.8: Page has 'Grade Resumes' button
echo -e "\n${CYAN}Test 3.8: Page has 'Grade Resumes' button${NC}"
if echo "$PAGE_CONTENT" | grep -q "Grade Resumes"; then
    echo -e "${GREEN}✓ PASS${NC} - Button found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Button not found"
    FAILED=$((FAILED + 1))
fi

# Test 3.9: Page has 'Clear All' button
echo -e "\n${CYAN}Test 3.9: Page has 'Clear All' button${NC}"
if echo "$PAGE_CONTENT" | grep -q "Clear All"; then
    echo -e "${GREEN}✓ PASS${NC} - Button found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Button not found"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "   Suite 3 Summary: $PASSED passed, $FAILED failed"
echo "=============================================="

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
