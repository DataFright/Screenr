/**
 * @fileoverview Suite 1: Page Load Tests
 * 
 * E2E tests verifying the main page loads correctly and displays
 * all required UI components in their initial state.
 * 
 * Tests covered:
 * - Main page accessibility (HTTP 200)
 * - All major sections visible (Job Details, Upload, Results)
 * - Initial UI state (disabled button, empty results)
 * - Required form elements present
 * 
 * @module cypress/e2e/suite-01-page-load
 */

/// <reference types="cypress" />
import 'cypress-file-upload'

/**
 * Page Load Test Suite
 * Verifies the application loads correctly with all expected elements
 */
describe('Suite 1: Page Load Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('Test 1.1: Should load the main page successfully', () => {
    cy.log('Checking main page loads')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
    cy.log('Page loaded successfully')
  })

  it('Test 1.2: Should display Job Details section', () => {
    cy.log('Checking Job Details section')
    cy.contains('Job Details').should('be.visible')
    cy.log('Job Details section found')
  })

  it('Test 1.3: Should display Upload Resumes section', () => {
    cy.log('Checking Upload Resumes section')
    cy.contains('Upload Resumes').should('be.visible')
    cy.log('Upload Resumes section found')
  })

  it('Test 1.4: Should display Grading Results section', () => {
    cy.log('Checking Grading Results section')
    cy.contains('Grading Results').should('be.visible')
    cy.log('Grading Results section found')
  })

  it('Test 1.5: Should have disabled grade button initially', () => {
    cy.log('Checking grade button is disabled')
    cy.contains('button', 'Grade Resumes').should('be.disabled')
    cy.log('Grade button correctly disabled')
  })

  it('Test 1.6: Should display privacy footer', () => {
    cy.log('Checking footer')
    cy.contains('processed in-memory').should('be.visible')
    cy.log('Footer found')
  })

  it('Test 1.7: Should have file input with PDF filter', () => {
    cy.log('Checking file input')
    cy.get('input[type="file"]').should('exist')
    cy.get('input[type="file"]').should('have.attr', 'accept', '.pdf')
    cy.log('File input with PDF filter found')
  })

  it('Test 1.8: Should have Clear All button', () => {
    cy.log('Checking Clear All button')
    cy.contains('button', 'Clear All').should('exist')
    cy.log('Clear All button found')
  })
})
