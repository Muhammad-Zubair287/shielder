import fs from 'fs';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  resolveAndStoreBulkProductImage,
  deleteStoredRefSafe,
  persistExistingPathImage,
} from '../storage-image.helper';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11, 0x22, 0x33, 0x44]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('Excel / bulk image StorageService resolution', () => {
  const productsDir = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads', 'products');
  const fixtureName = `excel-fixture-${Date.now()}.jpg`;
  const fixturePath = path.join(productsDir, fixtureName);
  const createdRefs: string[] = [];

  beforeEach(() => {
    fs.mkdirSync(productsDir, { recursive: true });
    fs.writeFileSync(fixturePath, jpeg);
  });

  afterEach(async () => {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);
    for (const ref of createdRefs.splice(0)) {
      await deleteStoredRefSafe(ref.startsWith('/') ? ref : `/${ref}`);
    }
  });

  it('stores bare filenames through StorageService (never keeps client path)', async () => {
    const ref = await resolveAndStoreBulkProductImage({
      rawImage: fixtureName,
      ownerId: 'excel-bare',
    });

    expect(ref).toBeDefined();
    expect(ref).toMatch(/^uploads\/products\//);
    expect(ref).not.toBe(`uploads/products/${fixtureName}`);
    createdRefs.push(ref!);
  });

  it('rejects path traversal attempts', async () => {
    await expect(
      resolveAndStoreBulkProductImage({
        rawImage: '../../etc/passwd',
        ownerId: 'excel-traverse',
      })
    ).rejects.toThrow('storage.privateInvalidRef');

    await expect(
      persistExistingPathImage('../secrets/key.pem', 'excel-traverse')
    ).rejects.toThrow('storage.privateInvalidRef');
  });

  it('rejects invalid / non-image payloads', async () => {
    await expect(
      resolveAndStoreBulkProductImage({
        rawImage: `data:image/png;base64,${Buffer.from('not-an-image').toString('base64')}`,
        ownerId: 'excel-invalid',
      })
    ).rejects.toThrow();
  });

  it('stores embedded image buffers after magic-byte validation', async () => {
    const ref = await resolveAndStoreBulkProductImage({
      embeddedBuffer: png,
      ownerId: 'excel-embedded',
    });
    expect(ref).toMatch(/^uploads\/products\//);
    createdRefs.push(ref!);
  });

  it('rejects private/localhost remote URLs (SSRF)', async () => {
    await expect(
      resolveAndStoreBulkProductImage({
        rawImage: 'http://127.0.0.1/secret.png',
        ownerId: 'excel-ssrf',
      })
    ).rejects.toThrow('storage.privateInvalidRef');

    await expect(
      resolveAndStoreBulkProductImage({
        rawImage: 'http://localhost/secret.png',
        ownerId: 'excel-ssrf',
      })
    ).rejects.toThrow('storage.privateInvalidRef');
  });

  it('rejects missing allowlisted local files', async () => {
    await expect(
      resolveAndStoreBulkProductImage({
        rawImage: 'definitely-missing-file-xyz.jpg',
        ownerId: 'excel-missing',
      })
    ).rejects.toThrow('storage.fileNotFound');
  });
});
