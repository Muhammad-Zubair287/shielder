import { describe, expect, it } from '@jest/globals';

import { createPrivateAccessToken, verifyPrivateAccessToken } from '../private-url.service';

describe('private url tokens', () => {
  it('creates and verifies a token', () => {
    const token = createPrivateAccessToken({ ref: '/uploads/profile/test.jpg' });
    const payload = verifyPrivateAccessToken(token);
    expect(payload.ref).toBe('/uploads/profile/test.jpg');
  });

  it('rejects tampered tokens', () => {
    const token = createPrivateAccessToken({ ref: '/uploads/profile/test.jpg' });
    const tampered = `${token.slice(0, -1)}a`;

    expect(() => verifyPrivateAccessToken(tampered)).toThrow();
  });
});

