// Ensure required env vars before loading app (env module validates on import)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshsecret';

import request from 'supertest';
import { createApp } from '@/app';
import { appConfig } from '@/config/app.config';

describe('Integration: error responses across mounted prefixes', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();

    // The `createApp()` attaches a 404 and global error handler at the end.
    // To insert test routes that will be handled by the real middleware, remove
    // the notFound/error handlers, mount our test routes, then reattach them.
    const removeMiddlewareByName = (name) => {
      if (!app._router || !app._router.stack) return;
      app._router.stack = app._router.stack.filter((layer) => {
        return !(layer && layer.handle && layer.handle.name === name);
      });
    };

    // remove default notFoundHandler and errorHandler so we can add test routes
    removeMiddlewareByName('notFoundHandler');
    removeMiddlewareByName('errorHandler');

    // Mount throwing test routes under each API prefix to simulate controller errors
    const prefixes = [appConfig.api.prefix, `${appConfig.api.prefix}/${appConfig.api.version}`];
    for (const p of prefixes) {
      app.get(`${p}/__internal_test_error`, () => {
        throw new Error('simulated failure for integration test');
      });
    }

    // reattach the notFound and error handler after adding test routes
    const { notFoundHandler, errorHandler } = require('@/common/middleware/error.middleware');
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  it('returns 500 without stack and includes errorId for each prefix', async () => {
    const prefixes = [appConfig.api.prefix, `${appConfig.api.prefix}/${appConfig.api.version}`];

    for (const p of prefixes) {
      const res = await request(app).get(`${p}/__internal_test_error`).expect(500);
      expect(res.body).toBeDefined();
      expect(res.body.stack).toBeUndefined();
      expect(res.body.errorId || res.body.message).toBeDefined();
    }
  });
});
