process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshsecret';

import type { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '@/common/errors/api.error';
import { sanitizationMiddleware } from '../sanitize.middleware';

const runMiddleware = (body: Record<string, unknown>, locale = 'en') => {
  const req = { body, query: {}, locale } as unknown as Request;
  const next = jest.fn() as jest.MockedFunction<NextFunction>;
  sanitizationMiddleware(req, {} as Response, next);
  return { req, error: next.mock.calls[0]?.[0] };
};

describe('sanitizationMiddleware', () => {
  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<iframe src="malicious-site"></iframe>',
    "' OR '1'='1",
    '" OR "1"="1',
    'UNION SELECT * FROM users',
    'DROP TABLE users',
    'value -- comment',
  ])('rejects malicious plain text: %s', (value) => {
    const { error } = runMiddleware({ location: value });
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toBe('Invalid format.');
  });

  it('returns the selected-language API message', () => {
    const { error } = runMiddleware({ address: '<svg onload=alert(1)>' }, 'ar');
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toBe('صيغة غير صالحة.');
  });

  it('accepts normal address/location text', () => {
    const { error, req } = runMiddleware({ location: 'Riyadh', address: 'King Fahd Road 12' });
    expect(error).toBeUndefined();
    expect(req.body).toEqual({ location: 'Riyadh', address: 'King Fahd Road 12' });
  });

  it('also rejects malicious search/query values', () => {
    const req = { body: {}, query: { search: 'UNION SELECT' }, locale: 'en' } as unknown as Request;
    const next = jest.fn() as jest.MockedFunction<NextFunction>;
    sanitizationMiddleware(req, {} as Response, next);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(BadRequestError);
  });
});
