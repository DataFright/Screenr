#!/bin/bash

# ============================================================================
# Master Test Runner - Runs all API test suites sequentially
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL_PASSED=0
TOTAL_FAILED=0

echo "=============================================="
echo "   SCREENR - API TEST SUITES"
echo "   $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="

# Run each suite in order
for suite in 01 02 03 04 05 06 07 08 09 10 11 12 13; do
    SUITE_FILE="$SCRIPT_DIR/api-suite-${suite}-*.sh"
    
    # Find matching file
    MATCHING_FILE=$(ls $SUITE_FILE 2>/dev/null | head -1)
    
    if [ -f "$MATCHING_FILE" ]; then
        echo -e "\n${CYAN}========================================${NC}"
        echo -e "${CYAN}Running: $(basename "$MATCHING_FILE")${NC}"
        echo -e "${CYAN}========================================${NC}"
        
        bash "$MATCHING_FILE"
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ]; then
            TOTAL_PASSED=$((TOTAL_PASSED + 1))
        else
            TOTAL_FAILED=$((TOTAL_FAILED + 1))
        fi
    else
        echo -e "${YELLOW}Suite file not found: $SUITE_FILE${NC}"
    fi
done

# Final summary
echo ""
echo "=============================================="
echo "   FINAL SUMMARY"
echo "=============================================="
echo ""
echo "Suites Passed:  $TOTAL_PASSED"
echo "Suites Failed:  $TOTAL_FAILED"
echo ""

if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL API test suites passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some API test suites failed.${NC}"
    exit 1
fi
