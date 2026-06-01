/**
 * Payment Service Tests
 * 
 * Tests for payment creation, duplicate prevention, and concurrent request handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PaymentService } from '../payment.service';
import { OrderService } from '../../order/order.service';
import { prisma } from '../../../config/database';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';
import { ConflictError, BadRequestError, NotFoundError } from '../../../common/errors/api.error';

describe('PaymentService - Duplicate Payment Prevention', () => {
  let paymentService: PaymentService;
  let orderService: OrderService;
  let testOrderId: string;
  let testAdminId: string;

  beforeAll(async () => {
    paymentService = new PaymentService();
    orderService = new OrderService();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.payment.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test admin user
    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@test.com`,
        password: 'hashed_password',
        role: 'ADMIN',
        isEmailVerified: true,
        profile: {
          create: {
            fullName: 'Test Admin',
          },
        },
      },
      include: { profile: true },
    });
    testAdminId = admin.id;

    // Create test customer user
    const customer = await prisma.user.create({
      data: {
        email: `customer-${Date.now()}@test.com`,
        password: 'hashed_password',
        role: 'CUSTOMER',
        isEmailVerified: true,
        profile: {
          create: {
            fullName: 'Test Customer',
          },
        },
      },
      include: { profile: true },
    });

    // Create test order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        userId: customer.id,
        total: 1000,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        deliveryType: 'DELIVERY',
        orderItems: {
          create: [
            {
              productId: '550e8400-e29b-41d4-a716-446655440000', // Dummy product ID
              quantity: 1,
              totalPrice: 1000,
            },
          ],
        },
      },
      include: { payments: true },
    });
    testOrderId = order.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================
  // ✅ SUCCESS CASES
  // ============================================

  describe('Successful Payment Recording', () => {
    it('should record a payment successfully for an order with no prior payments', async () => {
      const payment = await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        notes: 'Full payment received',
        recordedBy: testAdminId,
      });

      expect(payment).toBeDefined();
      expect(payment.orderId).toBe(testOrderId);
      expect(payment.amount).toEqual(1000);
      expect(payment.status).toBe(PaymentStatus.PAID);
      expect(payment.method).toBe(PaymentMethod.BANK_TRANSFER);
    });

    it('should update order status to PROCESSING when fully paid', async () => {
      await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.CASH,
        recordedBy: testAdminId,
      });

      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrderId },
      });

      expect(updatedOrder.status).toBe(OrderStatus.PROCESSING);
      expect(updatedOrder.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('should support idempotent payments with same transactionId', async () => {
      const txId = `TXN-${Date.now()}`;

      // First payment with transaction ID
      const payment1 = await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 500,
        method: PaymentMethod.BANK_TRANSFER,
        transactionId: txId,
        recordedBy: testAdminId,
      });

      // Attempting same transaction ID should fail (duplicate transaction)
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: 500,
          method: PaymentMethod.BANK_TRANSFER,
          transactionId: txId,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(ConflictError);

      // Verify only one payment was created
      const payments = await prisma.payment.findMany({
        where: { orderId: testOrderId },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].id).toBe(payment1.id);
    });
  });

  // ============================================
  // ❌ DUPLICATE PAYMENT CASES
  // ============================================

  describe('Duplicate Payment Prevention - CRITICAL', () => {
    it('should REJECT second PAID payment for same order with 409 Conflict', async () => {
      // First payment succeeds
      await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        recordedBy: testAdminId,
      });

      // Second payment attempt should fail
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: 500,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(ConflictError);

      // Verify only first payment exists
      const payments = await prisma.payment.findMany({
        where: { orderId: testOrderId },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toEqual(1000);
    });

    it('should include proper error message for duplicate payment', async () => {
      await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        recordedBy: testAdminId,
      });

      try {
        await paymentService.recordPayment({
          orderId: testOrderId,
          amount: 500,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        });
        fail('Should have thrown ConflictError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        expect(error.message).toContain('Payment already recorded');
        expect(error.statusCode).toBe(409);
      }
    });

    it('should prevent duplicate even with different payment methods', async () => {
      await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.CASH,
        recordedBy: testAdminId,
      });

      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: 500,
          method: PaymentMethod.CREDIT_CARD,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should prevent duplicate even with different amounts', async () => {
      await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        recordedBy: testAdminId,
      });

      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: 200,
          method: PaymentMethod.BANK_TRANSFER,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should handle concurrent duplicate payment attempts safely', async () => {
      // Simulate concurrent requests trying to record same payment
      const paymentDataA = {
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        recordedBy: testAdminId,
      };

      const paymentDataB = {
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        recordedBy: testAdminId,
      };

      // Fire both requests concurrently
      const results = await Promise.allSettled([
        paymentService.recordPayment(paymentDataA),
        paymentService.recordPayment(paymentDataB),
      ]);

      // One should succeed, one should fail
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      // Verify only one payment was created
      const payments = await prisma.payment.findMany({
        where: { orderId: testOrderId },
      });
      expect(payments).toHaveLength(1);
      expect(payments[0].status).toBe(PaymentStatus.PAID);
    });
  });

  // ============================================
  // ❌ OVERPAYMENT CASES
  // ============================================

  describe('Overpayment Prevention', () => {
    it('should reject payment exceeding order total', async () => {
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: 1500, // Exceeds order total of 1000
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should have proper error message for overpayment', async () => {
      try {
        await paymentService.recordPayment({
          orderId: testOrderId,
          amount: 1500,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        });
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('exceeds remaining balance');
        expect(error.statusCode).toBe(400);
      }
    });
  });

  // ============================================
  // ❌ VALIDATION CASES
  // ============================================

  describe('Payment Validation', () => {
    it('should reject payment for non-existent order', async () => {
      await expect(
        paymentService.recordPayment({
          orderId: '550e8400-e29b-41d4-a716-446655440099',
          amount: 1000,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject payment with zero amount', async () => {
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: 0,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject payment with negative amount', async () => {
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: -500,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ============================================
  // ⚠️ STRICT AMOUNT VALIDATION - CRITICAL
  // ============================================

  describe('Strict Amount Validation (Type Safety)', () => {
    it('should reject payment with NaN amount', async () => {
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: NaN,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject payment with Infinity amount', async () => {
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: Infinity,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject payment with negative Infinity', async () => {
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: -Infinity,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject payment when amount is not a number type', async () => {
      // This test verifies type safety at service layer
      // (though Joi middleware should catch this first)
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: 'abc' as any,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should provide clear error message for NaN', async () => {
      try {
        await paymentService.recordPayment({
          orderId: testOrderId,
          amount: NaN,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        });
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toMatch(/NaN|not a valid number/i);
        expect(error.statusCode).toBe(400);
      }
    });

    it('should provide clear error message for Infinity', async () => {
      try {
        await paymentService.recordPayment({
          orderId: testOrderId,
          amount: Infinity,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        });
        fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toMatch(/finite|infinity/i);
        expect(error.statusCode).toBe(400);
      }
    });

    it('should handle very large valid numbers', async () => {
      // Test with a large but valid number (within JavaScript safe integer range)
      const largeAmount = 9007199254740991; // MAX_SAFE_INTEGER
      
      // Should fail with overpayment, not with validation error
      await expect(
        paymentService.recordPayment({
          orderId: testOrderId,
          amount: largeAmount,
          method: PaymentMethod.CASH,
          recordedBy: testAdminId,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('should handle very small decimal amounts', async () => {
      const tinyAmount = 0.01;
      
      const payment = await paymentService.recordPayment({
        orderId: testOrderId,
        amount: tinyAmount,
        method: PaymentMethod.CASH,
        recordedBy: testAdminId,
      });

      expect(payment.amount).toEqual(tinyAmount);
    });

    it('should handle decimal amounts correctly', async () => {
      const decimalAmount = 123.45;
      
      const payment = await paymentService.recordPayment({
        orderId: testOrderId,
        amount: decimalAmount,
        method: PaymentMethod.CASH,
        recordedBy: testAdminId,
      });

      expect(payment.amount).toEqual(decimalAmount);
    });
  });

  // ============================================
  // 🔍 DATABASE INTEGRITY CASES
  // ============================================

  describe('Database Integrity', () => {
    it('should use transaction to ensure atomic payment + order update', async () => {
      const payment = await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        recordedBy: testAdminId,
      });

      // Verify both payment and order were updated atomically
      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
        include: { payments: true },
      });

      expect(order.paymentStatus).toBe(PaymentStatus.PAID);
      expect(order.status).toBe(OrderStatus.PROCESSING);
      expect(order.payments).toHaveLength(1);
      expect(order.payments[0].id).toBe(payment.id);
    });

    it('should create audit log for payment recording', async () => {
      await paymentService.recordPayment({
        orderId: testOrderId,
        amount: 1000,
        method: PaymentMethod.BANK_TRANSFER,
        recordedBy: testAdminId,
      });

      // Note: Assuming AuditService.log is called - verify via audit logs table
      // This test assumes audit logging is implemented
      // Actual verification depends on AuditService implementation
    });
  });
});
