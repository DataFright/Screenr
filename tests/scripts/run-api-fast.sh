#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPORT_FILE="$PROJECT_ROOT/tests/reports/api-fast-suite-rerun.txt"

cd "$PROJECT_ROOT"

perl -pi -e 's/\r$//' tests/api/*.sh tests/scripts/*.sh

: > "$REPORT_FILE"

for script in \
  tests/api/api-suite-01-health.sh \
  tests/api/api-suite-02-endpoints.sh \
  tests/api/api-suite-03-structure.sh \
  tests/api/api-suite-04-pdf.sh \
  tests/api/api-suite-05-response.sh \
  tests/api/api-suite-06-errors.sh \
  tests/api/api-suite-07-integration.sh \
  tests/api/api-suite-09-dark-mode.sh \
  tests/api/api-suite-10-security.sh \
  tests/api/api-suite-11-error-handling.sh \
  tests/api/api-suite-12-test-mode.sh \
  tests/api/api-suite-13-pdf-validation.sh
do
  bash "$script" | tee -a "$REPORT_FILE"
  status=${PIPESTATUS[0]}
  echo "STATUS:$script:$status" | tee -a "$REPORT_FILE"
  if [ "$status" -ne 0 ]; then
    exit "$status"
  fi
done
