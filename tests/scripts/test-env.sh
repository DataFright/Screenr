#!/bin/bash

# ============================================================================
# Shared Test Environment Configuration
# ============================================================================
#
# This script centralizes common test paths and helper functions used by
# API, Cypress, and load/performance test runners.
#
# Why this exists:
# - Avoids duplicating path/bootstrap logic across many test scripts
# - Keeps BASE_URL override behavior consistent
# - Provides a single health-check helper for scripts that need a running app

COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$COMMON_DIR/../.." && pwd)"

# Allow callers (CI/local) to override target URL, defaulting to local dev.
BASE_URL="${BASE_URL:-http://localhost:3000}"
TESTS_DIR="$PROJECT_ROOT/tests"
TEST_FIXTURES_DIR="$TESTS_DIR/fixtures"
TEST_REPORTS_DIR="$TESTS_DIR/reports"
PERFORMANCE_FIXTURES_DIR="$TEST_FIXTURES_DIR/performance"
CYPRESS_FIXTURES_DIR="$PROJECT_ROOT/cypress/fixtures"
CYPRESS_RESUME_DIR="$CYPRESS_FIXTURES_DIR/test-data/resumes"
TMP_DIR="$TESTS_DIR/.tmp"

# Ensure expected test directories always exist before suite logic runs.
mkdir -p "$TEST_FIXTURES_DIR" "$TEST_REPORTS_DIR" "$TMP_DIR" "$PERFORMANCE_FIXTURES_DIR"

# Returns success when /api/health responds with HTTP 200.
# Used by runners to fail fast when the target app is not up.
server_is_reachable() {
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" --max-time 5 2>/dev/null)
  [[ "$http_code" == "200" ]]
}