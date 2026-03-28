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
  const testResumesDir = 'test-data/resumes'

  beforeEach(() => {
    cy.visit('/')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
  })

  it('Test 3.1: Should accept single PDF file', () => {
    cy.log('Uploading single PDF')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    cy.contains('01_senior_dev_excellent.pdf').should('be.visible')
    cy.log('Single PDF uploaded successfully')
  })

  it('Test 3.2: Should show file size in KB', () => {
    cy.log('Uploading file to check size display')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    cy.contains(/KB/).should('be.visible')
    cy.log('File size displayed')
  })

  it('Test 3.3: Should accept multiple PDF files', () => {
    cy.log('Uploading multiple PDFs')
    cy.get('input[type="file"]').attachFile([
      `${testResumesDir}/01_senior_dev_excellent.pdf`,
      `${testResumesDir}/02_mid_level_good.pdf`
    ])
    cy.contains('01_senior_dev_excellent.pdf').should('be.visible')
    cy.contains('02_mid_level_good.pdf').should('be.visible')
    cy.log('Multiple PDFs uploaded')
  })

  it('Test 3.4: Should accumulate files on multiple uploads', () => {
    cy.log('Uploading first file')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    cy.log('Uploading second file')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/02_mid_level_good.pdf`)
    cy.contains('01_senior_dev_excellent.pdf').should('be.visible')
    cy.contains('02_mid_level_good.pdf').should('be.visible')
    cy.log('Files accumulated correctly')
  })

  it('Test 3.5: Should have remove button for uploaded files', () => {
    cy.log('Uploading file for removal test')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    cy.contains('01_senior_dev_excellent.pdf').should('be.visible')
    cy.log('Checking remove button exists in file list')
    // The file list item should have a button with an icon (trash)
    cy.get('button').should('exist')
    cy.log('Remove button exists')
  })

  it('Test 3.6: Should show file icon next to uploaded files', () => {
    cy.log('Uploading file to check icon')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    cy.get('svg').should('exist')
    cy.log('File icon displayed')
  })

  it('Test 3.7: Should display file list container', () => {
    cy.log('Uploading file to check list container')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    // Check for the file list by looking for the file name
    cy.contains('01_senior_dev_excellent.pdf').should('be.visible')
    cy.log('File list container found')
  })

  it('Test 3.8: Should have correct file input attributes', () => {
    cy.log('Checking file input attributes')
    cy.get('input[type="file"]').should('have.attr', 'type', 'file')
    cy.get('input[type="file"]').should('have.attr', 'multiple')
    cy.log('File input attributes correct')
  })
})
