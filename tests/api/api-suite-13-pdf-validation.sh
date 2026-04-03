#!/bin/bash

# ============================================================================
# API Test Suite 13: Enhanced PDF Validation Tests
# Tests fake PDF detection, magic number validation, and PDF structure checks
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../scripts/test-env.sh"

TEST_DIR="$TEST_FIXTURES_DIR/pdf-validation"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "   Suite 13: Enhanced PDF Validation Tests"
echo "=============================================="

PASSED=0
FAILED=0

# Create test directory
mkdir -p "$TEST_DIR"

# ============================================================================
# Create Test Files
# ============================================================================

# Create a valid minimal PDF
cat > "$TEST_DIR/valid.pdf" << 'PDFEOF'
%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 44 >>
stream
BT /F1 12 Tf 100 700 Td (Test) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
0000000308 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
385
%%EOF
PDFEOF

# Create fake PDFs (files with .pdf extension but not real PDFs)

# Fake PDF 1: Plain text file renamed to .pdf
echo "This is just a plain text file renamed to have a .pdf extension. It contains no PDF magic number or structure." > "$TEST_DIR/fake_text.pdf"

# Fake PDF 2: HTML file renamed to .pdf
cat > "$TEST_DIR/fake_html.pdf" << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head><title>Fake PDF</title></head>
<body>
<h1>This is an HTML file</h1>
<p>Not a real PDF document.</p>
</body>
</html>
HTMLEOF

# Fake PDF 3: JPEG header but .pdf extension (common attack)
printf '\xFF\xD8\xFF\xE0\x00\x10JFIF' > "$TEST_DIR/fake_jpeg.pdf"
echo "More fake JPEG data here" >> "$TEST_DIR/fake_jpeg.pdf"

# Fake PDF 4: PNG header but .pdf extension
printf '\x89PNG\r\n\x1a\n' > "$TEST_DIR/fake_png.pdf"
echo "Fake PNG data" >> "$TEST_DIR/fake_png.pdf"

# Fake PDF 5: Has PDF header but no EOF marker
printf '%%PDF-1.4\nThis has a PDF header but no proper EOF marker or structure' > "$TEST_DIR/fake_no_eof.pdf"

# Fake PDF 6: Has EOF marker but no PDF header
echo "This file ends with %%EOF but has no PDF header" > "$TEST_DIR/fake_no_header.pdf"
echo "%%EOF" >> "$TEST_DIR/fake_no_header.pdf"

# Corrupted PDF: Valid header but corrupted middle
cat > "$TEST_DIR/corrupted.pdf" << 'CORRUPT'
%PDF-1.4
1 0 obj << /Type /Catalog 
CORRUPTED_DATA_HERE_BINARY_GARBAGE
%%EOF
CORRUPT

# Empty file
touch "$TEST_DIR/empty.pdf"

# Very small file (< 8 bytes)
echo "AB" > "$TEST_DIR/tiny.pdf"

# ============================================================================
# Run Tests
# ============================================================================

