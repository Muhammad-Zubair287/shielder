/**
 * Browser regression: checkout, mock EPG outcomes, refresh/back, EN/AR/RTL.
 * Requires backend on NEXT_PUBLIC_API_URL (default :5001) with EPG_PROVIDER=mock.
 */

// DirSync + LanguageProvider intentionally diverge from SSR until mount.
// React recovers; Cypress must not treat that as a product payment failure.
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

const API = Cypress.env('API_URL') || 'http://localhost:5001/api';
const EMAIL = 'e2e.pay2@shielder.test';
const PASSWORD = 'E2ePay@1234';
const PRODUCT_ID = 'eeb2f609-9f92-4531-95c3-9ef2245d565b';

function extractTokens(body: { data?: Record<string, unknown> }) {
  const data = (body?.data || {}) as {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
    tokens?: { accessToken?: string; refreshToken?: string };
  };
  return {
    accessToken: data.tokens?.accessToken || data.accessToken || '',
    refreshToken: data.tokens?.refreshToken || data.refreshToken || '',
    user: data.user,
  };
}

/** Cached across commands within a test run (set by ensureAuth). */
let cachedAuth: { accessToken: string; refreshToken: string; user: unknown } | null = null;

function ensureAuth(force = false) {
  if (cachedAuth && !force) {
    return cy.wrap(cachedAuth);
  }
  return cy.request({
    method: 'POST',
    url: `${API}/auth/login`,
    body: { email: EMAIL, password: PASSWORD },
    failOnStatusCode: false,
  }).then((res) => {
    if (res.status === 429) {
      throw new Error(`Login rate limited: ${JSON.stringify(res.body)}`);
    }
    expect(res.status).to.eq(200);
    expect(res.body.success).to.eq(true);
    const { accessToken, refreshToken, user } = extractTokens(res.body);
    expect(accessToken, 'login access token').to.have.length.greaterThan(10);
    cachedAuth = { accessToken, refreshToken, user };
    return cachedAuth;
  });
}

function injectAuth(win: Window) {
  if (!cachedAuth) throw new Error('cachedAuth missing — call ensureAuth first');
  win.sessionStorage.setItem('shielder_access_token', cachedAuth.accessToken);
  win.sessionStorage.setItem('shielder_refresh_token', cachedAuth.refreshToken);
  win.sessionStorage.setItem('shielder_user', JSON.stringify(cachedAuth.user));
}

function seedCart() {
  return ensureAuth().then(() => {
    const token = cachedAuth!.accessToken;
    return cy
      .request({
        method: 'DELETE',
        url: `${API}/cart/clear`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      })
      .then(() =>
        cy.request({
          method: 'POST',
          url: `${API}/cart/add`,
          headers: { Authorization: `Bearer ${token}` },
          body: { productId: PRODUCT_ID, quantity: 1 },
          failOnStatusCode: false,
        })
      )
      .then((res) => {
        expect([200, 201]).to.include(res.status);
      });
  });
}

function visitCheckout(locale: 'en' | 'ar' = 'en') {
  return ensureAuth().then(() => {
    cy.visit('/checkout', {
      onBeforeLoad(win) {
        injectAuth(win);
        win.localStorage.setItem('shielder_locale', locale);
      },
    });
  });
}

function waitForCheckoutForm() {
  cy.get('#checkout-customer-name', { timeout: 30000 }).should('be.visible');
  cy.get('button[type="submit"]').scrollIntoView().should('exist');
}

function fillCheckout(address: string) {
  cy.get('#checkout-customer-name').clear().type('E2E Customer');
  cy.get('#checkout-phone-number').clear().type('0501234567');
  cy.get('#checkout-shipping-address').scrollIntoView().clear().type(address);
}

function selectCardPayment() {
  cy.contains('button', /Debit \/ Credit Card|بطاقة/i).scrollIntoView().click({ force: true });
}

function placeOrderAndOpenMockEpg() {
  cy.intercept('POST', '**/epg/initialize').as('epgInit');
  selectCardPayment();
  cy.get('button[type="submit"]').scrollIntoView().click({ force: true });
  cy.wait('@epgInit', { timeout: 20000 }).then((interception) => {
    const body = interception.response?.body as { success?: boolean; data?: Record<string, unknown> };
    expect(body?.success).to.eq(true);
    const data = JSON.stringify(body?.data || {});
    expect(data).to.not.match(/secretKey|apiKey|passwordHash|DATABASE_URL|AWS_SECRET|absoluteDir/i);
    expect(body?.data).to.include.keys('paymentUrl', 'orderId', 'sessionId');
  });
  cy.location('pathname', { timeout: 20000 }).should('eq', '/dev/mock-epg');
}

