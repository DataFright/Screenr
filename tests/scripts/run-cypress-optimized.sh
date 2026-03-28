#!/bin/bash

# ============================================================================
# Cypress Test Runner with Memory Optimization
# ============================================================================
# This script clears Cypress cache and runs tests with memory optimizations
# to prevent Electron crashes in sandboxed/containerized environments.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=============================================="
echo "   Cypress E2E Tests (Optimized)"
echo "=============================================="
echo ""

# Function to clear Cypress cache
clear_cypress_cache() {
    echo -e "${CYAN}[1/3] Clearing Cypress cache...${NC}"
    
    # Clear Cypress browser profiles (but keep the binary)
    rm -rf ~/.config/cypress/cy/development/browsers/* 2>/dev/null || true
    
    # Clear project-level Cypress cache
    rm -rf "$PROJECT_ROOT/cypress/cache" 2>/dev/null || true
    
    # Clear any temp files
    rm -rf /tmp/cypress_* 2>/dev/null || true
    
    # Clear screenshots and videos
    rm -rf "$PROJECT_ROOT/cypress/screenshots" 2>/dev/null || true
    rm -rf "$PROJECT_ROOT/cypress/videos" 2>/dev/null || true
    
    echo -e "${GREEN}✓ Cache cleared${NC}"
    echo ""
}

# Function to run a single test spec with isolation
run_spec() {
    local spec_file=$1
    local spec_name=$(basename "$spec_file")
    
    echo -e "${CYAN}Running: $spec_name${NC}"
    
    # Run with reduced memory footprint
    # --exit: Force exit after test
    NODE_OPTIONS="--max-old-space-size=2048" \
    timeout 90 \
    bunx cypress run \
        --headless \
        --spec "$spec_file" \
        --quiet \
        2>&1
    
    local exit_code=$?
    
    # Small delay between tests for memory cleanup
    sleep 2
    
    return $exit_code
}

# Main execution
main() {
    # Step 1: Clear cache
    clear_cypress_cache
    
    # Step 2: Verify server is running
    echo -e "${CYAN}[2/3] Checking server...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" | grep -q "200"; then
        echo -e "${GREEN}✓ Server is running${NC}"
    else
        echo -e "${RED}✗ Server not running. Start with 'bun run dev'${NC}"
        exit 1
    fi
    echo ""
    
    # Step 3: Run tests
    echo -e "${CYAN}[3/3] Running E2E tests...${NC}"
    echo ""
    
    PASSED=0
    FAILED=0
    FAILED_SPECS=()
    
    # Get all spec files
    SPEC_FILES=$(ls "$PROJECT_ROOT"/cypress/e2e/suite-*.cy.ts 2>/dev/null)
    
    for spec in $SPEC_FILES; do
        if [ -f "$spec" ]; then
            spec_name=$(basename "$spec")
            
            if run_spec "$spec"; then
                PASSED=$((PASSED + 1))
                echo -e "${GREEN}✓ $spec_name passed${NC}"
            else
                FAILED=$((FAILED + 1))
                FAILED_SPECS+=("$spec_name")
                echo -e "${RED}✗ $spec_name failed${NC}"
            fi
            echo ""
            
            # Force cleanup between specs
            if command -v sync &> /dev/null; then
                sync
            fi
        fi
    done
    
    # Summary
    echo "=============================================="
    echo "   E2E Test Summary"
    echo "=============================================="
    echo ""
    echo "Passed: $PASSED"
    echo "Failed: $FAILED"
    
    if [ $FAILED -gt 0 ]; then
        echo ""
        echo "Failed specs:"
        for spec in "${FAILED_SPECS[@]}"; do
            echo "  - $spec"
        done
    fi
    
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All E2E tests passed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ Some tests failed. Check output above.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
