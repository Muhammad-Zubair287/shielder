// Cypress support file for E2E tests
// Add custom commands and hooks here

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('logout', () => {
  cy.visit('/');
  // Click profile menu or logout button
  cy.contains('Logout').click();
  cy.url().should('include', '/login');
});

Cypress.Commands.add('getTrustedDeviceFromStorage', () => {
  cy.window().then((win) => {
    return win.localStorage.getItem('shielder_trusted_device_token');
  });
});

Cypress.Commands.add('clearTrustedDeviceFromStorage', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('shielder_trusted_device_token');
    win.sessionStorage.removeItem('shielder_trusted_device_token');
  });
});

// Extend Cypress with custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      getTrustedDeviceFromStorage(): Chainable<string | null>;
      clearTrustedDeviceFromStorage(): Chainable<void>;
    }
  }
}

export {};
