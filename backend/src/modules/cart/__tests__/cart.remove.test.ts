import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError } from '../../../common/errors/api.error';

const removeItemMock = jest.fn();
const findCartItemMock = jest.fn();
const getCartMock = jest.fn();
const getCurrencyMock = jest.fn();

jest.mock('../cart.service', () => ({
  CartService: {
    findCartItem: (...args: any[]) => findCartItemMock(...args),
    removeItem: (...args: any[]) => removeItemMock(...args),
    getCart: (...args: any[]) => getCartMock(...args),
    clearCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
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
      email: 'customer@example.com',
    };
    next();
  },
}));

import cartRoutes from '../cart.routes';
import { errorHandler } from '../../../common/middleware/error.middleware';

describe('DELETE /api/cart/remove/:productId', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/cart', cartRoutes);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrencyMock.mockResolvedValue('SAR');
  });

  it('removes an existing cart item and returns 200', async () => {
    findCartItemMock.mockResolvedValue({ id: 'cart-item-1' });
    getCartMock.mockResolvedValue({
      id: 'cart-1',
      items: [],
    });
    removeItemMock.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/cart/remove/prod-1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Item removed from cart');
    expect(removeItemMock).toHaveBeenCalledWith('user-1', 'prod-1');
  });

  it('returns 404 for a fake or missing cart item', async () => {
    findCartItemMock.mockResolvedValue(null);

    const response = await request(app).delete('/api/cart/remove/fakeID');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Cart item not found');
    expect(removeItemMock).not.toHaveBeenCalled();
  });

  it('returns 404 when removing an already removed item', async () => {
    findCartItemMock
      .mockResolvedValueOnce({ id: 'cart-item-1' })
      .mockResolvedValueOnce(null);
    removeItemMock.mockResolvedValue(undefined);
    getCartMock.mockResolvedValue({
      id: 'cart-1',
      items: [],
    });

    const first = await request(app).delete('/api/cart/remove/prod-1');
    const second = await request(app).delete('/api/cart/remove/prod-1');

    expect(first.status).toBe(200);
    expect(second.status).toBe(404);
    expect(second.body.success).toBe(false);
    expect(second.body.message).toBe('Cart item not found');
  });
});