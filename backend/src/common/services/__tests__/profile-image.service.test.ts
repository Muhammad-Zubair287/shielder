import { describe, expect, it } from '@jest/globals';
import { BadRequestError } from '../../errors/api.error';
import { validateProfileImageFile } from '../profile-image.service';

const makeFile = (buffer: Buffer, mimetype: string): Express.Multer.File => ({
  fieldname: 'profileImage',
  originalname: 'avatar',
  encoding: '7bit',
  mimetype,
  size: buffer.length,
  buffer,
  destination: '',
  filename: '',
  path: '',
  stream: undefined as any,
});

describe('profile image validation', () => {
  it('accepts valid jpeg, png and webp signatures', () => {
    expect(validateProfileImageFile(makeFile(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'))).toEqual({
      mimeType: 'image/jpeg',
      extension: '.jpg',
    });

    expect(
      validateProfileImageFile(
        makeFile(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png')
      )
    ).toEqual({
      mimeType: 'image/png',
      extension: '.png',
    });

    expect(validateProfileImageFile(makeFile(Buffer.from('RIFFxxxxWEBP', 'ascii'), 'image/webp'))).toEqual({
      mimeType: 'image/webp',
      extension: '.webp',
    });
  });

  it('rejects corrupted image bytes', () => {
    expect(() => validateProfileImageFile(makeFile(Buffer.from('not an image'), 'image/png'))).toThrow(BadRequestError);
  });

  it('rejects files whose declared type does not match their bytes', () => {
    expect(() => validateProfileImageFile(makeFile(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/png'))).toThrow(
      BadRequestError
    );
  });
});
