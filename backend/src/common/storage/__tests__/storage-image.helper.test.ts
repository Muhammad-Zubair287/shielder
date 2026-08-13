import { describe, expect, it } from '@jest/globals';
import {
  persistDataUrlImage,
  storeUploadedImageFile,
  deleteStoredRefSafe,
} from '../storage-image.helper';

const makeFile = (buffer: Buffer, mimetype: string): Express.Multer.File => ({
  fieldname: 'productImage',
  originalname: 'product.jpg',
  encoding: '7bit',
  mimetype,
  size: buffer.length,
  buffer,
  destination: '',
  filename: '',
  path: '',
  stream: undefined as any,
});

describe('storage image helper', () => {
  it('stores uploaded image files through StorageService', async () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11, 0x22, 0x33, 0x44]);
    const ref = await storeUploadedImageFile(makeFile(buffer, 'image/jpeg'), 'products', 'prod-1');
    expect(ref).toMatch(/\/uploads\/products\//);

    const deleted = await deleteStoredRefSafe(ref);
    expect(deleted).toBe(true);
  });

  it('persists data URL images after magic-byte validation', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11, 0x22, 0x33, 0x44]);
    const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    const ref = await persistDataUrlImage(dataUrl, 'excel-row-1');
    expect(ref).toMatch(/\/uploads\/products\//);
    await deleteStoredRefSafe(ref);
  });

  it('rejects spoofed data URL mime types', async () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const dataUrl = `data:image/jpeg;base64,${pngHeader.toString('base64')}`;
    await expect(persistDataUrlImage(dataUrl, 'excel-row-2')).rejects.toThrow('storage.imageTypeMismatch');
  });
});
