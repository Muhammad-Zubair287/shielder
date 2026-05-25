import request from 'supertest';
import { createApp } from '@/app';

describe('Signup XSS protection', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  test('rejects fullName containing script tags with 400', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `xss-test+${Date.now()}@example.com`,
        password: 'Aa!validpass1',
        fullName: '<script>alert(1)</script>',
        phoneNumber: '0555555555',
        address: '123 Main St',
      })
      .set('Accept', 'application/json');

    expect([400, 422]).toContain(res.status);
  });
});
