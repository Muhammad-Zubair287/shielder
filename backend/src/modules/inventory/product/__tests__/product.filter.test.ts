import { ProductController } from '../product.controller';
import { productService } from '../product.service';
import { productValidation } from '../product.validation';

jest.mock('@/common/services/product-image.service', () => ({
  deleteProductImageTempFile: jest.fn(),
  resolvePublicProductImageUrl: jest.fn((_, value) => value),
  storeProductImageFile: jest.fn(),
}));

describe('product price filtering', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('accepts zero values and preserves them in query validation', () => {
    const result = productValidation.list.validate({ minPrice: 0, maxPrice: 0, page: 1, limit: 12 });

    expect(result.error).toBeUndefined();
    expect(result.value.minPrice).toBe(0);
    expect(result.value.maxPrice).toBe(0);
  });

  test('rejects a max price smaller than the min price', () => {
    const result = productValidation.list.validate({ minPrice: 500, maxPrice: 100, page: 1, limit: 12 });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Maximum price must be greater than or equal to minimum price');
  });

  test('controller preserves numeric zero values when building service filters', async () => {
    const controller = new ProductController();
    const filterProductsSpy = jest.spyOn(productService, 'filterProducts').mockResolvedValue({
      products: [],
      total: 0,
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
    } as never);

    const req = {
      query: {
        minPrice: '0',
        maxPrice: '0',
        page: '1',
        limit: '12',
        locale: 'en',
      },
    } as any;

    const res = {
      json: jest.fn(),
    } as any;

    const next = jest.fn();

    await controller.list(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(filterProductsSpy).toHaveBeenCalledWith(expect.objectContaining({
      minPrice: 0,
      maxPrice: 0,
    }));
    expect(res.json).toHaveBeenCalled();
  });
});
