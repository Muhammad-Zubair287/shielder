import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestError } from '../../../common/errors/api.error';

const clearCartMock = jest.fn();
const getCartMock = jest.fn();
const getCurrencyMock = jest.fn();

jest.mock('../cart.service', () => ({
  CartService: {
    clearCart: (...args: any[]) => clearCartMock(...args),
    getCart: (...args: any[]) => getCartMock(...args),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../../settings/settings.service', () => ({
  __esModule: true,
  default: {
    getCurrency: (...args: any[]) => getCurrencyMock(...args),
  },
}));

jest.mock('../../auth/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = {
      userId: 'user-1',
      preferredLanguage: 'en',
      role: 'USER',
      email: 'user@example.com',
    };
    next();
  },
}));

import cartRoutes from '../cart.routes';
import { errorHandler } from '../../../common/middleware/error.middleware';

describe('DELETE /api/cart/clear', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/cart', cartRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrencyMock.mockResolvedValue('SAR');
    getCartMock.mockResolvedValue({ id: 'cart-1', items: [] });
  });

  it('clears a populated cart and returns 200', async () => {
    clearCartMock.mockResolvedValue({ removedItems: 2 });

    const response = await request(app).delete('/api/cart/clear');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Cart cleared');
    expect(clearCartMock).toHaveBeenCalledWith('user-1');
  });

  it('returns 400 when cart is already empty', async () => {
    clearCartMock.mockRejectedValue(new BadRequestError('Cart is already empty'));

    const response = await request(app).delete('/api/cart/clear');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Cart is already empty');
  });

  it('returns 400 on repeated clear request after first success', async () => {
    clearCartMock
      .mockResolvedValueOnce({ removedItems: 1 })
      .mockRejectedValueOnce(new BadRequestError('Cart is already empty'));

    const first = await request(app).delete('/api/cart/clear');
    const second = await request(app).delete('/api/cart/clear');

    expect(first.status).toBe(200);
    expect(first.body.success).toBe(true);

    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
    expect(second.body.message).toBe('Cart is already empty');
  });
});
