#!/bin/bash

COMMON_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$COMMON_DIR/../.." && pwd)"

BASE_URL="${BASE_URL:-http://localhost:3000}"
TESTS_DIR="$PROJECT_ROOT/tests"
TEST_FIXTURES_DIR="$TESTS_DIR/fixtures"
TEST_REPORTS_DIR="$TESTS_DIR/reports"
CYPRESS_FIXTURES_DIR="$PROJECT_ROOT/cypress/fixtures"
CYPRESS_RESUME_DIR="$CYPRESS_FIXTURES_DIR/test-data/resumes"
TMP_DIR="$TESTS_DIR/.tmp"

mkdir -p "$TEST_FIXTURES_DIR" "$TEST_REPORTS_DIR" "$TMP_DIR"

server_is_reachable() {
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" --max-time 5 2>/dev/null)
  [[ "$http_code" == "200" ]]
}