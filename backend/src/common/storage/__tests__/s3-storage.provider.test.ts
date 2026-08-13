import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

describe('s3 storage provider', () => {
  beforeEach(() => {
    sendMock.mockReset();
    process.env.STORAGE_PROVIDER = 's3';
    process.env.PRODUCT_IMAGE_S3_BUCKET = 'test-bucket';
    process.env.PRODUCT_IMAGE_S3_ACCESS_KEY_ID = 'test-key';
    process.env.PRODUCT_IMAGE_S3_SECRET_ACCESS_KEY = 'test-secret';
  });

  it('stores and deletes objects using mocked S3 SDK calls', async () => {
    jest.resetModules();
    sendMock.mockResolvedValue({});

    const { S3StorageProvider } = await import('../providers/s3-storage.provider');
    const provider = new S3StorageProvider();

    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11, 0x22, 0x33, 0x44]);
    const stored = await provider.storeBuffer({
      scope: 'products',
      buffer: jpeg,
      contentType: 'image/jpeg',
      extension: '.jpg',
      ownerId: 'prod-1',
    });

    expect(stored.ref).toMatch(/^\/uploads\/products\//);
    expect(sendMock).toHaveBeenCalled();

    const deleted = await provider.deleteByRef(stored.ref);
    expect(deleted).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });
});
