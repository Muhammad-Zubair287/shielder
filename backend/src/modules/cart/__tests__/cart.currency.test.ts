import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCartService = {
  getCart: jest.fn(),
};

const mockSettingsService = {
  getCurrency: jest.fn(),
};

jest.mock('../cart.service', () => ({
  CartService: mockCartService,
}));

jest.mock('../../settings/settings.service', () => ({
  __esModule: true,
  default: mockSettingsService,
}));

import { CartController } from '../cart.controller';

describe('CartController currency response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsService.getCurrency.mockResolvedValue('SAR');
  });

  it('returns SAR for an empty cart', async () => {
    mockCartService.getCart.mockResolvedValue({
      id: 'cart-1',
      items: [],
    });

    const req: any = {
      user: {
        userId: 'user-1',
        preferredLanguage: 'en',
      },
      headers: {},
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:4000'),
    };

    const json = jest.fn();
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json,
    };
    const next = jest.fn();

    await CartController.getCart(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          currency: 'SAR',
          totalAmount: 0,
          items: [],
        }),
      })
    );
  });
});