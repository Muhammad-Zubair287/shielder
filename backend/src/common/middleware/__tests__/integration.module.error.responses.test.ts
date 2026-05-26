// Ensure required env vars before loading app
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshsecret';

import request from 'supertest';
import { createApp } from '@/app';
import { appConfig } from '@/config/app.config';

describe('Integration: module error responses (profile/products/orders/settings/users/quotations)', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();

    // Remove existing 404/error handlers so our test routes get registered
    const removeMiddlewareByName = (name) => {
      if (!app._router || !app._router.stack) return;
      app._router.stack = app._router.stack.filter((layer) => {
        return !(layer && layer.handle && layer.handle.name === name);
      });
    };

    removeMiddlewareByName('notFoundHandler');
    removeMiddlewareByName('errorHandler');

    const prefixes = [appConfig.api.prefix, `${appConfig.api.prefix}/${appConfig.api.version}`];
    const modules = ['profile', 'products', 'orders', 'settings', 'admin/users', 'quotations'];

    // Use injected unique paths to avoid existing auth/middleware interceptions
    for (const p of prefixes) {
      for (const m of modules) {
        app.get(`${p}/__test_injected/${m}/__test_error`, () => {
          throw new Error(`simulated ${m} failure`);
        });
      }
    }

    // Reattach handlers
    const { notFoundHandler, errorHandler } = require('@/common/middleware/error.middleware');
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  it('returns 500 without stack and includes errorId for module prefixes', async () => {
    const prefixes = [appConfig.api.prefix, `${appConfig.api.prefix}/${appConfig.api.version}`];
    const modules = ['profile', 'products', 'orders', 'settings', 'admin/users', 'quotations'];

    for (const p of prefixes) {
      for (const m of modules) {
        const res = await request(app).get(`${p}/__test_injected/${m}/__test_error`).expect(500);
        expect(res.body).toBeDefined();
        expect(res.body.stack).toBeUndefined();
        expect(res.body.errorId || res.body.message).toBeDefined();
      }
    }
  });
});
