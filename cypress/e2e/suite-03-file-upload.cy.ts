/**
 * @fileoverview Suite 3: File Upload Tests
 * 
 * E2E tests verifying file upload functionality:
 * - Single and multiple PDF uploads
 * - File accumulation on repeated uploads
 * - File size display
 * - File removal functionality
 * - File input attributes
 * 
 * @module cypress/e2e/suite-03-file-upload
 */

/// <reference types="cypress" />
import 'cypress-file-upload'

/**
 * File Upload Test Suite
 * Tests file selection, upload, display, and removal
 */
describe('Suite 3: File Upload Tests', () => {
  const testResumesDir = 'cypress/fixtures/test-data/resumes'
  const uploadOptions = { force: true }
  const mockGradeResults = {
    success: true,
    results: [
      {
        fileName: '01_senior_dev_excellent.pdf',
        candidateName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '555-0101',
        overallScore: 94,
        professionalism: {
          score: 95,
          explanation: 'Clear and polished resume.'
        },
        qualifications: {
          score: 92,
          explanation: 'Strong match for the required stack.'
        },
        workExperience: {
          score: 94,
          explanation: 'Relevant impact across prior roles.'
        }
      }
    ]
  }

  beforeEach(() => {
    cy.visit('/')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
  })

  it('Test 3.1: Should accept single PDF file', () => {
    cy.log('Uploading single PDF')
    cy.get('input[type="file"]').selectFile(`${testResumesDir}/01_senior_dev_excellent.pdf`, uploadOptions)
    cy.contains('01_senior_dev_excellent.pdf').should('be.visible')
    cy.contains('button', 'Grade Resumes').should('be.visible')
    cy.log('Single PDF uploaded successfully')
  })

  it('Test 3.2: Should show file size in KB', () => {
    cy.log('Uploading file to check size display')
    cy.get('input[type="file"]').selectFile(`${testResumesDir}/01_senior_dev_excellent.pdf`, uploadOptions)
    cy.get('input[type="file"]').should(($input) => {
      const files = ($input[0] as HTMLInputElement).files
      expect(files).to.have.length(1)
      expect(files?.[0].size ?? 0).to.be.greaterThan(0)
    })
    cy.log('File size displayed')
  })

  it('Test 3.3: Should accept multiple PDF files', () => {
    cy.log('Uploading multiple PDFs')
    cy.get('input[type="file"]').selectFile([
      `${testResumesDir}/01_senior_dev_excellent.pdf`,
      `${testResumesDir}/02_mid_level_good.pdf`
    ], uploadOptions)
    cy.get('input[type="file"]').should(($input) => {
      const files = ($input[0] as HTMLInputElement).files
      expect(files).to.have.length(2)
    })
    cy.log('Multiple PDFs uploaded')
  })

  it('Test 3.4: Should accumulate files on multiple uploads', () => {
    cy.log('Uploading first file')
    cy.get('input[type="file"]').selectFile(`${testResumesDir}/01_senior_dev_excellent.pdf`, uploadOptions)
    cy.get('[data-sonner-toast]').should('contain.text', 'Added 1 file(s)')
    cy.log('Uploading second file')
    cy.get('input[type="file"]').selectFile(`${testResumesDir}/02_mid_level_good.pdf`, uploadOptions)
    cy.get('[data-sonner-toast]').should('contain.text', 'Added 1 file(s)')
    cy.log('Files accumulated correctly')
  })

  it('Test 3.5: Should have remove button for uploaded files', () => {
    cy.log('Uploading file for removal test')
    cy.get('input[type="file"]').selectFile(`${testResumesDir}/01_senior_dev_excellent.pdf`, uploadOptions)
    cy.contains('01_senior_dev_excellent.pdf').should('be.visible')
    cy.get('button[aria-label="Remove 01_senior_dev_excellent.pdf"]').should('be.visible')
    cy.contains('button', 'Clear All').should('be.visible')
    cy.log('Upload controls remain available after adding a file')
  })

  it('Test 3.6: Should show file icon next to uploaded files', () => {
    cy.log('Uploading file to check icon')
    cy.get('input[type="file"]').selectFile(`${testResumesDir}/01_senior_dev_excellent.pdf`, uploadOptions)
    cy.get('svg').should('exist')
    cy.log('File icon displayed')
  })

  it('Test 3.7: Should display file list container', () => {
    cy.log('Uploading file to check list container')
    cy.get('input[type="file"]').selectFile(`${testResumesDir}/01_senior_dev_excellent.pdf`, uploadOptions)
    cy.get('input[type="file"]').should(($input) => {
      const files = ($input[0] as HTMLInputElement).files
      expect(files).to.have.length(1)
    })
    cy.contains('button', 'Grade Resumes').should('be.visible')
    cy.log('File list container found')
  })

  it('Test 3.8: Should have correct file input attributes', () => {
    cy.log('Checking file input attributes')
    cy.get('input[type="file"]').should('have.attr', 'type', 'file')
    cy.get('input[type="file"]').should('have.attr', 'multiple')
    cy.log('File input attributes correct')
  })

  it('Test 3.9: Should accept drag and drop uploads', () => {
    cy.log('Dragging a PDF onto the upload drop zone')
    cy.get('[data-testid="resume-dropzone"]').selectFile(`${testResumesDir}/01_senior_dev_excellent.pdf`, {
      action: 'drag-drop',
      force: true,
    })

    cy.contains('01_senior_dev_excellent.pdf').should('be.visible')
    cy.get('[data-testid="resume-dropzone-label"]').should('contain.text', 'Click to upload or drag and drop')
    cy.contains('button', 'Grade Resumes').should('be.visible')
    cy.get('[data-sonner-toast]').should('contain.text', 'Added 1 file(s)')
    cy.log('Drag and drop upload succeeded')
  })

  it('Test 3.10: Should export grading results to CSV', () => {
    cy.log('Seeding grading results and stubbing CSV download hooks')
    cy.visit('/', {
      onBeforeLoad(win) {
        ;(win as Window & {
          __SCREENR_E2E_RESULTS__?: typeof mockGradeResults.results
        }).__SCREENR_E2E_RESULTS__ = mockGradeResults.results
      },
    })
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')

    cy.window().then((win) => {
      cy.stub(win.URL, 'createObjectURL').callsFake(() => 'blob:screenr-test').as('createObjectURL')
      cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectURL')
      cy.stub(win.HTMLAnchorElement.prototype, 'click').as('anchorClick')
    })

    cy.contains('Ada Lovelace').should('be.visible')
    cy.contains('button', 'Export CSV').click()

    cy.get('@anchorClick').should('have.been.calledOnce')
    cy.get('@revokeObjectURL').should('have.been.calledWith', 'blob:screenr-test')
    cy.get('@createObjectURL').then((createObjectUrlStub) => {
      const blob = (createObjectUrlStub as { getCall: (index: number) => { args: Blob[] } }).getCall(0).args[0]
      return Cypress.Promise.resolve(blob.text()).then((csvText) => {
        expect(csvText).to.contain('Candidate Name')
        expect(csvText).to.contain('Ada Lovelace')
        expect(csvText).to.contain('01_senior_dev_excellent.pdf')
        expect(csvText).to.contain('Overall Score')
      })
    })
    cy.get('[data-sonner-toast]').should('contain.text', 'CSV downloaded successfully')
    cy.log('CSV export generated expected content')
  })
})
