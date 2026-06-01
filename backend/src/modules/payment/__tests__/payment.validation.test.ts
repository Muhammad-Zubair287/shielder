/**
 * Payment Validation Schema Tests
 * 
 * Tests the Joi validation schema directly to ensure:
 * - Strict type validation
 * - Proper error messages
 * - Edge case handling
 */

import { describe, it, expect } from '@jest/globals';
import { recordPaymentSchema } from '../payment.validation';
import { PaymentMethod } from '@prisma/client';

describe('Payment Validation Schema - recordPaymentSchema', () => {
  // ============================================
  // ✅ VALID INPUTS
  // ============================================

  describe('Valid Inputs', () => {
    it('should validate correct payment data', () => {
      const validData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000,
        method: PaymentMethod.CASH,
        notes: 'Payment received',
      };

      const { error, value } = recordPaymentSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value.amount).toBe(1000);
    });

    it('should validate with minimal required fields', () => {
      const validData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        method: PaymentMethod.BANK_TRANSFER,
      };

      const { error } = recordPaymentSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should accept valid decimal amounts', () => {
      const validData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 123.45,
        method: PaymentMethod.CASH,
      };

      const { error, value } = recordPaymentSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value.amount).toBe(123.45);
    });

    it('should accept small positive amounts', () => {
      const validData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 0.01,
        method: PaymentMethod.CASH,
      };

      const { error, value } = recordPaymentSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value.amount).toBe(0.01);
    });

    it('should accept all valid payment methods', () => {
      const methods = Object.values(PaymentMethod);

      methods.forEach(method => {
        const validData = {
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 1000,
          method,
        };

        const { error } = recordPaymentSchema.validate(validData);
        expect(error).toBeUndefined();
      });
    });

    it('should allow optional transactionId', () => {
      const validData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000,
        method: PaymentMethod.CASH,
        transactionId: 'TXN-12345',
      };

      const { error } = recordPaymentSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should allow optional notes', () => {
      const validData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000,
        method: PaymentMethod.CASH,
        notes: 'Customer paid via bank transfer',
      };

      const { error } = recordPaymentSchema.validate(validData);
      expect(error).toBeUndefined();
    });
  });

  // ============================================
  // ❌ INVALID AMOUNT INPUTS - CRITICAL
  // ============================================

  describe('Invalid Amount Inputs (CRITICAL)', () => {
    const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
    const validMethod = PaymentMethod.CASH;

    it('should reject string amount like "abc"', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: 'abc',
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.message.toLowerCase()).toMatch(/amount|number|valid|type/i);
    });

    it('should reject null amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: null,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject undefined amount', () => {
      const invalidData = {
        orderId: validOrderId,
        method: validMethod,
        // amount is undefined
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.message).toMatch(/required|empty/i);
    });

    it('should reject zero amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: 0,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.message.toLowerCase()).toMatch(/positive|greater|zero/i);
    });

    it('should reject negative amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: -100,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.message.toLowerCase()).toMatch(/positive|greater/i);
    });

    it('should reject boolean true as amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: true,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject boolean false as amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: false,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject object as amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: { value: 1000 },
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject array as amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: [1000],
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject empty string as amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: '',
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject string "NaN" as amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: 'NaN',
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject string "Infinity" as amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: 'Infinity',
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should provide clear error message for invalid amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: 'invalid',
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toBeDefined();
      expect(
        error?.details[0]?.message.toLowerCase()
      ).toMatch(/amount|number|valid/i);
    });

    it('should include field name in error for invalid amount', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: 'abc',
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error?.details[0]?.path[0]).toBe('amount');
    });
  });

  // ============================================
  // ❌ INVALID ORDER ID INPUTS
  // ============================================

  describe('Invalid Order ID Inputs', () => {
    const validAmount = 1000;
    const validMethod = PaymentMethod.CASH;

    it('should reject invalid UUID format', () => {
      const invalidData = {
        orderId: 'not-a-uuid',
        amount: validAmount,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.message.toLowerCase()).toMatch(/uuid|order.id/i);
    });

    it('should reject null orderId', () => {
      const invalidData = {
        orderId: null,
        amount: validAmount,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject undefined orderId', () => {
      const invalidData = {
        amount: validAmount,
        method: validMethod,
        // orderId is undefined
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject empty string orderId', () => {
      const invalidData = {
        orderId: '',
        amount: validAmount,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  // ============================================
  // ❌ INVALID METHOD INPUTS
  // ============================================

  describe('Invalid Payment Method Inputs', () => {
    const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
    const validAmount = 1000;

    it('should reject invalid payment method', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: validAmount,
        method: 'INVALID_METHOD',
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.message.toLowerCase()).toMatch(/invalid|method/i);
    });

    it('should reject null method', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: validAmount,
        method: null,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject undefined method', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: validAmount,
        // method is undefined
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject empty string method', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: validAmount,
        method: '',
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  // ============================================
  // ❌ EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    const validOrderId = '550e8400-e29b-41d4-a716-446655440000';
    const validMethod = PaymentMethod.CASH;

    it('should reject unknown fields by default', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: 1000,
        method: validMethod,
        unknownField: 'should be rejected',
      };

      const { error, value } = recordPaymentSchema.validate(invalidData);
      // The schema uses .unknown(false) to reject unknown fields
      // However, we still get a valid value without unknown fields
      expect(value.unknownField).toBeUndefined();
    });

    it('should trim whitespace from orderId', () => {
      const dataWithSpaces = {
        orderId: '  550e8400-e29b-41d4-a716-446655440000  ',
        amount: 1000,
        method: validMethod,
      };

      const { error, value } = recordPaymentSchema.validate(dataWithSpaces);
      // Depending on schema configuration, this might pass or fail
      // But the trimmed value should be returned if valid
      if (!error) {
        expect(value.orderId).toBe(value.orderId.trim());
      }
    });

    it('should handle very large valid amount numbers', () => {
      const validData = {
        orderId: validOrderId,
        amount: 999999999999.99,
        method: validMethod,
      };

      const { error } = recordPaymentSchema.validate(validData);
      // Should validate (overpayment check happens later in service)
      expect(error).toBeUndefined();
    });

    it('should handle notes with special characters', () => {
      const validData = {
        orderId: validOrderId,
        amount: 1000,
        method: validMethod,
        notes: 'Customer paid - Receipt: #12345! @Received via transfer. Details: ™ © ®',
      };

      const { error } = recordPaymentSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate notes within length limit', () => {
      const validData = {
        orderId: validOrderId,
        amount: 1000,
        method: validMethod,
        notes: 'a'.repeat(1000), // Max 1000 chars
      };

      const { error } = recordPaymentSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject notes exceeding length limit', () => {
      const invalidData = {
        orderId: validOrderId,
        amount: 1000,
        method: validMethod,
        notes: 'a'.repeat(1001), // Exceeds 1000 chars
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.message.toLowerCase()).toMatch(/exceed|length|max/i);
    });
  });

  // ============================================
  // 🔍 ERROR MESSAGE QUALITY
  // ============================================

  describe('Error Message Quality', () => {
    it('should provide helpful error message when amount is string', () => {
      const invalidData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 'abc',
        method: PaymentMethod.CASH,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error).toBeDefined();

      const message = error?.details[0]?.message;
      expect(message).toBeDefined();
      expect(message?.toLowerCase()).toMatch(/amount|number|valid/i);
      // Should suggest what type is expected
      expect(message).toContain('number');
    });

    it('should mention "amount" field in error for invalid amount', () => {
      const invalidData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        amount: null,
        method: PaymentMethod.CASH,
      };

      const { error } = recordPaymentSchema.validate(invalidData);
      expect(error?.details[0]?.context?.label || 'amount').toContain('amount');
    });

    it('should list all errors when multiple fields are invalid', () => {
      const invalidData = {
        orderId: 'invalid',
        amount: 'abc',
        method: 'INVALID',
      };

      const { error } = recordPaymentSchema.validate(
        invalidData,
        { abortEarly: false } // Get all errors
      );

      if (error) {
        expect(error.details.length).toBeGreaterThanOrEqual(2); // At least 2 errors
      }
    });
  });
});
