import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.resolve(process.cwd())
const reportsDir = path.join(projectRoot, 'tests', 'reports')
const cypressDir = path.join(projectRoot, 'cypress', 'e2e')
const apiDir = path.join(projectRoot, 'tests', 'api')
const reportPath = path.join(reportsDir, 'test-coverage-report.md')
const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

function utcTimestamp() {
  return new Date().toISOString().replace('T', ' ').replace(/:\d{2}\.\d{3}Z$/, ' UTC')
}

async function listMatching(dirPath, matcher) {
  const entries = await readdir(dirPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && matcher(entry.name))
    .map((entry) => entry.name)
    .sort()
}

async function readTextFile(filePath) {
  const buffer = await readFile(filePath)

  if (buffer.length >= 2) {
    const bom = buffer.subarray(0, 2)
    if (bom[0] === 0xff && bom[1] === 0xfe) {
      return buffer.subarray(2).toString('utf16le')
    }
  }

  return buffer.toString('utf8')
}

async function countOccurrences(filePath, pattern) {
  const content = await readTextFile(filePath)
  return (content.match(pattern) || []).length
}

async function getCypressInventory() {
  const specFiles = await listMatching(cypressDir, (name) => /^suite-.*\.cy\.ts$/.test(name))
  let testCount = 0

  for (const fileName of specFiles) {
    testCount += await countOccurrences(path.join(cypressDir, fileName), /^\s*it\s*\(/gm)
  }

  return { specCount: specFiles.length, testCount }
}

async function getApiInventory() {
  const suiteFiles = await listMatching(apiDir, (name) => /^api-suite-.*\.sh$/.test(name))
  const suiteChecks = {
    'api-suite-01-health.sh': 5,
    'api-suite-02-endpoints.sh': 6,
    'api-suite-03-structure.sh': 9,
    'api-suite-04-pdf.sh': 6,
    'api-suite-05-response.sh': 10,
    'api-suite-06-errors.sh': 5,
    'api-suite-07-integration.sh': 6,
    'api-suite-08-performance.sh': 10,
    'api-suite-09-dark-mode.sh': 8,
    'api-suite-10-security.sh': 19,
    'api-suite-11-error-handling.sh': 14,
    'api-suite-12-test-mode.sh': 8,
    'api-suite-13-pdf-validation.sh': 12,
  }

  const totalChecks = suiteFiles.reduce((sum, fileName) => sum + (suiteChecks[fileName] || 0), 0)
  return { suiteCount: suiteFiles.length, totalChecks }
}

async function parseApiStatus() {
  const candidates = ['api-suite-rerun.txt', 'api-fast-suite-rerun.txt']

  for (const fileName of candidates) {
    try {
      const content = await readTextFile(path.join(reportsDir, fileName))
      const matches = [...content.matchAll(/^STATUS:(.+):(\d+)$/gm)]
      if (matches.length === 0) {
        continue
      }

      const failed = matches.filter((match) => match[2] !== '0').length
      return {
        fileName,
        executedSuites: matches.length,
        failedSuites: failed,
      }
    } catch {
      continue
    }
  }

  return null
}

async function parseCypressStatus() {
  const candidates = ['cypress-standard-latest.txt', 'cypress-standard-rerun.txt']

  for (const fileName of candidates) {
    try {
      const content = await readTextFile(path.join(reportsDir, fileName))
      const passedMatch = content.match(/Passed:\s*(\d+)/)
      const failedMatch = content.match(/Failed:\s*(\d+)/)
      if (!passedMatch || !failedMatch) {
        continue
      }

      return {
        fileName,
        passedSpecs: Number(passedMatch[1]),
        failedSpecs: Number(failedMatch[1]),
      }
    } catch {
      continue
    }
  }

  return null
}

async function getLatestLoadReport() {
  const files = await listMatching(reportsDir, (name) => /^load-test-report-.*\.md$/.test(name))
  return files.at(-1) || null
}

async function getPerformanceRows() {
  const filePath = path.join(reportsDir, 'cypress-performance-batch-latest.md')

  try {
    const content = await readTextFile(filePath)
    return content
      .split('\n')
      .filter((line) => /^\| /.test(line) && !line.includes('Scenario') && !line.includes('---'))
  } catch {
    return []
  }
}

const [{ specCount, testCount }, { suiteCount, totalChecks }, apiStatus, cypressStatus, latestLoadReport, performanceRows] = await Promise.all([
  getCypressInventory(),
  getApiInventory(),
  parseApiStatus(),
  parseCypressStatus(),
  getLatestLoadReport(),
  getPerformanceRows(),
])

const apiExecutionLine = apiStatus
  ? `- API shell suites: ${apiStatus.executedSuites} suite outputs captured from ${apiStatus.fileName}; failed suites: ${apiStatus.failedSuites}`
  : '- API shell suites: no captured rerun artifact found'

const cypressExecutionLine = cypressStatus
  ? `- Cypress E2E: ${cypressStatus.passedSpecs} passed specs, ${cypressStatus.failedSpecs} failed specs from ${cypressStatus.fileName}`
  : '- Cypress E2E: no captured rerun artifact found'

const loadExecutionLine = latestLoadReport
  ? `- Load runner: latest report captured in tests/reports/${latestLoadReport}`
  : '- Load runner: no load report artifact found'

const performanceSection = performanceRows.length > 0
  ? performanceRows.join('\n')
  : '| No performance artifact captured | - | - | - | - |'

const markdown = `# Screenr - Test Coverage And Latency Report

**Generated:** ${utcTimestamp()}
**Base URL:** ${baseUrl}
**Report Version:** 8.0

---

## Executive Summary

- Inventory: ${suiteCount} API suites, ${totalChecks} API checks, ${specCount} Cypress specs, ${testCount} Cypress tests
- Lint and build results should be interpreted from the latest verification run alongside this report
${apiExecutionLine}
${cypressExecutionLine}
${loadExecutionLine}

### Coverage Caveat

This repository still does **not** produce authoritative instrumented line or branch coverage.

- Cypress code coverage is not instrumented end-to-end.
- This file is a verification summary built from the latest test artifacts.
- Functional coverage statements should be read as execution coverage, not compiler-generated coverage.

---

## Current Inventory

| Area | Inventory |
|------|-----------|
| API shell suites | ${suiteCount} suites / ${totalChecks} checks |
| Cypress E2E | ${specCount} specs / ${testCount} tests |
| Load testing | 1 load runner |

---

## Latest Captured Execution

| Area | Status |
|------|--------|
| API shell rerun | ${apiStatus ? `${apiStatus.executedSuites} suites captured, ${apiStatus.failedSuites} failed` : 'No artifact captured'} |
| Cypress rerun | ${cypressStatus ? `${cypressStatus.passedSpecs} passed specs, ${cypressStatus.failedSpecs} failed specs` : 'No artifact captured'} |
| Load runner | ${latestLoadReport ? latestLoadReport : 'No artifact captured'} |

---

## Latest Batch Latency Snapshot

Source artifact: tests/reports/cypress-performance-batch-latest.md

| Scenario | UI time (ms) | API time (ms) | Result count | 30s target |
|----------|-------------:|--------------:|-------------:|-----------|
${performanceSection}

---

## Recommended Next Step For Real Coverage

1. Instrument the Next.js app for browser coverage collection.
2. Merge browser coverage into nyc during Cypress runs.
3. Keep this summary report, but pair it with authoritative generated coverage artifacts.
`

await writeFile(reportPath, markdown)
console.log(`Wrote ${reportPath}`)
