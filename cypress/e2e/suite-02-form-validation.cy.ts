/**
 * @fileoverview Suite 2: Form Validation Tests
 * 
 * E2E tests verifying form input behavior and validation:
 * - Job title and description input
 * - File upload functionality
 * - Clear All functionality
 * - Toast notifications
 * - Button state management
 * 
 * @module cypress/e2e/suite-02-form-validation
 */

/// <reference types="cypress" />
import 'cypress-file-upload'

/**
 * Form Validation Test Suite
 * Tests form inputs, validation, and state management
 */
describe('Suite 2: Form Validation Tests', () => {
  const testResumesDir = 'test-data/resumes'

  beforeEach(() => {
    cy.visit('/')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
  })

  it('Test 2.1: Should enable grade button after filling form', () => {
    cy.log('Filling job title')
    cy.get('input[placeholder*="Senior"]').type('Software Engineer')
    cy.log('Filling job description')
    cy.get('textarea').type('Looking for a developer')
    cy.log('Uploading file')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    cy.log('Checking button is enabled')
    cy.contains('button', 'Grade Resumes').should('not.be.disabled')
    cy.log('Button correctly enabled')
  })

  it('Test 2.2: Should clear all form data when clicking Clear All', () => {
    cy.log('Filling form with data')
    cy.get('input[placeholder*="Senior"]').type('Software Engineer')
    cy.get('textarea').type('Looking for a developer')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    cy.log('Clicking Clear All')
    cy.contains('button', 'Clear All').click()
    cy.log('Checking form is cleared')
    cy.get('input[placeholder*="Senior"]').should('have.value', '')
    cy.get('textarea').should('have.value', '')
    cy.log('Form cleared successfully')
  })

  it('Test 2.3: Should show toast notification when clearing', () => {
    cy.log('Filling form')
    cy.get('input[placeholder*="Senior"]').type('Software Engineer')
    cy.get('input[type="file"]').attachFile(`${testResumesDir}/01_senior_dev_excellent.pdf`)
    cy.log('Clicking Clear All')
    cy.contains('button', 'Clear All').click()
    cy.log('Checking toast notification')
    cy.contains('cleared', { timeout: 5000 }).should('be.visible')
    cy.log('Toast notification shown')
  })

  it('Test 2.4: Should have textarea for job description', () => {
    cy.log('Checking textarea exists')
    cy.get('textarea').should('exist')
    cy.get('textarea').should('be.visible')
    cy.log('Textarea found')
  })

  it('Test 2.5: Should accept text input in job title', () => {
    cy.log('Typing in job title field')
    cy.get('input[placeholder*="Senior"]').type('Senior React Developer')
    cy.get('input[placeholder*="Senior"]').should('have.value', 'Senior React Developer')
    cy.log('Job title input works')
  })

  it('Test 2.6: Should accept text in job description', () => {
    cy.log('Typing in job description')
    cy.get('textarea').type('Looking for a skilled developer with React experience')
    cy.get('textarea').should('include.value', 'skilled developer')
    cy.log('Job description input works')
  })

  it('Test 2.7: Should show empty state before grading', () => {
    cy.log('Checking empty state message')
    cy.contains('No results yet').should('be.visible')
    cy.log('Empty state shown')
  })

  it('Test 2.8: Should have upload area with instructions', () => {
    cy.log('Checking upload area')
    cy.contains('Click to upload').should('be.visible')
    cy.contains('PDF files only').should('be.visible')
    cy.log('Upload instructions found')
  })
})
