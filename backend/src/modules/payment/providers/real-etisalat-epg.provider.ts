/**
 * Real Etisalat EPG HTTP integration (sandbox + production).
 * Credentials and base URL come from system settings / environment — never from requests.
 */

import crypto from 'crypto';
import { prisma } from '../../../config/database';
import { logger } from '../../../common/logger/logger';
import type {
  CreateGatewaySessionParams,
  CreateGatewaySessionResult,
  EpgProviderMode,
  PaymentGatewayProvider,
  PaymentGatewayRefundResult,
  RefundGatewayPaymentParams,
  VerifyWebhookParams,
} from './payment-provider.types';

type RealEpgConfig = {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  testMode: boolean;
};

export class RealEtisalatEPGProvider implements PaymentGatewayProvider {
  readonly mode: EpgProviderMode;

  constructor(mode: 'sandbox' | 'production') {
    this.mode = mode;
  }

  requiresApiCredentials(): boolean {
    return true;
  }

  private async getConfig(): Promise<RealEpgConfig> {
    try {
      const s = await prisma.systemSettings.findUnique({ where: { id: 'CURRENT' } });
      const sandboxDefault = 'https://api.epg.gateway.sa/v1';
      const productionDefault = process.env.EPG_PRODUCTION_BASE_URL || sandboxDefault;

      return {
        apiKey: s?.paymentGatewayApiKey || process.env.EPG_API_KEY || '',
        secretKey: s?.paymentGatewaySecretKey || process.env.EPG_SECRET_KEY || '',
        baseUrl:
          this.mode === 'production'
            ? process.env.EPG_PRODUCTION_BASE_URL || productionDefault
            : process.env.EPG_BASE_URL || sandboxDefault,
        testMode: this.mode === 'sandbox' ? (s?.paymentTestMode ?? true) : false,
      };
    } catch {
      return {
        apiKey: process.env.EPG_API_KEY || '',
        secretKey: process.env.EPG_SECRET_KEY || '',
        baseUrl:
          this.mode === 'production'
            ? process.env.EPG_PRODUCTION_BASE_URL || 'https://api.epg.gateway.sa/v1'
            : process.env.EPG_BASE_URL || 'https://api.epg.gateway.sa/v1',
        testMode: this.mode === 'sandbox',
      };
    }
  }

  async createPaymentSession(params: CreateGatewaySessionParams): Promise<CreateGatewaySessionResult> {
    const config = await this.getConfig();

    const payload = {
      amount: Math.round(params.amount * 100),
      currency: params.currency,
      order_id: params.orderNumber,
      description: `Order ${params.orderNumber} – Shielder`,
      customer: {
        name: params.customerName,
        phone: params.phoneNumber,
      },
      source: { type: 'creditcard' },
      callback_url: params.successUrl,
      cancel_url: params.failureUrl,
      metadata: {
        internal_order_id: params.orderId,
        user_id: params.userId,
      },
    };

    const response = await fetch(`${config.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('[RealEPG] Initialize API error', { status: response.status, body: errorBody });
      throw new Error('gateway_initialize_failed');
    }

    const data = (await response.json()) as {
      id: string;
      url?: string;
      payment_url?: string;
      source?: { transaction_url?: string };
    };

    return {
      sessionId: data.id,
      paymentUrl: data.url ?? data.payment_url ?? data.source?.transaction_url ?? '',
      testMode: config.testMode,
      provider: this.mode,
    };
  }

  async refundCapturedPayment(params: RefundGatewayPaymentParams): Promise<PaymentGatewayRefundResult> {
    const sessionId = params.sessionId?.trim();
    if (!sessionId) {
      return { success: false, reason: 'missing_session_id' };
    }

    const config = await this.getConfig();
    if (!config.apiKey) {
      return { success: false, reason: 'gateway_not_configured' };
    }

    const amountMinor = Math.round(Number(params.amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      return { success: false, reason: 'invalid_refund_amount' };
    }

    const authHeader = {
      Authorization: `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    };

    const refundPayload = {
      amount: amountMinor,
      reason: params.reason || 'Stock unavailable after payment capture',
      metadata: {
        order_number: params.orderNumber || null,
        reason_code: 'INSUFFICIENT_STOCK_AFTER_PAYMENT',
      },
    };

    const endpoints: Array<{ url: string; body: Record<string, unknown> }> = [
      {
        url: `${config.baseUrl}/payments/${encodeURIComponent(sessionId)}/refund`,
        body: refundPayload,
      },
      {
        url: `${config.baseUrl}/refunds`,
        body: { ...refundPayload, payment_id: sessionId },
      },
    ];

    let lastStatus = 0;
    let lastBody = '';

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify(endpoint.body),
        });

        const bodyText = await response.text();
        lastStatus = response.status;
        lastBody = bodyText;

        if (response.ok) {
          let refundId: string | undefined;
          try {
            const parsed = JSON.parse(bodyText) as { id?: string; refund_id?: string };
            refundId = parsed.id || parsed.refund_id;
          } catch {
            // non-JSON OK
          }

          logger.info('[RealEPG] Refund succeeded', { sessionId, refundId });
          return { success: true, refundId, rawStatus: response.status, rawBody: bodyText };
        }

        const lower = bodyText.toLowerCase();
        if (
          response.status === 409 ||
          lower.includes('already refunded') ||
          lower.includes('already_refunded') ||
          lower.includes('already voided') ||
          lower.includes('already_voided')
        ) {
          return {
            success: true,
            skipped: true,
            reason: 'already_refunded',
            rawStatus: response.status,
            rawBody: bodyText,
          };
        }

        if (response.status === 404) continue;

        logger.error('[RealEPG] Refund API error', {
          endpoint: endpoint.url,
          status: response.status,
        });
      } catch (err: unknown) {
        logger.error('[RealEPG] Refund request failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: false,
      reason: 'gateway_refund_failed',
      rawStatus: lastStatus,
      rawBody: lastBody,
    };
  }

  verifyWebhookSignature(params: VerifyWebhookParams): boolean {
    if (!params.secretKey || !params.signatureHeader) {
      return true;
    }

    const expected = crypto
      .createHmac('sha256', params.secretKey)
      .update(typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload))
      .digest('hex');

    return expected === params.signatureHeader;
  }

  /** Exposed for webhook handler to load secret key. */
  async getSecretKey(): Promise<string> {
    const config = await this.getConfig();
    return config.secretKey;
  }
}
