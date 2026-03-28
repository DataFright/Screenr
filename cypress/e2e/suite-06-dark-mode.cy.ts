/**
 * @fileoverview Suite 6: Dark Mode Tests
 * 
 * E2E tests verifying dark mode functionality:
 * - Default light mode on first visit
 * - Theme toggle button visibility and function
 * - Icon switching (sun/moon)
 * - Theme persistence in localStorage
 * - Theme restoration on page reload
 * - Accessibility (aria-labels, keyboard navigation)
 * 
 * @module cypress/e2e/suite-06-dark-mode
 */

/// <reference types="cypress" />
import 'cypress-file-upload'

/**
 * Dark Mode Test Suite
 * Tests theme switching and persistence
 */
describe('Suite 6: Dark Mode Tests', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
  })

  it('Test 6.1: Should default to light mode on first visit', () => {
    cy.log('Verifying default theme is light mode')
    cy.clearLocalStorage()
    cy.reload()
    cy.get('html').should('not.have.class', 'dark')
    cy.log('Application defaults to light mode')
  })

  it('Test 6.2: Should display theme toggle button', () => {
    cy.log('Checking theme toggle button exists')
    cy.get('button[aria-label*="Switch"]').should('exist')
    cy.get('button[aria-label*="Switch"]').should('be.visible')
    cy.log('Theme toggle button found and visible')
  })

  it('Test 6.3: Should show moon icon in light mode', () => {
    cy.log('Checking for moon icon in light mode')
    cy.get('button[aria-label*="Switch to dark"]').should('exist')
    cy.log('Moon icon found - indicates light mode is active')
  })

  it('Test 6.4: Should toggle to dark mode on click', () => {
    cy.log('Clicking theme toggle to switch to dark mode')
    cy.get('button[aria-label*="Switch to dark"]').click()
    cy.get('html').should('have.class', 'dark')
    cy.log('Successfully switched to dark mode')
  })

  it('Test 6.5: Should show sun icon in dark mode', () => {
    cy.log('Switching to dark mode first')
    cy.get('button[aria-label*="Switch to dark"]').click()
    cy.get('button[aria-label*="Switch to light"]').should('exist')
    cy.log('Sun icon found - indicates dark mode is active')
  })

  it('Test 6.6: Should toggle back to light mode', () => {
    cy.log('Switching to dark mode first')
    cy.get('button[aria-label*="Switch to dark"]').click()
    cy.get('html').should('have.class', 'dark')
    
    cy.log('Switching back to light mode')
    cy.get('button[aria-label*="Switch to light"]').click()
    cy.get('html').should('not.have.class', 'dark')
    cy.log('Successfully switched back to light mode')
  })

  it('Test 6.7: Should persist theme preference in localStorage', () => {
    cy.log('Setting dark mode')
    cy.get('button[aria-label*="Switch to dark"]').click()
    
    cy.log('Checking localStorage for theme preference')
    cy.window().then((win) => {
      const theme = win.localStorage.getItem('theme')
      expect(theme).to.equal('dark')
    })
    cy.log('Theme preference persisted correctly')
  })

  it('Test 6.8: Should restore theme from localStorage on reload', () => {
    cy.log('Setting dark mode')
    cy.get('button[aria-label*="Switch to dark"]').click()
    cy.get('html').should('have.class', 'dark')
    
    cy.log('Reloading page')
    cy.reload()
    cy.contains('Screenr', { timeout: 10000 }).should('be.visible')
    
    cy.log('Verifying dark mode persisted')
    cy.get('html').should('have.class', 'dark')
    cy.log('Theme restored correctly from localStorage')
  })

  it('Test 6.9: Should have accessible label for screen readers', () => {
    cy.log('Checking accessibility attributes')
    cy.get('button[aria-label*="Switch"]').should('have.attr', 'aria-label')
    cy.get('button[aria-label*="Switch"]').invoke('attr', 'aria-label').should('include', 'Switch')
    cy.log('Accessible label verified')
  })

  it('Test 6.10: Should be keyboard accessible', () => {
    cy.log('Testing keyboard accessibility via focus')
    cy.get('button[aria-label*="Switch"]').focus()
    cy.get('button[aria-label*="Switch"]').should('be.focused')
    cy.log('Theme toggle can receive focus - keyboard accessible')
  })
})
