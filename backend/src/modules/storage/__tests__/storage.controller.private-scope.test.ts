import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';

jest.mock('@/common/storage/private-url.service', () => ({
  verifyPrivateAccessToken: jest.fn(),
}));

jest.mock('@/common/storage/storage.service', () => ({
  storageService: {
    getPrivateObjectStream: jest.fn(),
  },
}));

import { verifyPrivateAccessToken } from '@/common/storage/private-url.service';
import { storageService } from '@/common/storage/storage.service';
import { storageController } from '../storage.controller';

describe('StorageController private scope', () => {
  const verifyMock = verifyPrivateAccessToken as jest.MockedFunction<typeof verifyPrivateAccessToken>;
  const streamMock = storageService.getPrivateObjectStream as jest.MockedFunction<
    typeof storageService.getPrivateObjectStream
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects signed tokens that point at public product refs', async () => {
    verifyMock.mockReturnValue({ ref: '/uploads/products/public.jpg' } as any);
    const next = jest.fn();

    await storageController.streamPrivateObject(
      { params: { token: 'tok' } } as unknown as Request,
      {} as Response,
      next as NextFunction,
    );

    expect(streamMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    const err = (next as jest.Mock).mock.calls[0][0] as Error;
    expect(err.message).toBe('storage.privateInvalidRef');
  });

  it('streams private profile refs', async () => {
    verifyMock.mockReturnValue({ ref: '/uploads/profile/user.jpg' } as any);
    const stream = Readable.from([Buffer.from('img')]);
    streamMock.mockResolvedValue({ stream, contentType: 'image/jpeg' } as any);

    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;

    // pipe is invoked on the readable stream
    const pipeSpy = jest.spyOn(stream, 'pipe').mockReturnValue(stream as any);

    await storageController.streamPrivateObject(
      { params: { token: 'tok' } } as unknown as Request,
      res,
      jest.fn() as NextFunction,
    );

    expect(streamMock).toHaveBeenCalledWith('/uploads/profile/user.jpg');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(pipeSpy).toHaveBeenCalled();
  });
});
