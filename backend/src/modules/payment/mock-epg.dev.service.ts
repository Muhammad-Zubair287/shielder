/**
 * Development-only mock EPG session API helpers.
 * Routes through the same handleCallback / handleWebhook paths as real EPG.
 */

import { NotFoundError, ForbiddenError, BadRequestError } from '../../common/errors/api.error';
import { prisma } from '../../config/database';
import { logger } from '../../common/logger/logger';
import { isMockEpgEnabled } from './providers/payment-provider.config';
import {
  getMockSession,
  scenarioToCallbackStatus,
  setMockForcedRefundScenario,
  markMockSessionTerminal,
} from './providers/mock-epg.store';
import { getMockProvider } from './providers/payment-provider.factory';
import type { MockEpgScenario } from './providers/payment-provider.types';
import type { EPGService } from './epg.service';

const MOCK_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function assertMockEnabled(): void {
  if (!isMockEpgEnabled()) {
    throw new NotFoundError('payment.mockNotAvailable');
  }
}

function assertValidScenario(scenario: string): scenario is MockEpgScenario {
  return [
    'success',
    'failed',
    'cancelled',
    'pending',
    'timeout',
    'duplicate_callback',
    'refund_success',
    'refund_failure',
    'already_refunded',
  ].includes(scenario);
}

export class MockEpgDevService {
  constructor(private readonly epgService: EPGService) {}

  async getSessionForUser(sessionId: string, userId: string) {
    assertMockEnabled();

    const session = getMockSession(sessionId);
    if (!session) {
      throw new NotFoundError('payment.sessionNotFound');
    }

    if (session.userId !== userId) {
      throw new ForbiddenError('payment.sessionForbidden');
    }

    if (Date.now() - session.createdAt > MOCK_SESSION_TTL_MS) {
      throw new BadRequestError('payment.sessionExpired');
    }

    const order = await prisma.order.findUnique({
      where: { id: session.orderId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        paymentStatus: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundError('payment.sessionNotFound');
    }

    return {
      sessionId: session.sessionId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      currency: session.currency,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      provider: 'mock' as const,
      sessionStatus: session.terminalStatus ?? 'pending',
      isExecutable: !session.terminalStatus,
      terminalRedirectUrl: session.terminalRedirectUrl ?? null,
    };
  }

  private buildRedirectUrl(callbackResult: {
    success: boolean;
    orderId?: string | null;
    reason?: string;
  }): string {
    if (callbackResult.success && callbackResult.orderId) {
      return `/order-confirmation/${callbackResult.orderId}?payment=success`;
    }
    if (callbackResult.reason === 'insufficient_stock_after_payment') {
      return `/checkout?payment=failed&messageKey=payment.insufficientStockAfterPayment`;
    }
    if (callbackResult.reason === 'cancelled') {
      return `/checkout?payment=failed&messageKey=payment.cancelled`;
    }
    return `/checkout?payment=failed&messageKey=payment.failed`;
  }

  private terminalStatusForScenario(scenario: MockEpgScenario): 'success' | 'failed' | 'cancelled' | null {
    if (scenario === 'success' || scenario === 'duplicate_callback') return 'success';
    if (scenario === 'cancelled') return 'cancelled';
    if (scenario === 'failed') return 'failed';
    return null;
  }

  /**
   * Simulate customer action at mock gateway → invokes real handleCallback / webhook.
   */
  async triggerScenario(sessionId: string, scenario: string, userId: string) {
    assertMockEnabled();

    if (!assertValidScenario(scenario)) {
      throw new BadRequestError('payment.invalidMockScenario');
    }

    await this.getSessionForUser(sessionId, userId);

    const session = getMockSession(sessionId)!;

    // Terminal session — do not re-run payment business logic
    if (session.terminalStatus) {
      if (session.terminalRedirectUrl) {
        return {
          scenario,
          redirectUrl: session.terminalRedirectUrl,
          callbackResult: {
            success: session.terminalStatus === 'success',
            orderId: session.orderId,
            skipped: true,
            reason: 'session_already_completed',
          },
        };
      }
      throw new BadRequestError('payment.sessionAlreadyCompleted');
    }

    const mockProvider = getMockProvider();

    if (scenario === 'refund_success' || scenario === 'refund_failure' || scenario === 'already_refunded') {
      setMockForcedRefundScenario(sessionId, scenario);
      if (!session.captured) {
        mockProvider?.markSessionCaptured(sessionId);
      }
      const refund = await this.epgService.refundCapturedPayment({
        sessionId,
        amount: session.amount,
        orderNumber: session.orderNumber,
        reason: `Mock scenario: ${scenario}`,
      });
      return {
        scenario,
        refund,
        redirectUrl: null,
        callbackResult: null,
      };
    }

    const callbackStatus = scenarioToCallbackStatus(scenario);

    if (scenario === 'pending' || scenario === 'timeout') {
      logger.info('[MockEPG] Scenario leaves payment pending (no callback)', { sessionId, scenario });
      return {
        scenario,
        redirectUrl: null,
        callbackResult: { success: false, reason: scenario },
      };
    }

    if (callbackStatus === 'paid') {
      mockProvider?.markSessionCaptured(sessionId);
    }

    const query = {
      id: sessionId,
      order_id: session.orderNumber,
      status: callbackStatus || 'failed',
    };

    let callbackResult = await this.epgService.handleCallback(query);

    if (scenario === 'duplicate_callback' && callbackStatus === 'paid') {
      logger.info('[MockEPG] Sending duplicate callback', { sessionId });
      callbackResult = await this.epgService.handleCallback(query);
    }

    // Also exercise webhook path for success (same idempotent handler)
    if (callbackStatus === 'paid') {
      await this.epgService.handleWebhook(
        {
          type: 'payment.paid',
          data: { id: sessionId, order_id: session.orderNumber, status: 'paid' },
        },
        'mock-dev-signature',
      );
    }

    const redirectUrl = this.buildRedirectUrl(callbackResult);

    let terminalStatus = this.terminalStatusForScenario(scenario);
    if (!terminalStatus && callbackResult.reason === 'insufficient_stock_after_payment') {
      terminalStatus = 'failed';
    }
    if (callbackResult.success && (scenario === 'success' || scenario === 'duplicate_callback')) {
      terminalStatus = 'success';
    }
    if (terminalStatus) {
      markMockSessionTerminal(sessionId, terminalStatus, redirectUrl);
    }

    return {
      scenario,
      redirectUrl,
      callbackResult,
    };
  }
}
