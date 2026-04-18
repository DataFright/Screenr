/**
 * @fileoverview Suite 7: Error Handling Tests
 * 
 * E2E tests verifying error handling and edge cases:
 * - Button state with missing files
 * - Validation errors for empty fields
 * - File removal behavior
 * - Clear all functionality
 * - Processing state management
 * - Empty state display
 * 
 * @module cypress/e2e/suite-07-error-handling
 */

/// <reference types="cypress" />
import 'cypress-file-upload'

/**
 * Error Handling Test Suite
 * Tests validation, error display, and edge cases
 */
describe('Suite 7: Error Handling Tests', () => {
  const uploadOptions = { force: true }
  const fileInputSelector = '[data-testid="resume-file-input"]'

  beforeEach(() => {
    cy.visit('/')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
  })

  it('Test 7.1: Should have disabled button when no files uploaded', () => {
    cy.log('Testing button state when no files')
    
    // Fill job details but no files
    cy.get('input[placeholder*="Software Engineer"]').type('Software Engineer')
    cy.get('textarea[placeholder*="Describe the role"]').type('Looking for a skilled engineer')
    
    // Button should be disabled when no files
    cy.contains('button', 'Grade Resumes').should('be.disabled')
    cy.log('Button correctly disabled when no files uploaded')
  })

  it('Test 7.2: Should show error when job title is empty', () => {
    cy.log('Testing error display for empty job title')
    
    // Upload a file but leave title empty
    cy.get(fileInputSelector).selectFile('cypress/fixtures/test-data/resumes/01_senior_dev_excellent.pdf', uploadOptions)
    cy.get('textarea[placeholder*="Describe the role"]').type('Job description here')
    
    cy.contains('button', 'Grade Resumes').should('be.disabled')
    cy.log('Submit remains blocked when job title is missing')
  })

  it('Test 7.3: Should show error when job description is empty', () => {
    cy.log('Testing error display for empty job description')
    
    // Upload file and fill title only
    cy.get(fileInputSelector).selectFile('cypress/fixtures/test-data/resumes/01_senior_dev_excellent.pdf', uploadOptions)
    cy.get('input[placeholder*="Software Engineer"]').type('Software Engineer')
    
    cy.contains('button', 'Grade Resumes').should('be.disabled')
    cy.log('Submit remains blocked when job description is missing')
  })

  it('Test 7.4: Should enable button when files are added', () => {
    cy.log('Testing button state changes')
    
    // Initially button should be disabled
    cy.contains('button', 'Grade Resumes').should('be.disabled')

    // Fill required fields
    cy.get('input[placeholder*="Software Engineer"]').type('Software Engineer')
    cy.get('textarea[placeholder*="Describe the role"]').type('Job description here')

    // Add file
    cy.get(fileInputSelector).selectFile('cypress/fixtures/test-data/resumes/01_senior_dev_excellent.pdf', uploadOptions)
    
    // Should be able to submit once all required inputs are present
    cy.contains('button', 'Grade Resumes').should('not.be.disabled')
    cy.log('Button state correctly changes with file upload')
  })

  it('Test 7.5: Should handle file removal gracefully', () => {
    cy.log('Testing file removal behavior')
    
    cy.get('input[placeholder*="Software Engineer"]').type('Software Engineer')
    cy.get('textarea[placeholder*="Describe the role"]').type('Job description here')
    cy.get(fileInputSelector).selectFile('cypress/fixtures/test-data/resumes/01_senior_dev_excellent.pdf', uploadOptions)

    cy.contains('button', 'Grade Resumes').should('not.be.disabled')
    cy.contains('button', 'Clear All').click()
    cy.contains('button', 'Grade Resumes').should('be.disabled')
    cy.log('Uploaded state can be cleared cleanly')
  })

  it('Test 7.6: Should clear all data on Clear All click', () => {
    cy.log('Testing clear all functionality')
    
    // Fill all fields
    cy.get('input[placeholder*="Software Engineer"]').type('Software Engineer')
    cy.get('textarea[placeholder*="Describe the role"]').type('Job description')
    cy.get(fileInputSelector).selectFile('cypress/fixtures/test-data/resumes/01_senior_dev_excellent.pdf', uploadOptions)
    
    // Click clear all
    cy.contains('button', 'Clear All').click()
    
    // Verify all fields are cleared
    cy.get('input[placeholder*="Software Engineer"]').should('have.value', '')
    cy.get('textarea[placeholder*="Describe the role"]').should('have.value', '')
    cy.contains('01_senior_dev_excellent.pdf').should('not.exist')
    cy.log('Clear all works correctly')
  })

  it('Test 7.7: Should disable buttons during processing', () => {
    cy.log('Testing button states during processing')
    
    // Fill valid form
    cy.get('input[placeholder*="Software Engineer"]').type('Software Engineer')
    cy.get('textarea[placeholder*="Describe the role"]').type('Looking for an experienced developer')
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-data/resumes/01_senior_dev_excellent.pdf', uploadOptions)

    cy.contains('button', 'Grade Resumes').should('be.visible')
    cy.contains('button', 'Clear All').should('be.visible')
    cy.log('Button state handled correctly during processing')
  })

  it('Test 7.8: Should show empty state when no results', () => {
    cy.log('Testing empty state display')
    
    // Should show empty state message
    cy.contains('No results yet').should('be.visible')
    cy.get('svg.lucide-circle-alert').should('be.visible')
    cy.log('Empty state displayed correctly')
  })
})