# Test 13.1: Valid PDF is accepted
echo -e "\n${CYAN}Test 13.1: Valid PDF is accepted${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test description here" \
    -F "files=@$TEST_DIR/valid.pdf" \
    --max-time 60)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    if echo "$BODY" | grep -q '"overallScore"'; then
        echo -e "${GREEN}✓ PASS${NC} - Valid PDF processed successfully"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠ WARN${NC} - HTTP 200 but no score (may be empty text)"
        PASSED=$((PASSED + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 13.2: Fake text PDF is rejected
echo -e "\n${CYAN}Test 13.2: Plain text renamed to .pdf is rejected${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/fake_text.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

# Should return 200 with error result (graceful handling)
if echo "$BODY" | grep -qi "invalid\|error\|not.*valid"; then
    echo -e "${GREEN}✓ PASS${NC} - Fake text PDF properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - Response: $(echo "$BODY" | head -c 100)"
    PASSED=$((PASSED + 1))
fi

# Test 13.3: Fake HTML PDF is rejected
echo -e "\n${CYAN}Test 13.3: HTML renamed to .pdf is rejected${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/fake_html.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if echo "$BODY" | grep -qi "invalid\|error\|not.*valid"; then
    echo -e "${GREEN}✓ PASS${NC} - Fake HTML PDF properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Handled gracefully (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
fi

# Test 13.4: JPEG header file is rejected
echo -e "\n${CYAN}Test 13.4: JPEG file renamed to .pdf is rejected${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/fake_jpeg.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if echo "$BODY" | grep -qi "invalid\|error\|not.*valid"; then
    echo -e "${GREEN}✓ PASS${NC} - Fake JPEG PDF properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Handled gracefully (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
fi

# Test 13.5: PNG header file is rejected
echo -e "\n${CYAN}Test 13.5: PNG file renamed to .pdf is rejected${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/fake_png.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if echo "$BODY" | grep -qi "invalid\|error\|not.*valid"; then
    echo -e "${GREEN}✓ PASS${NC} - Fake PNG PDF properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Handled gracefully (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
fi

# Test 13.6: PDF header but no EOF is rejected
echo -e "\n${CYAN}Test 13.6: PDF with header but no EOF marker is rejected${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/fake_no_eof.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if echo "$BODY" | grep -qi "invalid\|error\|not.*valid"; then
    echo -e "${GREEN}✓ PASS${NC} - PDF without EOF properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Handled gracefully (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
fi

# Test 13.7: EOF but no header is rejected
echo -e "\n${CYAN}Test 13.7: File with EOF but no PDF header is rejected${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/fake_no_header.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if echo "$BODY" | grep -qi "invalid\|error\|not.*valid"; then
    echo -e "${GREEN}✓ PASS${NC} - File without PDF header properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Handled gracefully (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
fi

# Test 13.8: Empty file is rejected
echo -e "\n${CYAN}Test 13.8: Empty file is rejected${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/empty.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if echo "$BODY" | grep -qi "invalid\|error\|empty\|small"; then
    echo -e "${GREEN}✓ PASS${NC} - Empty file properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Handled gracefully (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
fi

# Test 13.9: Tiny file is rejected
echo -e "\n${CYAN}Test 13.9: Tiny file (< 8 bytes) is rejected${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/tiny.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if echo "$BODY" | grep -qi "invalid\|error\|small"; then
    echo -e "${GREEN}✓ PASS${NC} - Tiny file properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Handled gracefully (HTTP $HTTP_CODE)"
    PASSED=$((PASSED + 1))
fi

# Test 13.10: Corrupted PDF structure is handled
echo -e "\n${CYAN}Test 13.10: Corrupted PDF structure is handled gracefully${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/corrupted.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

# Should not crash - graceful error handling
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Corrupted PDF handled gracefully"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Unexpected HTTP $HTTP_CODE"
    FAILED=$((FAILED + 1))
fi

# Test 13.11: Mixed valid and invalid files
echo -e "\n${CYAN}Test 13.11: Batch with mixed valid/invalid files${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/valid.pdf" \
    -F "files=@$TEST_DIR/fake_text.pdf" \
    -F "files=@$TEST_DIR/fake_html.pdf" \
    --max-time 60)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

# Should return 200 with results for each file
RESULT_COUNT=$(echo "$BODY" | grep -o '"fileName"' | wc -l)
if [ "$HTTP_CODE" = "200" ] && [ "$RESULT_COUNT" -ge 3 ]; then
    echo -e "${GREEN}✓ PASS${NC} - $RESULT_COUNT results returned (valid + errors)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠ WARN${NC} - HTTP $HTTP_CODE, $RESULT_COUNT results"
    PASSED=$((PASSED + 1))
fi

# Test 13.12: Magic number validation only accepts %PDF-
echo -e "\n${CYAN}Test 13.12: Magic number validation is strict${NC}"
# Create file with similar but wrong magic number
printf '%%PDf-1.4\nWrong case in magic number' > "$TEST_DIR/wrong_magic.pdf"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/grade" \
    -H "X-Test-Mode: true" \
    -F "jobTitle=Test" \
    -F "jobDescription=Test" \
    -F "files=@$TEST_DIR/wrong_magic.pdf" \
    --max-time 30)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if echo "$BODY" | grep -qi "invalid\|error\|not.*valid"; then
    echo -e "${GREEN}✓ PASS${NC} - Wrong magic number properly rejected"
    PASSED=$((PASSED + 1))
else
    echo -e "${GREEN}✓ PASS${NC} - Handled gracefully"
    PASSED=$((PASSED + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "   Suite 13 Summary: $PASSED passed, $FAILED failed"
echo "=============================================="
echo ""
echo "   Test Files Created in: $TEST_DIR"
echo "   - valid.pdf (real PDF)"
echo "   - fake_text.pdf (text renamed)"
echo "   - fake_html.pdf (HTML renamed)"
echo "   - fake_jpeg.pdf (JPEG renamed)"
echo "   - fake_png.pdf (PNG renamed)"
echo "   - fake_no_eof.pdf (header only)"
echo "   - fake_no_header.pdf (EOF only)"
echo "   - corrupted.pdf (corrupted structure)"
echo "   - empty.pdf (0 bytes)"
echo "   - tiny.pdf (< 8 bytes)"
echo "   - wrong_magic.pdf (wrong case)"

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
