/// <reference types="cypress" />

const performanceReportPath = 'tests/reports/cypress-performance-batch-latest.md'
const performanceFixturesRoot = 'tests/fixtures/performance'
const singleOneMbResume = [`${performanceFixturesRoot}/1mb/resume-01.pdf`]
const oneMbResumes = Array.from({ length: 10 }, (_, index) => `${performanceFixturesRoot}/1mb/resume-${String(index + 1).padStart(2, '0')}.pdf`)

type ResumeBinaryFixture = {
  fileName: string
  contents: Cypress.Buffer
}

type BatchScenarioKey = 'single' | 'ten' | 'all'

function getRequestedScenario(): BatchScenarioKey {
  const scenario = String(Cypress.env('batchScenario') ?? 'all').toLowerCase()

  if (scenario === 'single' || scenario === 'ten') {
    return scenario
  }

  return 'all'
}

function loadResumeFixtures(filePaths: string[]) {
  const loadedFixtures: ResumeBinaryFixture[] = []

  return cy.wrap(filePaths).each((filePath) => {
    cy.readFile(filePath, null).then((contents) => {
      loadedFixtures.push({
        fileName: filePath.split('/').pop() ?? 'resume.pdf',
        contents,
      })
    })
  }).then(() => loadedFixtures)
}

describe('Batch grading performance', () => {
  before(() => {
    if (getRequestedScenario() === 'ten') {
      return
    }

    const header = [
      '# Cypress Batch Performance Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '| Scenario | UI time (ms) | API time (ms) | Result count | 30s target |',
      '|----------|--------------:|--------------:|-------------:|-----------|',
      '',
    ].join('\n')

    cy.writeFile(performanceReportPath, header)
  })

  function runBatchScenario(scenarioName: string, filePaths: string[]) {
    cy.visit('/')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
    cy.get('#job-title').type('Senior Software Engineer')
    cy.get('#job-description').type('Looking for a senior engineer who can own architecture, delivery, and mentoring across complex web applications.')
    cy.intercept('POST', '**/api/grade').as('gradeRequest')

    loadResumeFixtures(filePaths).then((fixtures) => {
      const uploadPayload = fixtures.map((fixture) => ({
        contents: fixture.contents,
        fileName: fixture.fileName,
        mimeType: 'application/pdf',
      }))

      cy.get('input[type="file"]').selectFile(uploadPayload, { force: true })
      cy.contains('button', 'Grade Resumes').should('not.be.disabled')

      const startedAt = Date.now()
      cy.contains('button', 'Grade Resumes').click()

      cy.wait('@gradeRequest', { requestTimeout: 300000, responseTimeout: 300000 }).then((interception) => {
        const apiDurationMs = Number(interception.response?.headers['x-screenr-total-ms'] ?? 0)
        const results = interception.response?.body?.results ?? []
        const failedResults = results.filter((result: { candidateName?: string; overallScore?: number }) => {
          const candidateName = result.candidateName?.toLowerCase() ?? ''
          return candidateName.includes('error') || (result.overallScore ?? 0) <= 0
        })

        expect(results).to.have.length(filePaths.length)
        expect(failedResults, 'all resumes should grade successfully').to.have.length(0)

        const totalDurationMs = Date.now() - startedAt
        const thirtySecondTarget = totalDurationMs < 30000 ? 'met' : 'missed'
        const reportLine = `| ${scenarioName} | ${totalDurationMs} | ${apiDurationMs} | ${results.length} | ${thirtySecondTarget} |\n`

        cy.writeFile(performanceReportPath, reportLine, { flag: 'a+' })
        cy.log(`${scenarioName}: total ${totalDurationMs}ms, API ${apiDurationMs}ms, target ${thirtySecondTarget}`)
      })

      cy.get('[data-testid="graded-resume-card"]', { timeout: 300000 }).should('have.length', filePaths.length)
      cy.get('[data-testid="graded-resume-score"]').then(($scores) => {
        const scoreValues = Array.from($scores, (score) => Number.parseInt(score.textContent?.trim() ?? '0', 10))
        const sortedScores = [...scoreValues].sort((left, right) => right - left)
        expect(scoreValues).to.deep.equal(sortedScores)
      })
    })
  }

  it('measures click-to-results latency for 1 resume at ~1MB', () => {
    if (getRequestedScenario() === 'ten') {
      return
    }

    runBatchScenario('1 resume x ~1MB', singleOneMbResume)
  })

  it('measures click-to-results latency for 10 resumes at ~1MB each', () => {
    if (getRequestedScenario() === 'single') {
      return
    }

    runBatchScenario('10 resumes x ~1MB', oneMbResumes)
  })
})