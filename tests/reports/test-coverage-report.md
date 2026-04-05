# Screenr - Test Coverage And Latency Report

**Generated:** 2026-04-04 23:10 UTC
**Base URL:** http://localhost:3000
**Report Version:** 7.0

---

## Executive Summary

- `npm run lint`: passing
- Standard Cypress suite: **70 / 70 passing** across 9 specs
- API shell rerun on Windows: shared Bash test harness repaired for this environment
- Performance comparison captured for `1 x ~1MB` and `10 x ~1MB`

### Current Verified Status

| Area | Status | Notes |
|------|--------|-------|
| Lint | ✅ | `eslint .` passed |
| Cypress E2E | ✅ | 9 specs, 70 tests, 0 failures |
| API shell suites | Partial rerun | Suites 01-06 were explicitly transcript-verified after harness fixes |
| Load tests | Not rerun | Skipped intentionally to avoid super long runs |

---

## Coverage Caveat

This repository still does **not** produce authoritative instrumented line or branch coverage.

- Cypress continues to emit `no coverage information` warnings.
- That means this report is a **test execution coverage summary**, not a compiler-verified coverage export.
- Functional coverage statements below are qualitative and based on the suites that were exercised.

---

## Verified Test Runs

### Lint

| Command | Result |
|---------|--------|
| `npm run lint` | ✅ Passing |

### Standard Cypress E2E

Full rerun completed successfully:

| Suite | Tests | Result |
|-------|------:|--------|
| 01 - Page Load | 8 | ✅ |
| 02 - Form Validation | 8 | ✅ |
| 03 - File Upload | 10 | ✅ |
| 04 - Accessibility | 8 | ✅ |
| 05 - Responsive Design | 8 | ✅ |
| 06 - Dark Mode | 10 | ✅ |
| 07 - Error Handling | 8 | ✅ |
| 08 - Fake PDF Detection | 8 | ✅ |
| 09 - Batch Grading Reliability | 2 | ✅ |
| **Total** | **70** | **✅ 70 passing, 0 failing** |

### API Shell Suites

The Windows plus WSL Bash path needed two fixes before rerun:

1. Shell scripts needed LF normalization in the runnable mirror.
2. `api-suite-02-endpoints.sh`, `api-suite-03-structure.sh`, and `api-suite-09-dark-mode.sh` were hardcoding `localhost` instead of using the shared `test-env.sh` base URL.

After those fixes, these suites were explicitly rerun and transcript-verified:

| Suite | Checks | Result |
|-------|------:|--------|
| 01 - Health | 5 | ✅ |
| 02 - Endpoint Validation | 6 | ✅ |
| 03 - Structure | 9 | ✅ |
| 04 - PDF Processing | 6 | ✅ |
| 05 - Response Validation | 10 | ✅ |
| 06 - Error Handling | 5 | ✅ |

Suites 07-13 were not cleanly transcript-captured end-to-end through this terminal bridge during this run, so they are not being marked as freshly verified here.

---

## Functional Coverage Confidence

| Area | Confidence | Basis |
|------|------------|-------|
| Page rendering and layout | High | Cypress suites 01, 04, 05 and API structure suite |
| Form validation | High | Cypress suite 02 and API endpoint validation suite |
| File upload flow | High | Cypress suite 03 and API PDF suite |
| Invalid/fake PDF handling | High | Cypress suite 08 and API PDF handling rerun |
| Batch grading UI behavior | High | Cypress suite 09 |
| Error states and recovery | High | Cypress suite 07 and API error suite rerun |
| Theme behavior | High | Cypress suite 06 |
| Resume grading response shape | High | API response validation rerun |

---

## Latency Comparison

Source artifact: `tests/reports/cypress-performance-batch-latest.md`

| Scenario | UI time (ms) | API time (ms) | Result count | 30s target |
|----------|-------------:|--------------:|-------------:|-----------|
| 1 resume x ~1MB | 21678 | 21447.5 | 1 | met |
| 10 resumes x ~1MB | 139971 | 139338.3 | 10 | missed |

### Comparison Notes

- `10 x ~1MB` is about **6.46x** slower than `1 x ~1MB` on end-to-end UI timing.
- `1 x ~1MB` stays inside the 30 second target.
- `10 x ~1MB` misses the 30 second target by about **110 seconds**.
- The API time and UI time are close, which indicates backend grading dominates the end-to-end latency here.

---

## Recommended Next Step For Real Coverage

To replace qualitative coverage with authoritative numbers:

1. Instrument the Next.js app for browser coverage collection.
2. Merge that browser coverage into nyc during Cypress runs.
3. Regenerate this report from actual coverage artifacts instead of execution summaries.
