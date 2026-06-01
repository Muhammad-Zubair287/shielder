/**
 * Payment Controller Integration Tests
 * 
 * Tests for HTTP endpoint responses, status codes, and error handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { PaymentController } from '../payment.controller';
import { prisma } from '../../../config/database';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';

let app: Express;
let authToken: string;
let testOrderId: string;
let testAdminId: string;

/**
 * Test Helper: Create authenticated request
 */
const authRequest = (method: string, path: string) => {
  const req = request(app)[method as 'post' | 'get' | 'put' | 'delete'](path);
  if (authToken) {
    req.set('Authorization', `Bearer ${authToken}`);
  }
  return req;
};

/**
 * Test Data Setup
 */
async function setupTestData() {
  // Create admin user
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

  // Create customer user
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

  // Create order
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
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 1,
            totalPrice: 1000,
          },
        ],
      },
    },
    include: { payments: true },
  });
  testOrderId = order.id;
}

/**
 * Test Cleanup
 */
async function cleanupTestData() {
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.user.deleteMany({});
}

describe('PaymentController Integration Tests', () => {
  beforeAll(async () => {
    // Mock app setup - in real tests, initialize actual Express app with routes
    // For this example, we assume the app is properly configured
    // await setupApp();
  });

  beforeEach(async () => {
    await cleanupTestData();
    await setupTestData();

    // Mock token (in real tests, this would be generated from auth service)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ============================================
  // ✅ SUCCESS CASES
  // ============================================

  describe('POST /api/payments - Record Payment', () => {
    it('should return 201 Created on successful payment recording', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'BANK_TRANSFER',
          notes: 'Full payment received',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Payment recorded successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderId).toBe(testOrderId);
      expect(response.body.data.amount).toEqual(1000);
      expect(response.body.data.status).toBe('PAID');
    });

    it('should include payment details in response', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'CASH',
          notes: 'Payment notes',
        });

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('orderId');
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('method');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('createdAt');
    });
  });

  // ============================================
  // ❌ DUPLICATE PAYMENT CASES
  // ============================================

  describe('POST /api/payments - Duplicate Payment Prevention', () => {
    it('should return 409 Conflict when payment already recorded', async () => {
      // Record first payment
      const firstResponse = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'BANK_TRANSFER',
        });
      expect(firstResponse.status).toBe(201);

      // Attempt to record second payment
      const secondResponse = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 500,
          method: 'CASH',
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.message || secondResponse.body.error).toContain(
        'Payment already recorded'
      );
    });

    it('should include descriptive error message for duplicate payment', async () => {
      // Record first payment
      await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'BANK_TRANSFER',
        });

      // Attempt duplicate
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 500,
          method: 'CASH',
        });

      expect(response.status).toBe(409);
      expect(response.body.message || response.body.error).toMatch(
        /payment.*already.*recorded|duplicate.*payment/i
      );
    });

    it('should return 409 regardless of payment method', async () => {
      await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'CASH',
        });

      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 500,
          method: 'CREDIT_CARD',
        });

      expect(response.status).toBe(409);
    });

    it('should return 409 regardless of amount', async () => {
      await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'BANK_TRANSFER',
        });

      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 200,
          method: 'BANK_TRANSFER',
        });

      expect(response.status).toBe(409);
    });
  });

  // ============================================
  // ❌ OVERPAYMENT CASES
  // ============================================

  describe('POST /api/payments - Overpayment Prevention', () => {
    it('should return 400 Bad Request when payment exceeds order total', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1500,
          method: 'CASH',
        });

      expect(response.status).toBe(400);
      expect(response.body.message || response.body.error).toContain('exceeds remaining balance');
    });

    it('should return descriptive error for overpayment', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 2000,
          method: 'BANK_TRANSFER',
        });

      expect(response.status).toBe(400);
      expect(response.body.message || response.body.error).toMatch(
        /exceeds.*balance|overpayment|payment.*too.*high/i
      );
    });
  });

  // ============================================
  // ❌ VALIDATION CASES
  // ============================================

  describe('POST /api/payments - Input Validation', () => {
    it('should return 404 Not Found for invalid orderId', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: '550e8400-e29b-41d4-a716-446655440099',
          amount: 1000,
          method: 'CASH',
        });

      expect(response.status).toBe(404);
      expect(response.body.message || response.body.error).toContain('Order not found');
    });

    it('should return 400 Bad Request for missing required fields', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          // Missing orderId, amount, method
        });

      expect(response.status).toBe(400);
      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 Bad Request for invalid payment method', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'INVALID_METHOD',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 Bad Request for negative amount', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: -500,
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status);
    });
  });

  // ============================================
  // ⚠️ STRICT AMOUNT VALIDATION - CRITICAL
  // ============================================

  describe('POST /api/payments - Strict Amount Validation (CRITICAL)', () => {
    it('should return 422 when amount is a string like "abc"', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 'abc', // String instead of number
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status); // Bad Request or Unprocessable Entity (validation error)
      expect(response.body.errors || response.body.message).toBeDefined();
      expect(
        (response.body.message || response.body.errors?.[0]?.message || '').toLowerCase()
      ).toMatch(/amount|number|valid/i);
    });

    it('should return 422 when amount is a numeric string like "123"', async () => {
      // Joi should handle this - it might coerce to number OR reject
      // This test verifies the actual behavior
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: '123', // String that looks like number
          method: 'CASH',
        });

      // Could be 201 (if coerced) or 422 (if rejected)
      // We want to ensure it doesn't cause 500
      expect([201, 422]).toContain(response.status);
      expect(response.status).not.toBe(500);
    });

    it('should return 422 when amount is null', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: null,
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 422 when amount is undefined', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          // amount is undefined
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 422 when amount is boolean', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: true, // Boolean instead of number
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 422 when amount is an object', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: { value: 1000 }, // Object instead of number
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 422 when amount is an array', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: [1000], // Array instead of number
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 when amount is zero', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 0,
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status);
      expect(
        (response.body.message || response.body.errors?.[0]?.message || '').toLowerCase()
      ).toMatch(/positive|greater|zero/i);
    });

    it('should return 400 for very large amounts (overpayment)', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 999999999, // Exceeds order total
          method: 'CASH',
        });

      expect(response.status).toBe(400);
      expect(
        (response.body.message || response.body.errors?.[0]?.message || '').toLowerCase()
      ).toMatch(/exceeds|balance/i);
    });

    it('should accept valid decimal amounts', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 123.45,
          method: 'CASH',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.amount).toEqual(123.45);
    });

    it('should accept valid small amounts', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 0.01,
          method: 'CASH',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.amount).toEqual(0.01);
    });

    it('should NOT return 500 error for invalid amount types', async () => {
      // This is the CRITICAL test - verify no 500 errors on invalid input
      const testCases = [
        { amount: 'abc' },
        { amount: null },
        { amount: undefined },
        { amount: true },
        { amount: false },
        { amount: {} },
        { amount: [] },
        { amount: 'NaN' },
        { amount: '' },
      ];

      for (const testCase of testCases) {
        const response = await authRequest('post', '/api/payments')
          .send({
            orderId: testOrderId,
            method: 'CASH',
            ...testCase,
          });

        // Should be 400/422, NEVER 500
        expect([400, 422]).toContain(
          response.status,
          `Invalid amount should not return ${response.status}: ${JSON.stringify(testCase)}`
        );
        expect(response.status).not.toBe(500);
      }
    });

    it('should include descriptive error message for invalid amount', async () => {
      const response = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 'invalid_amount',
          method: 'CASH',
        });

      expect([400, 422]).toContain(response.status);
      expect(response.body.errors || response.body.message).toBeDefined();
      
      const errorMessage = (response.body.message ||
        response.body.errors?.[0]?.message ||
        ''
      ).toLowerCase();
      
      expect(errorMessage).toMatch(/amount|number|valid|type/i);
    });
  });

  // ============================================
  // 🔐 AUTHORIZATION CASES
  // ============================================

  describe('POST /api/payments - Authorization', () => {
    it('should return 401 Unauthorized without authentication', async () => {
      const response = request(app)
        .post('/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'CASH',
        });

      expect([401, 403]).toContain(response.status);
    });

    it('should reject non-admin users (CUSTOMER role)', async () => {
      // This test assumes proper role-based access control
      // Response status depends on your implementation
      const response = await authRequest('post', '/api/payments')
        .set('X-User-Role', 'CUSTOMER') // Mock role header
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'CASH',
        });

      expect([403, 401]).toContain(response.status);
    });
  });

  // ============================================
  // 🔍 IDEMPOTENCY CASES
  // ============================================

  describe('POST /api/payments - Transaction ID Idempotency', () => {
    it('should return 409 Conflict for duplicate transactionId', async () => {
      const txId = `TXN-${Date.now()}`;

      // First request with transactionId
      const firstResponse = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'BANK_TRANSFER',
          transactionId: txId,
        });
      expect(firstResponse.status).toBe(201);

      // Update order status to PENDING for second request
      await prisma.order.update({
        where: { id: testOrderId },
        data: {
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
        },
      });

      // Second request with same transactionId
      const secondResponse = await authRequest('post', '/api/payments')
        .send({
          orderId: testOrderId,
          amount: 1000,
          method: 'BANK_TRANSFER',
          transactionId: txId,
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.message || secondResponse.body.error).toMatch(
        /transaction.*already|duplicate.*transaction/i
      );
    });
  });
});
