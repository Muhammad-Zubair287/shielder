import { describe, expect, it } from '@jest/globals';
import { t } from '@/common/i18n';
import { resolveValidationMessage } from '@/common/middleware/validation.middleware';
import { orderValidation } from '@/modules/order/order.validation';

/**
 * Address / checkout validation localization for payment flows.
 */
describe('Checkout address validation localization', () => {
  it('returns localized EN/AR shipping address min message (not generic string.min)', () => {
    const { error } = orderValidation.createOrder.validate(
      {
        deliveryType: 'DELIVERY',
        shippingAddress: '1234',
        phoneNumber: '0501234567',
        customerName: 'Test User',
        paymentMethod: 'CREDIT_CARD',
        items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
      },
      { abortEarly: false },
    );

    expect(error).toBeDefined();
    const detail = error!.details.find((d) => d.path.join('.') === 'shippingAddress');
    expect(detail).toBeDefined();
    expect(detail!.message).toBe('validation.shippingAddressMin');

    const en = resolveValidationMessage(error!, 'en');
    const ar = resolveValidationMessage(error!, 'ar');

    expect(en).toBe(t('validation.shippingAddressMin', 'en', { limit: 5 }));
    expect(en.toLowerCase()).toContain('address');
    expect(en).toMatch(/5/);
    expect(ar).toBe(t('validation.shippingAddressMin', 'ar', { limit: 5 }));
    expect(ar).toMatch(/[\u0600-\u06FF]/);
    expect(en).not.toMatch(/^Must be at least 5 characters\.?$/);
  });

  it('resolves payment cancelled / failed message keys in EN and AR', () => {
    expect(t('payment.cancelled', 'en')).toMatch(/cancel/i);
    expect(t('payment.failed', 'en')).toMatch(/not completed/i);
    expect(t('payment.cancelled', 'ar')).toMatch(/[\u0600-\u06FF]/);
    expect(t('payment.failed', 'ar')).toMatch(/[\u0600-\u06FF]/);
    expect(t('payment.insufficientStockAfterPayment', 'ar')).toMatch(/[\u0600-\u06FF]/);
  });
});
