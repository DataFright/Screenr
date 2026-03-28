/// <reference types="cypress" />
import '@cypress/code-coverage/support'

// Custom commands for resume testing
Cypress.Commands.add('uploadResumes', (filePaths: string[]) => {
  filePaths.forEach((filePath) => {
    cy.get('input[type="file"]').attachFile(filePath)
  })
})

Cypress.Commands.add('fillJobDetails', (title: string, description: string) => {
  cy.get('input[placeholder*="Senior"]').clear().type(title)
  cy.get('textarea').clear().type(description)
})

Cypress.Commands.add('submitGrading', () => {
  cy.contains('button', 'Grade Resumes').click()
})

Cypress.Commands.add('waitForGrading', () => {
  cy.contains('Grading Resumes...', { timeout: 5000 }).should('exist')
  cy.contains('Grading Resumes...', { timeout: 180000 }).should('not.exist')
})

Cypress.Commands.add('verifyGradingResults', (expectedCount: number) => {
  cy.get('[class*="Card"]', { timeout: 30000 }).should('have.length.at.least', expectedCount)
})

// Memory cleanup between tests
afterEach(() => {
  // Clear localStorage to free memory
  cy.window().then((win) => {
    win.localStorage.clear()
    win.sessionStorage.clear()
  })
  
  // Clear cookies
  cy.clearCookies({ log: false })
  
  // Clear local storage
  cy.clearLocalStorage({ log: false })
})

// Global error handling to prevent crashes
Cypress.on('uncaught:exception', (err) => {
  // Prevent test failures from uncaught exceptions in the app
  console.log('Uncaught exception:', err.message)
  return false
})

// Handle window errors
Cypress.on('window:before:load', (win) => {
  // Prevent memory leaks from event listeners
  win.addEventListener('error', (e) => {
    console.log('Window error:', e.message)
  })
})

// Type declarations for custom commands
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      uploadResumes(filePaths: string[]): Chainable<void>
      fillJobDetails(title: string, description: string): Chainable<void>
      submitGrading(): Chainable<void>
      waitForGrading(): Chainable<void>
      verifyGradingResults(expectedCount: number): Chainable<void>
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export {}
