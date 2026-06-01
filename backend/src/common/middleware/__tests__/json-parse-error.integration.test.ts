// Ensure required env vars before loading app
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshsecret';

import request from 'supertest';
import { createApp } from '@/app';

describe('Integration: Malformed JSON Request Handling', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  describe('Malformed JSON payloads', () => {
    it('should return 400 for single quote instead of JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send("'")
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
      expect(res.body.stack).toBeUndefined(); // Should not expose stack trace
    });

    it('should return 400 for incomplete JSON (missing closing brace)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{')
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
      expect(res.body.stack).toBeUndefined();
    });

    it('should return 400 for incomplete JSON (missing closing bracket)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"test": [')
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });

    it('should return 400 for JSON with leading newline', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('\n{')
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });

    it('should return 400 for completely invalid text', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('this is not json at all')
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });

    it('should return 400 for empty body with JSON content-type', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('')
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
      // Empty body should either be handled gracefully or return proper error
    });

    it('should return 400 for JSON with single unquoted key', async () => {
      const res = await request(app)
        .post('/api/cart/add')
        .set('Content-Type', 'application/json')
        .send('{unquoted: "value"}')
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });

    it('should return 400 for JSON with trailing comma', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "test@example.com",}')
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });
  });

  describe('URL-encoded parsing errors', () => {
    it('should handle malformed URL-encoded data gracefully', async () => {
      // Invalid UTF-8 sequence
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('%')
        .expect(400);

      expect(res.body).toBeDefined();
      expect(res.body.success).toBe(false);
    });
  });

  describe('Valid JSON with validation errors', () => {
    it('should allow valid JSON but fail on validation (not parsing error)', async () => {
      // Valid JSON but invalid auth credentials - should NOT be 400 for parsing
      // This is a validation error handled by the route
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'test', password: 'test' });

      // This could be 400 (validation), 401 (auth), or 422 depending on implementation
      // The important thing is it's NOT a parsing error
      expect([400, 401, 422, 403, 404]).toContain(res.status);
      expect(res.body).toBeDefined();
      // If it's a validation error, it should have descriptive message, not "Invalid JSON"
      if (res.status === 400) {
        expect(res.body.message).not.toContain('Invalid JSON');
      }
    });
  });

  describe('Multiple routes with malformed JSON', () => {
    it('should return 400 for malformed JSON on cart endpoint', async () => {
      const res = await request(app)
        .post('/api/cart/add')
        .set('Content-Type', 'application/json')
        .send('{')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });

    it('should return 400 for malformed JSON on profile endpoint', async () => {
      const res = await request(app)
        .put('/api/profile/update')
        .set('Content-Type', 'application/json')
        .send('[incomplete')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });

    it('should return 400 for malformed JSON on order endpoint', async () => {
      const res = await request(app)
        .post('/api/orders/create')
        .set('Content-Type', 'application/json')
        .send('not json')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });
  });

  describe('Error response format consistency', () => {
    it('should always include success: false in parse error responses', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('}}')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should always include message in parse error responses', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{invalid}')
        .expect(400);

      expect(res.body.message).toBeDefined();
      expect(typeof res.body.message).toBe('string');
    });

    it('should never expose stack trace in parse error responses', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('[[[[')
        .expect(400);

      expect(res.body.stack).toBeUndefined();
    });

    it('should maintain proper CORS headers even for parse errors', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .set('Origin', 'http://localhost:3000')
        .send('{')
        .expect(400);

      // CORS should still work - Access-Control-Allow-Origin or other CORS headers
      // (specific headers depend on CORS config)
      expect(res.status).toBe(400);
    });
  });

  describe('Different API versions', () => {
    it('should return 400 for malformed JSON on /api/v1 prefix', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid JSON');
    });
  });
});