describe('EPG payment browser regression', () => {
  beforeEach(() => {
    // Prefer fresh API login + onBeforeLoad injection over cy.session.
    // sessionStorage restore was flaky with AuthProvider spinner on /checkout.
    ensureAuth();
  });

  it('EN checkout, address validation, success, refresh, smart back, unpaid query', () => {
    seedCart();
    visitCheckout('en');
    waitForCheckoutForm();
    cy.document().its('documentElement.dir').should('eq', 'ltr');
    cy.contains(/Checkout/i).should('be.visible');

    fillCheckout('1234');
    cy.get('button[type="submit"]').scrollIntoView().click({ force: true });
    cy.contains(/at least 5 characters/i, { timeout: 15000 }).should('be.visible');
    cy.location('pathname').should('eq', '/checkout');

    fillCheckout('Warehouse 12, Industrial Area, Dubai');
    placeOrderAndOpenMockEpg();
    cy.contains(/mock epg terminal|test scenario/i).should('be.visible');
    cy.contains('button', /Successful payment/i).click();
    cy.location('pathname', { timeout: 20000 }).should('match', /\/order-confirmation\//);
    cy.contains(/Payment Successful!/i, { timeout: 15000 }).should('be.visible');

    cy.reload();
    cy.contains(/Payment Successful!/i, { timeout: 15000 }).should('be.visible');
    cy.get('h1').filter(':contains("Payment Successful")').should('have.length', 1);

    cy.go('back');
    cy.location('pathname', { timeout: 10000 }).should('not.include', '/dev/mock-epg');

    seedCart();
    visitCheckout('en');
    waitForCheckoutForm();
    fillCheckout('Warehouse 12, Industrial Area, Dubai');
    placeOrderAndOpenMockEpg();
    cy.contains('button', /Successful payment/i).click();
    cy.location('pathname', { timeout: 20000 }).should('match', /\/order-confirmation\//);
    cy.contains(/Payment Successful!/i, { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="smart-back-button"]', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
    cy.location('pathname', { timeout: 15000 }).should('eq', '/my-orders');
    cy.location('pathname').should('not.include', '/dev/mock-epg');

    cy.then(() => {
      const token = cachedAuth!.accessToken;
      return cy
        .request({
          method: 'POST',
          url: `${API}/orders`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            items: [{ productId: PRODUCT_ID, quantity: 1 }],
            shippingAddress: 'Warehouse 12, Industrial Area, Dubai',
            customerName: 'E2E Customer',
            phoneNumber: '0501234567',
            paymentMethod: 'CASH',
          },
        })
        .then((orderRes) => {
          const unpaidId = orderRes.body.data.id;
          cy.visit(`/order-confirmation/${unpaidId}?payment=success`, {
            onBeforeLoad(win) {
              injectAuth(win);
            },
          });
          cy.contains(/Payment Successful!/i).should('not.exist');
          cy.contains(/Order Placed Successfully!/i, { timeout: 15000 }).should('be.visible');
        });
    });
  });

  it('EN failed, cancelled, pending, duplicate mock session', () => {
    seedCart();
    visitCheckout('en');
    waitForCheckoutForm();
    fillCheckout('Warehouse 12, Industrial Area, Dubai');
    placeOrderAndOpenMockEpg();
    cy.contains('button', /Failed payment/i).click();
    cy.contains(/Payment was not completed|Payment Failed/i, { timeout: 20000 }).should('be.visible');
    cy.go('back');
    cy.location('pathname').should('not.eq', '/dev/mock-epg');

    seedCart();
    visitCheckout('en');
    waitForCheckoutForm();
    fillCheckout('Warehouse 12, Industrial Area, Dubai');
    placeOrderAndOpenMockEpg();
    cy.contains('button', /Cancelled payment/i).click();
    cy.contains(/Payment was cancelled/i, { timeout: 20000 }).should('be.visible');

    seedCart();
    visitCheckout('en');
    waitForCheckoutForm();
    fillCheckout('Warehouse 12, Industrial Area, Dubai');
    placeOrderAndOpenMockEpg();
    cy.contains('button', /Pending \(no callback\)/i).click();
    cy.contains(/still pending/i, { timeout: 20000 }).should('be.visible');
    cy.reload();
    cy.contains(/Payment Successful!/i).should('not.exist');
    cy.location('pathname').should('eq', '/dev/mock-epg');

    seedCart();
    visitCheckout('en');
    waitForCheckoutForm();
    fillCheckout('Warehouse 12, Industrial Area, Dubai');
    placeOrderAndOpenMockEpg();
    cy.url().then((url) => {
      cy.contains('button', /Successful payment/i).click();
      cy.location('pathname', { timeout: 20000 }).should('match', /\/order-confirmation\//);
      cy.visit(url, {
        onBeforeLoad(win) {
          injectAuth(win);
        },
      });
      cy.contains(/already been completed|cannot be executed again/i, { timeout: 15000 }).should(
        'be.visible'
      );
      cy.contains('button', /Successful payment/i).should('be.disabled');
    });
  });

  it('AR checkout, validation, RTL, then EN', () => {
    seedCart();
    visitCheckout('ar');
    waitForCheckoutForm();
    cy.document().its('documentElement.dir').should('eq', 'rtl');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 2);
    });
    cy.contains('إتمام الطلب').should('be.visible');

    fillCheckout('1234');
    cy.get('button[type="submit"]').scrollIntoView().click({ force: true });
    cy.contains('يجب أن يكون العنوان').should('be.visible');

    visitCheckout('en');
    waitForCheckoutForm();
    cy.document().its('documentElement.dir').should('eq', 'ltr');
    cy.contains(/Checkout/i).should('be.visible');
  });
});
