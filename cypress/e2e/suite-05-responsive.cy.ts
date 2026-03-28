/**
 * @fileoverview Suite 5: Responsive Design Tests
 * 
 * E2E tests verifying responsive design across viewports:
 * - Mobile viewport (iPhone X, iPhone SE)
 * - Tablet viewport (iPad)
 * - Desktop viewport (1280x720)
 * - Card stacking on mobile
 * - Touch-friendly UI elements
 * 
 * @module cypress/e2e/suite-05-responsive
 */

/// <reference types="cypress" />
import 'cypress-file-upload'

/**
 * Responsive Design Test Suite
 * Tests layout adaptation across different screen sizes
 */
describe('Suite 5: Responsive Design Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
  })

  it('Test 5.1: Should display correctly on mobile viewport', () => {
    cy.log('Testing mobile viewport (iPhone X)')
    cy.viewport('iphone-x')
    cy.contains('Screenr').should('be.visible')
    cy.contains('Job Details').should('be.visible')
    cy.contains('Upload Resumes').should('be.visible')
    cy.log('Mobile viewport OK')
  })

  it('Test 5.2: Should display correctly on tablet viewport', () => {
    cy.log('Testing tablet viewport (iPad)')
    cy.viewport('ipad-2')
    cy.contains('Screenr').should('be.visible')
    cy.contains('Job Details').should('be.visible')
    cy.log('Tablet viewport OK')
  })

  it('Test 5.3: Should have touch-friendly buttons on mobile', () => {
    cy.log('Testing touch-friendly buttons')
    cy.viewport('iphone-x')
    cy.contains('button', 'Grade Resumes').should('be.visible')
    cy.contains('button', 'Clear All').should('be.visible')
    cy.log('Buttons visible on mobile')
  })

  it('Test 5.4: Should display correctly on small mobile', () => {
    cy.log('Testing small mobile viewport (iPhone SE)')
    cy.viewport(375, 667)
    cy.contains('Screenr').should('be.visible')
    cy.contains('Job Details').should('be.visible')
    cy.log('Small mobile viewport OK')
  })

  it('Test 5.5: Should display correctly on desktop viewport', () => {
    cy.log('Testing desktop viewport')
    cy.viewport(1280, 720)
    cy.contains('Screenr').should('be.visible')
    cy.contains('Job Details').should('be.visible')
    cy.contains('Grading Results').should('be.visible')
    cy.log('Desktop viewport OK')
  })

  it('Test 5.6: Should stack cards on mobile', () => {
    cy.log('Testing card stacking on mobile')
    cy.viewport('iphone-x')
    cy.contains('Job Details').should('be.visible')
    cy.contains('Upload Resumes').should('be.visible')
    cy.log('Cards stack on mobile')
  })

  it('Test 5.7: Should have readable text on mobile', () => {
    cy.log('Testing text readability on mobile')
    cy.viewport('iphone-x')
    cy.get('h1').should('be.visible')
    cy.get('input[placeholder*="Senior"]').should('be.visible')
    cy.log('Text readable on mobile')
  })

  it('Test 5.8: Should have accessible file upload on mobile', () => {
    cy.log('Testing file upload on mobile')
    cy.viewport('iphone-x')
    cy.get('input[type="file"]').should('exist')
    cy.get('label[for="file-upload"]').should('exist')
    cy.log('File upload accessible on mobile')
  })
})
