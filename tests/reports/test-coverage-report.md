# Screenr - Comprehensive Test Coverage Report

**Generated:** 2026-04-03 17:48:32
**Base URL:** http://localhost:3000
**Report Version:** 6.0

---

## Coverage Summary

| Test Type | Suites | Checks | Passed | Failed |
|-----------|--------|--------|--------|--------|
| Cypress E2E | 8 | 66 | 66 | 0 |
| API Shell Suites | 13 | 118 | 118 | 0 |
| Load Runner | 1 | 6 sections | 6 | 0 |
| **TOTAL** | **22** | **184 + load scenarios** | **All passing** | **0** |

### Current Automated Test Status: **100% passing**

---

## Important Coverage Caveat

This repository does **not** currently produce instrumented line/branch coverage from nyc/Cypress runs.

- Cypress emitted `no coverage information` warnings during the latest run.
- That means there is no authoritative generated line-by-line coverage artifact to publish today.
- The values below remain maintained engineering estimates based on exercised features, not compiler/runtime instrumentation output.

---

## Estimated Functional Coverage

| Area | Coverage Confidence | Notes |
|------|---------------------|-------|
| Page rendering and layout | High | Covered by suites 01, 04, 05 |
| Form validation | High | Covered by Cypress and API validation suites |
| File upload flow | High | Covered by Cypress suite 03 and API PDF suites |
| Fake/invalid PDF rejection | High | Covered by Cypress suite 08 and API suite 13 |
| Resume grading API | High | Covered by API suites 04, 05, 07, 08 |
| Security and rate limiting | High | Covered by API suites 10 and 12 |
| Dark mode | High | Covered by Cypress suite 06 and API suite 09 |
| Error handling and recovery | High | Covered by Cypress suite 07 and API suite 11 |

Estimated overall exercised behavior remains in the same range as prior reporting, but should be treated as **qualitative** until real instrumentation is added.

---

## Test Inventory

### Cypress E2E

| Suite | Tests | Status |
|-------|-------|--------|
| 01 - Page Load | 8 | ✅ |
| 02 - Form Validation | 8 | ✅ |
| 03 - File Upload | 8 | ✅ |
| 04 - Accessibility | 8 | ✅ |
| 05 - Responsive Design | 8 | ✅ |
| 06 - Dark Mode | 10 | ✅ |
| 07 - Error Handling | 8 | ✅ |
| 08 - Fake PDF Detection | 8 | ✅ |

### API / Shell Suites

| Suite | Checks | Status |
|-------|--------|--------|
| 01 - Health | 5 | ✅ |
| 02 - Endpoint Validation | 6 | ✅ |
| 03 - Structure | 9 | ✅ |
| 04 - PDF Processing | 6 | ✅ |
| 05 - Response Validation | 10 | ✅ |
| 06 - Error Handling | 5 | ✅ |
| 07 - Integration | 6 | ✅ |
| 08 - Performance | 10 | ✅ |
| 09 - Dark Mode | 8 | ✅ |
| 10 - Security | 19 | ✅ |
| 11 - Error Handling | 14 | ✅ |
| 12 - Test Mode | 8 | ✅ |
| 13 - PDF Validation | 12 | ✅ |

---

## Latest Performance Snapshot

Taken from `tests/reports/load-test-report-20260403_174832.md`:

| Metric | Latest Result |
|--------|---------------|
| 5 concurrent users | 96ms avg |
| 10 concurrent users | 128ms avg |
| 20 concurrent users | 239ms avg |
| 30 concurrent users | 295ms avg |
| 50 concurrent users | 499ms avg |
| 10-file batch | 72ms |
| Memory stress | 20/20 successful |

---

## Recommended Next Step For Real Coverage

To replace these estimates with authoritative numbers:

1. Instrument the Next.js app for nyc/browser coverage collection.
2. Configure Cypress code coverage to merge browser coverage output.
3. Regenerate this report from actual artifacts instead of maintained estimates.

Until then, this document should be read as a **test execution coverage summary**, not a precise line/branch coverage export.
