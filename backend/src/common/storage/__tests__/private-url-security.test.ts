import jwt from 'jsonwebtoken';
import { describe, expect, it } from '@jest/globals';
import { createPrivateAccessToken, verifyPrivateAccessToken } from '../private-url.service';
import { env } from '@/config/env';

describe('private URL security', () => {
  it('accepts a valid signed token', () => {
    const token = createPrivateAccessToken({ ref: '/uploads/profile/a.jpg' });
    expect(verifyPrivateAccessToken(token).ref).toBe('/uploads/profile/a.jpg');
  });

  it('rejects tampered tokens', () => {
    const token = createPrivateAccessToken({ ref: '/uploads/profile/a.jpg' });
    expect(() => verifyPrivateAccessToken(`${token}x`)).toThrow('storage.privateInvalidToken');
  });

  it('rejects malformed tokens', () => {
    expect(() => verifyPrivateAccessToken('not.a.jwt')).toThrow('storage.privateInvalidToken');
  });

  it('rejects expired tokens', () => {
    const token = jwt.sign(
      { ref: '/uploads/profile/a.jpg' },
      env.storage.privateUrlSigningSecret,
      { expiresIn: -10 }
    );
    expect(() => verifyPrivateAccessToken(token)).toThrow('storage.privateExpired');
  });

  it('rejects tokens with missing/invalid ref payload', () => {
    const token = jwt.sign({ foo: 'bar' }, env.storage.privateUrlSigningSecret, { expiresIn: 60 });
    expect(() => verifyPrivateAccessToken(token)).toThrow('storage.privateInvalidToken');
  });
});
