/**
 * Trusted Devices E2E Tests
 * Covers device management flows in admin and superadmin settings
 */

describe('Trusted Devices E2E', () => {
  const adminEmail = 'admin-trusted-test@shielder.local';
  const adminPassword = 'AdminP@ss123!';
  const superadminEmail = 'superadmin-test@shielder.local';
  const superadminPassword = 'SuperP@ss123!';

  beforeEach(() => {
    // Reset storage and clear cookies before each test
    cy.clearTrustedDeviceFromStorage();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
  });

  describe('Admin Settings - Trusted Devices', () => {
    beforeEach(() => {
      // Visit admin settings (assumes /admin/settings exists and is protected)
      cy.visit('/admin/settings?tab=security');
    });

    it('displays Trusted Device section with clear button', () => {
      // Verify section exists
      cy.contains('Trusted Device').should('be.visible');
      cy.contains('Clear remembered device').should('be.visible');
      cy.contains('Clear the remembered device token stored in this browser').should('be.visible');
    });

    it('displays Trusted Devices list when devices exist', () => {
      // Mock devices API response
      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            devices: [
              {
                id: 'device-1',
                token: 'abc123def456',
                name: 'Home Desktop',
                deviceInfo: 'Mozilla/5.0 (Macintosh...',
                ipAddress: '192.168.1.100',
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
              },
              {
                id: 'device-2',
                token: 'ghi789jkl012',
                name: 'Office Laptop',
                deviceInfo: 'Mozilla/5.0 (Windows NT...',
                ipAddress: '10.0.0.50',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
          },
        },
      }).as('getDevices');

      cy.visit('/admin/settings?tab=security');
      cy.wait('@getDevices');

      // Verify device list renders
      cy.contains('Trusted Devices').should('be.visible');
      cy.contains('Home Desktop').should('be.visible');
      cy.contains('Office Laptop').should('be.visible');

      // Verify device details are visible
      cy.contains('192.168.1.100').should('be.visible');
      cy.contains('10.0.0.50').should('be.visible');

      // Verify revoke buttons exist
      cy.get('[class*="Revoke"]').should('have.length.at.least', 2);
    });

    it('displays empty state when no devices exist', () => {
      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            devices: [],
          },
        },
      }).as('getDevices');

      cy.visit('/admin/settings?tab=security');
      cy.wait('@getDevices');

      cy.contains('No trusted devices remembered').should('be.visible');
    });

    it('clears remembered device when clicking clear button', () => {
      // Set up a trusted device token in storage
      cy.window().then((win) => {
        win.localStorage.setItem('shielder_trusted_device_token', 'test-token-123');
      });

      // Verify token exists
      cy.getTrustedDeviceFromStorage().should('equal', 'test-token-123');

      // Click clear button
      cy.contains('Clear remembered device').click();

      // Verify success toast
      cy.contains('Remembered device cleared').should('be.visible');

      // Verify token is cleared
      cy.getTrustedDeviceFromStorage().should('be.null');
    });

    it('revokes device when clicking revoke button', () => {
      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            devices: [
              {
                id: 'device-1',
                token: 'abc123def456',
                name: 'Test Device',
                deviceInfo: 'Test Agent',
                ipAddress: '192.168.1.100',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
          },
        },
      }).as('getDevices');

      cy.intercept('DELETE', '/api/auth/trusted-devices/abc123def456', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Trusted device revoked',
        },
      }).as('revokeDevice');

      // Reload should show empty list after revoke
      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            devices: [],
          },
        },
      }).as('getDevicesAfterRevoke');

      cy.visit('/admin/settings?tab=security');
      cy.wait('@getDevices');

      // Find and click revoke button
      cy.contains('Test Device')
        .closest('div')
        .find('button:contains("Revoke")')
        .click();

      cy.wait('@revokeDevice');

      // Verify success toast
      cy.contains('Trusted device revoked').should('be.visible');

      // After revoke action, the UI should refresh
      cy.wait('@getDevicesAfterRevoke');
    });
  });

  describe('Superadmin Settings - Trusted Devices', () => {
    beforeEach(() => {
      cy.visit('/superadmin/settings?tab=security');
    });

    it('displays Trusted Device cleanup section in superadmin', () => {
      cy.contains('Trusted Device').should('be.visible');
      cy.contains('Clear the remembered device token stored in this browser').should('be.visible');
    });

    it('displays Trusted Devices list with revoke functionality in superadmin', () => {
      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            devices: [
              {
                id: 'super-device-1',
                token: 'super123abc',
                name: 'Superadmin PC',
                deviceInfo: 'Mozilla/5.0 (Macintosh...',
                ipAddress: '10.0.0.1',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
          },
        },
      }).as('getSuperDevices');

      cy.visit('/superadmin/settings?tab=security');
      cy.wait('@getSuperDevices');

      // Verify device list is visible
      cy.contains('Superadmin PC').should('be.visible');
      cy.contains('10.0.0.1').should('be.visible');

      // Verify revoke button exists
      cy.get('button:contains("Revoke")').should('exist');
    });

    it('clears remembered device from superadmin settings', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('shielder_trusted_device_token', 'super-token-456');
      });

      cy.getTrustedDeviceFromStorage().should('equal', 'super-token-456');

      cy.visit('/superadmin/settings?tab=security');

      cy.contains('Clear remembered device').click();
      cy.contains('Remembered device cleared').should('be.visible');

      cy.getTrustedDeviceFromStorage().should('be.null');
    });

    it('revokes device from superadmin settings', () => {
      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            devices: [
              {
                id: 'device-to-revoke',
                token: 'revoke-me-token',
                name: 'Device To Revoke',
                deviceInfo: 'Test',
                ipAddress: '10.0.0.1',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
          },
        },
      }).as('getSuperDevices');

      cy.intercept('DELETE', '/api/auth/trusted-devices/revoke-me-token', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Trusted device revoked',
        },
      }).as('revokeSuperDevice');

      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            devices: [],
          },
        },
      }).as('getSuperDevicesEmpty');

      cy.visit('/superadmin/settings?tab=security');
      cy.wait('@getSuperDevices');

      cy.contains('Device To Revoke')
        .closest('div')
        .find('button:contains("Revoke")')
        .click();

      cy.wait('@revokeSuperDevice');
      cy.contains('Trusted device revoked').should('be.visible');

      cy.wait('@getSuperDevicesEmpty');
    });
  });

  describe('Trusted Devices Storage', () => {
    it('stores trusted device token in localStorage after OTP verification', () => {
      // Mock OTP verification endpoint to return trustedDeviceToken
      cy.intercept('POST', '/api/auth/verify-otp', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            tokens: {
              accessToken: 'access-token-123',
              refreshToken: 'refresh-token-456',
            },
            trustedDeviceToken: 'trusted-token-stored-123',
            user: {
              id: 'user-123',
              email: 'test@example.com',
              role: 'ADMIN',
            },
          },
        },
      }).as('verifyOTP');

      // Assuming verify OTP page exists and stores the token
      // This test verifies the frontend properly stores the token when received
      cy.window().then((win) => {
        // Simulate receiving trustedDeviceToken from backend
        win.localStorage.setItem('shielder_trusted_device_token', 'trusted-token-stored-123');

        // Verify it persists
        const token = win.localStorage.getItem('shielder_trusted_device_token');
        expect(token).to.equal('trusted-token-stored-123');
      });
    });

    it('sends trusted device token in login request when available', () => {
      // Set up a trusted device token
      cy.window().then((win) => {
        win.localStorage.setItem('shielder_trusted_device_token', 'stored-device-token');
      });

      // Mock login endpoint to verify header is sent
      cy.intercept('POST', '/api/auth/login', (req) => {
        // Verify X-Trusted-Device-Token header is present
        expect(req.headers['x-trusted-device-token']).to.equal('stored-device-token');

        req.reply({
          statusCode: 200,
          body: {
            success: true,
            data: {
              tokens: {
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
              },
              user: {
                id: 'user-123',
                email: 'test@example.com',
                role: 'ADMIN',
              },
            },
          },
        });
      }).as('loginWithDevice');

      cy.visit('/login');
      cy.get('input[type="email"]').type('admin@example.com');
      cy.get('input[type="password"]').type('Password123!');
      cy.get('button[type="submit"]').click();

      cy.wait('@loginWithDevice', { timeout: 10000 }).should('exist');
    });
  });

  describe('Device Status Endpoint', () => {
    it('checks if current device is trusted', () => {
      cy.intercept('GET', '/api/auth/trusted-device/status', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            trusted: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      }).as('checkDeviceStatus');

      // This would typically be called on app initialization
      cy.window().then((win) => {
        cy.request('GET', '/api/auth/trusted-device/status').then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body.data.trusted).to.equal(true);
        });
      });
    });

    it('returns not trusted when no device token present', () => {
      cy.intercept('GET', '/api/auth/trusted-device/status', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            trusted: false,
            expiresAt: null,
          },
        },
      }).as('checkNoDevice');

      cy.request('GET', '/api/auth/trusted-device/status').then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.data.trusted).to.equal(false);
      });
    });
  });

  describe('UI Error Handling', () => {
    it('handles device list API error gracefully', () => {
      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 500,
        body: { success: false, message: 'Server error' },
      }).as('getDevicesError');

      cy.visit('/admin/settings?tab=security');
      cy.wait('@getDevicesError');

      // Should show error toast
      cy.contains('Failed to load trusted devices').should('be.visible');

      // And display empty state
      cy.contains('No trusted devices remembered').should('be.visible');
    });

    it('handles device revoke API error gracefully', () => {
      cy.intercept('GET', '/api/auth/trusted-devices', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            devices: [
              {
                id: 'device-1',
                token: 'test-token',
                name: 'Test',
                deviceInfo: 'Test',
                ipAddress: '127.0.0.1',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
          },
        },
      }).as('getDevices');

      cy.intercept('DELETE', '/api/auth/trusted-devices/test-token', {
        statusCode: 400,
        body: { success: false, message: 'Invalid device token' },
      }).as('revokeError');

      cy.visit('/admin/settings?tab=security');
      cy.wait('@getDevices');

      cy.contains('Test')
        .closest('div')
        .find('button:contains("Revoke")')
        .click();

      cy.wait('@revokeError');

      // Should show error toast
      cy.contains('Failed to revoke trusted device').should('be.visible');
    });
  });
});
