import fs from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

import { LocalStorageProvider } from '../providers/local-storage.provider';

describe('local storage provider', () => {
  it('stores and deletes objects by ref', async () => {
    const provider = new LocalStorageProvider();

    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11, 0x22]);

    const stored = await provider.storeBuffer({
      scope: 'profiles',
      buffer: jpegBuffer,
      contentType: 'image/jpeg',
      extension: '.jpg',
      ownerId: 'user-1',
    });

    expect(stored.ref).toMatch(/^\/uploads\/profile\//);

    const normalized = stored.ref.trim().replace(/\\/g, '/').replace(/^\/+/, '');
    // normalized = uploads/profile/<file>
    const relative = normalized.replace(/^uploads\//, '');
    const absolute = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads', relative);

    expect(fs.existsSync(absolute)).toBe(true);

    const deleted = await provider.deleteByRef(stored.ref);
    expect(deleted).toBe(true);
    expect(fs.existsSync(absolute)).toBe(false);
  });
});

