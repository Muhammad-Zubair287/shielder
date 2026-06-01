import request from 'supertest';
import { createApp } from '@/app';

describe('Quotation create security validation', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  const authHeaders = {
    Authorization: 'Bearer mock-jwt-token',
    Accept: 'application/json',
  } as const;

  test('rejects customerName containing script tags with 400', async () => {
    const res = await request(app)
      .post('/api/quotations')
      .set(authHeaders)
      .send({
        customerName: '<script>alert(1)</script>',
        customerEmail: 'security-test@example.com',
        items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
        expiryDate: '2026-12-31T00:00:00.000Z',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message).toLowerCase()).toContain('invalid');
  });

  test("rejects customerName containing sql-like payload with 400", async () => {
    const res = await request(app)
      .post('/api/quotations')
      .set(authHeaders)
      .send({
        customerName: "' OR '1'='1",
        customerEmail: 'security-test@example.com',
        items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 1 }],
        expiryDate: '2026-12-31T00:00:00.000Z',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(String(res.body.message).toLowerCase()).toContain('invalid');
  });
});