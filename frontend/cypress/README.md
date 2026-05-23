# Trusted Devices E2E Test Guide

## Overview
Comprehensive Cypress E2E tests for the trusted device management feature, covering admin and superadmin settings.

## Test Coverage

### Admin Settings Tests
- ✅ Display Trusted Device section with clear button
- ✅ List trusted devices when they exist
- ✅ Show empty state when no devices
- ✅ Clear remembered device from local storage
- ✅ Revoke individual devices
- ✅ Handle API errors gracefully

### Superadmin Settings Tests
- ✅ Display Trusted Device section
- ✅ List trusted devices with revoke buttons
- ✅ Clear remembered device
- ✅ Revoke devices
- ✅ Error handling

### Storage & API Tests
- ✅ Store trusted device token in localStorage after OTP
- ✅ Send token in login request headers (X-Trusted-Device-Token)
- ✅ Check device trust status endpoint
- ✅ Verify not-trusted response when no token

### Error Handling Tests
- ✅ Handle device list API failures
- ✅ Handle device revoke API failures
- ✅ Show appropriate error messages (toasts)

## Running the Tests

### Prerequisites
- Backend running on `http://localhost:5001/api`
- Frontend running on `http://localhost:3000`
- Cypress installed (`npm install cypress --save-dev`)

### Run All E2E Tests
```bash
cd frontend
npm run test:e2e
```

### Run Only Trusted Devices Tests
```bash
cd frontend
npx cypress run --spec "cypress/e2e/trusted-devices.cy.ts"
```

### Run Tests in Interactive Mode
```bash
cd frontend
npx cypress open
```
Then select "E2E Testing" and choose "trusted-devices.cy.ts"

### Run Tests with Video Recording
```bash
cd frontend
npx cypress run --spec "cypress/e2e/trusted-devices.cy.ts" --record
```

## Test Structure

### Support File (`cypress/support/e2e.ts`)
Custom Cypress commands:
- `cy.login(email, password)` - Login to application
- `cy.logout()` - Logout from application
- `cy.getTrustedDeviceFromStorage()` - Get token from localStorage
- `cy.clearTrustedDeviceFromStorage()` - Clear token from storage

### Test File (`cypress/e2e/trusted-devices.cy.ts`)
Organized into describe blocks:
1. **Admin Settings - Trusted Devices** - Admin interface tests
2. **Superadmin Settings - Trusted Devices** - Superadmin interface tests
3. **Trusted Devices Storage** - Token persistence tests
4. **Device Status Endpoint** - API endpoint tests
5. **UI Error Handling** - Error scenario tests

## Key Testing Patterns

### Mocking API Responses
Tests use `cy.intercept()` to mock backend endpoints:
```typescript
cy.intercept('GET', '/api/auth/trusted-devices', {
  statusCode: 200,
  body: { success: true, data: { devices: [...] } }
}).as('getDevices');
```

### Verifying UI Elements
Tests check for visibility and interaction:
```typescript
cy.contains('Trusted Devices').should('be.visible');
cy.get('button:contains("Revoke")').click();
```

### Testing Error Scenarios
Tests verify error handling:
```typescript
cy.intercept('DELETE', '/api/auth/trusted-devices/:token', {
  statusCode: 400,
  body: { success: false }
}).as('revokeError');
```

## Cross-Origin Considerations

These tests run against `localhost:3000` (frontend) and `localhost:5001` (backend API) to simulate the typical development setup. In production (Vercel + Railway), the cookie-based approach will be primary, with header fallback for cross-origin scenarios.

To test cross-origin:
1. Update `baseUrl` in `cypress.config.ts` to deployed frontend URL
2. Update API intercepts to point to deployed backend API
3. Update `supportFile` path if structure changes

## Continuous Integration

Add to your CI pipeline (GitHub Actions, etc.):
```yaml
- name: Install dependencies
  run: npm install
  
- name: Run Cypress tests
  run: npm run test:e2e
  
- name: Upload screenshots on failure
  uses: actions/upload-artifact@v2
  if: failure()
  with:
    name: cypress-screenshots
    path: cypress/screenshots
```

## Debugging Failed Tests

1. **Enable Video Recording**: Add `video: true` to `cypress.config.ts`
2. **Use Debug Mode**: `npx cypress run --debug`
3. **Inspect Network Calls**: Open DevTools in Cypress UI (press F12)
4. **Check Console Logs**: All cy.log() statements appear in DevTools
5. **Slow Down Execution**: Add `cy.pause()` to halt at specific points

## Best Practices

✅ Use data-testid attributes for reliable element selection  
✅ Mock all external API calls for consistent test behavior  
✅ Clear storage between tests to prevent state leakage  
✅ Use meaningful test descriptions  
✅ Keep tests focused on user workflows  
✅ Handle async operations with proper cy.wait()  

## Known Limitations

- Tests mock API responses; integration with real backend requires both servers running
- Authentication flows may need test user setup in backend
- Some UI transitions may need increased timeout values
- Cross-origin cookie testing requires deployed environments

## Future Enhancements

- [ ] Add API fixtures for realistic response payloads
- [ ] Create test user factory for backend integration
- [ ] Add performance benchmarks for device list rendering
- [ ] Test mobile responsive layouts
- [ ] Add accessibility checks
- [ ] Test with real 2FA OTP flow
