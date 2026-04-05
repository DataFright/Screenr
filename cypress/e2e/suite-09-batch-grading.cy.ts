/// <reference types="cypress" />

type MockResumeResult = {
  fileName: string
  candidateName: string
  email: string
  phone: string
  overallScore: number
  professionalism: {
    score: number
    explanation: string
  }
  qualifications: {
    score: number
    explanation: string
  }
  workExperience: {
    score: number
    explanation: string
  }
}

const oneMbResumes = Array.from(
  { length: 10 },
  (_, index) => `tests/fixtures/performance/1mb/resume-${String(index + 1).padStart(2, '0')}.pdf`
)

function createSuccessfulResume(index: number): MockResumeResult {
  const score = 95 - index

  return {
    fileName: `resume-${String(index + 1).padStart(2, '0')}.pdf`,
    candidateName: `Candidate ${index + 1}`,
    email: `candidate${index + 1}@example.com`,
    phone: '555-0101',
    overallScore: score,
    professionalism: {
      score,
      explanation: 'Well structured and readable.',
    },
    qualifications: {
      score,
      explanation: 'Strong match for the role.',
    },
    workExperience: {
      score,
      explanation: 'Relevant recent experience.',
    },
  }
}

function createProcessingErrorResume(index: number): MockResumeResult {
  return {
    fileName: `resume-${String(index + 1).padStart(2, '0')}.pdf`,
    candidateName: 'Processing Error',
    email: '',
    phone: '',
    overallScore: 0,
    professionalism: {
      score: 0,
      explanation: 'AI service is temporarily unavailable',
    },
    qualifications: {
      score: 0,
      explanation: 'AI service is temporarily unavailable',
    },
    workExperience: {
      score: 0,
      explanation: 'AI service is temporarily unavailable',
    },
  }
}

describe('Suite 9: Batch Grading Reliability', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
    cy.get('#job-title').type('Senior Software Engineer')
    cy.get('#job-description').type('Looking for a senior engineer who can lead delivery and mentor the team.')
    cy.get('input[type="file"]').selectFile(oneMbResumes, { force: true })
    cy.contains('button', 'Grade Resumes').should('not.be.disabled')
  })

  it('Test 9.1: Should surface partial grading failures clearly', () => {
    const partialResults = [
      createSuccessfulResume(0),
      createSuccessfulResume(1),
      ...Array.from({ length: 8 }, (_, index) => createProcessingErrorResume(index + 2)),
    ]

    cy.intercept('POST', '**/api/grade', {
      statusCode: 200,
      body: {
        success: true,
        results: partialResults,
      },
    }).as('gradeRequest')

    cy.contains('button', 'Grade Resumes').click()

    cy.wait('@gradeRequest')
    cy.get('[data-testid="graded-resume-card"]').should('have.length', 10)
    cy.get('[data-testid="graded-resume-score"]').then(($scores) => {
      const scoreValues = Array.from($scores, (score) => Number.parseInt(score.textContent?.trim() ?? '0', 10))
      expect(scoreValues.slice(0, 2)).to.deep.equal([95, 94])
      expect(scoreValues.slice(2).every((score) => score === 0)).to.equal(true)
    })
    cy.contains('[data-testid="graded-resume-card"]', 'Candidate 1').should('exist')
    cy.contains('[data-testid="graded-resume-card"]', 'Candidate 2').should('exist')
    cy.contains('[data-testid="graded-resume-card"]', 'Processing Error').should('exist')
    cy.get('[data-sonner-toast]').should('contain.text', 'Graded 2 resumes successfully, 8 failed')
  })

  it('Test 9.2: Should treat a full 10 resume batch as successful only when all grades succeed', () => {
    const successfulResults = Array.from({ length: 10 }, (_, index) => createSuccessfulResume(index))

    cy.intercept('POST', '**/api/grade', {
      statusCode: 200,
      body: {
        success: true,
        results: successfulResults,
      },
    }).as('gradeRequest')

    cy.contains('button', 'Grade Resumes').click()

    cy.wait('@gradeRequest')
    cy.get('[data-testid="graded-resume-card"]').should('have.length', 10)
    cy.get('[data-testid="graded-resume-score"]').then(($scores) => {
      const scoreValues = Array.from($scores, (score) => Number.parseInt(score.textContent?.trim() ?? '0', 10))
      expect(scoreValues.every((value) => value > 0)).to.equal(true)
    })
    cy.contains('Processing Error').should('not.exist')
    cy.get('[data-sonner-toast]').should('contain.text', 'Successfully graded 10 resumes')
  })
})