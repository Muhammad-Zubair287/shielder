describe('Contact Us CAPTCHA (desktop required / mobile optional)', () => {
  // DirSync + LanguageProvider intentionally diverge from SSR until mount.
  Cypress.on('uncaught:exception', (err) => {
    if (
      /Hydration failed|error while hydrating|switch to client rendering|did not match|Minified React error #(418|423|425)/i.test(
        err.message
      )
    ) {
      return false;
    }
    return true;
  });

  const fillRequiredFields = () => {
    cy.get('#contact-first-name').should('be.visible').clear();
    cy.get('#contact-first-name').type('Jane');
    cy.get('#contact-last-name').clear();
    cy.get('#contact-last-name').type('Doe');
    cy.get('#contact-email').clear();
    cy.get('#contact-email').type('jane@example.com');
    cy.get('#contact-message').clear();
    cy.get('#contact-message').type('Hello from Cypress contact regression.');
  };

  const mockContactApis = () => {
    cy.intercept('GET', '**/settings/public*', {
      statusCode: 200,
      body: { success: true, data: {} },
    }).as('publicSettings');

    cy.intercept('POST', '**/contact*', {
      statusCode: 201,
      body: {
        success: true,
        message: 'Your message has been sent successfully.',
        data: { id: 'contact-test-1' },
      },
    }).as('contactSubmit');
  };

  it('desktop: CAPTCHA is visible and required before submit', () => {
    mockContactApis();
    cy.viewport(1440, 900);
    cy.visit('/contact', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'userAgent', {
          configurable: true,
          get: () =>
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        win.localStorage.setItem('shielder_locale', 'en');
      },
    });

    cy.get('[data-testid="contact-captcha"]', { timeout: 10000 }).should('exist');
    fillRequiredFields();
    cy.contains('button', /send/i).click();
    cy.get('@contactSubmit.all').should('have.length', 0);
    cy.contains(/robot|CAPTCHA|verify/i).should('exist');
  });

  it('mobile: CAPTCHA is hidden and submission succeeds without it', () => {
    mockContactApis();
    cy.viewport(390, 844);
    cy.visit('/contact', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'userAgent', {
          configurable: true,
          get: () =>
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        });
        win.localStorage.setItem('shielder_locale', 'en');
      },
    });

    // Wait for post-hydration device detection to settle before interacting.
    cy.get('button[type="submit"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="contact-captcha"]').should('not.exist');
    fillRequiredFields();
    cy.get('button[type="submit"]').click();
    cy.wait('@contactSubmit').its('request.body').should('exist');
    cy.contains(/sent|success|received/i).should('exist');
  });

  it('AR/RTL: contact form renders RTL and CAPTCHA remains optional on phone UA', () => {
    mockContactApis();
    cy.viewport(390, 844);
    cy.visit('/contact', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'userAgent', {
          configurable: true,
          get: () =>
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        });
        win.localStorage.setItem('shielder_locale', 'ar');
      },
    });

    cy.get('[dir="rtl"]', { timeout: 10000 }).should('exist');
    cy.get('button[type="submit"]').should('be.visible');
    cy.get('[data-testid="contact-captcha"]').should('not.exist');
    fillRequiredFields();
    cy.get('button[type="submit"]').click();
    cy.wait('@contactSubmit');
  });
});
