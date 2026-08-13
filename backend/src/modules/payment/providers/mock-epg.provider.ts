/**
 * Development-only mock EPG provider.
 * Simulates external gateway I/O — does NOT bypass internal payment verification.
 */

import crypto from 'crypto';
import { env } from '../../../config/env';
import { logger } from '../../../common/logger/logger';
import type {
  CreateGatewaySessionParams,
  CreateGatewaySessionResult,
  PaymentGatewayProvider,
  PaymentGatewayRefundResult,
  RefundGatewayPaymentParams,
  VerifyWebhookParams,
} from './payment-provider.types';
import {
  createMockSession,
  getMockSession,
  markMockSessionCaptured,
  markMockSessionRefunded,
  incrementMockRefundAttempt,
} from './mock-epg.store';

export class MockEPGProvider implements PaymentGatewayProvider {
  readonly mode = 'mock' as const;

  requiresApiCredentials(): boolean {
    return false;
  }

  async createPaymentSession(params: CreateGatewaySessionParams): Promise<CreateGatewaySessionResult> {
    const sessionId = `mock_${crypto.randomUUID()}`;

    createMockSession({
      sessionId,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      amount: params.amount,
      currency: params.currency,
      userId: params.userId,
    });

    const paymentUrl = `${env.FRONTEND_URL}/dev/mock-epg?session=${encodeURIComponent(sessionId)}`;

    logger.info('[MockEPG] Payment session created', {
      sessionId,
      orderNumber: params.orderNumber,
      amount: params.amount,
    });

    return {
      sessionId,
      paymentUrl,
      testMode: true,
      provider: 'mock',
    };
  }

  async refundCapturedPayment(params: RefundGatewayPaymentParams): Promise<PaymentGatewayRefundResult> {
    const session = getMockSession(params.sessionId);

    if (!session) {
      logger.warn('[MockEPG] Refund requested for unknown session', { sessionId: params.sessionId });
      return { success: false, reason: 'session_not_found' };
    }

    incrementMockRefundAttempt(params.sessionId);

    if (session.forcedRefundScenario === 'refund_failure') {
      logger.info('[MockEPG] Simulated refund failure', { sessionId: params.sessionId });
      return { success: false, reason: 'mock_refund_failure' };
    }

    if (session.refunded || session.forcedRefundScenario === 'already_refunded') {
      logger.info('[MockEPG] Refund already applied (idempotent)', { sessionId: params.sessionId });
      return {
        success: true,
        skipped: true,
        reason: 'already_refunded',
        refundId: `mock_refund_existing_${params.sessionId}`,
      };
    }

    if (!session.captured) {
      logger.warn('[MockEPG] Refund before capture', { sessionId: params.sessionId });
      return { success: false, reason: 'payment_not_captured' };
    }

    markMockSessionRefunded(params.sessionId);
    const refundId = `mock_refund_${crypto.randomUUID()}`;

    logger.info('[MockEPG] Refund succeeded', {
      sessionId: params.sessionId,
      refundId,
      orderNumber: params.orderNumber,
    });

    return { success: true, refundId };
  }

  verifyWebhookSignature(_params: VerifyWebhookParams): boolean {
    // Mock webhooks are only accepted in dev; signature optional.
    return true;
  }

  /** Called by mock trigger flow when payment is "captured" at the fake gateway. */
  markSessionCaptured(sessionId: string): void {
    markMockSessionCaptured(sessionId);
  }
}

export const mockEpgProvider = new MockEPGProvider();
