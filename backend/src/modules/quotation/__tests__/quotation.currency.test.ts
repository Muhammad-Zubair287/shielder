import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockPrisma: any = {
  quotation: {
    findUnique: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockSettingsService: any = {
  getCurrency: jest.fn(),
};

jest.mock('@/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/modules/settings/settings.service', () => ({
  __esModule: true,
  default: mockSettingsService,
}));

import { quotationService } from '../quotation.service';

describe('QuotationService currency response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsService.getCurrency.mockResolvedValue('SAR');
  });

  it('returns SAR on quotation details', async () => {
    mockPrisma.quotation.findUnique.mockResolvedValue({
      id: 'quotation-1',
      quotationNumber: 'QT-1',
      customerName: 'Test Customer',
      customerEmail: 'customer@example.com',
      items: [],
    });

    const result = await quotationService.getQuotationById('quotation-1');

    expect(result.currency).toBe('SAR');
    expect(result.quotationNumber).toBe('QT-1');
  });

  it('returns SAR on customer quotation list', async () => {
    mockPrisma.quotation.count.mockResolvedValue(1);
    mockPrisma.quotation.findMany.mockResolvedValue([
      {
        id: 'quotation-1',
        quotationNumber: 'QT-1',
        customerName: 'Test Customer',
        customerEmail: 'customer@example.com',
        items: [],
      },
    ]);

    const result = await quotationService.getMyQuotations('customer@example.com', {
      skip: 0,
      limit: 10,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].currency).toBe('SAR');
    expect(result.pagination.total).toBe(1);
  });
});