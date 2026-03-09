/**
 * EPG (Electronic Payment Gateway) Service
 * Handles debit/credit card payments through the EPG payment gateway.
 *
 * Flow:
 *  1. Customer submits checkout → initializePayment() creates order in DB + EPG session
 *  2. Customer is redirected to EPG hosted payment page
 *  3. After payment, EPG redirects customer back to our callback URL
 *  4. EPG also sends a server-to-server webhook notification
 *
 * Admin configures API keys via Super Admin → Settings → Payment Settings.
 * Env var overrides: EPG_API_KEY, EPG_SECRET_KEY, EPG_BASE_URL
 */

import crypto from 'crypto';
import { prisma } from '../../config/database';
import { logger } from '../../common/logger/logger';
import { BadRequestError } from '../../common/errors/api.error';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';
import { OrderService } from '../order/order.service';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EPGConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  testMode: boolean;
}

interface InitializeParams {
  items: Array<{ productId: string; quantity: number }>;
  customerName: string;
  phoneNumber: string;
  shippingAddress: string;
  notes?: string;
  successUrl: string;
  failureUrl: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class EPGService {
  private readonly orderService = new OrderService();

  // ── Config ─────────────────────────────────────────────────────────────────

  private async getConfig(): Promise<EPGConfig> {
    try {
      const s = await prisma.systemSettings.findUnique({ where: { id: 'CURRENT' } });
      return {
        apiKey:     s?.paymentGatewayApiKey     || process.env.EPG_API_KEY     || '',
        secretKey:  s?.paymentGatewaySecretKey  || process.env.EPG_SECRET_KEY  || '',
        baseUrl:    process.env.EPG_BASE_URL    || 'https://api.epg.gateway.sa/v1',
        testMode:   s?.paymentTestMode          ?? true,
      };
    } catch {
      return {
        apiKey:    process.env.EPG_API_KEY    || '',
        secretKey: process.env.EPG_SECRET_KEY || '',
        baseUrl:   process.env.EPG_BASE_URL   || 'https://api.epg.gateway.sa/v1',
        testMode:  true,
      };
    }
  }

  // ── Initialize Payment ─────────────────────────────────────────────────────

  /**
   * Create an order + EPG payment session.
   * Returns the hosted payment URL to redirect the customer to.
   */
  async initializePayment(userId: string, params: InitializeParams) {
    const config = await this.getConfig();

    // 1. Create the order in our DB
    const order = await this.orderService.createOrder({
      userId,
      items:           params.items,
      customerName:    params.customerName,
      phoneNumber:     params.phoneNumber,
      shippingAddress: params.shippingAddress,
      paymentMethod:   PaymentMethod.CREDIT_CARD,
      paymentStatus:   PaymentStatus.PENDING,
      notes:           params.notes,
    });

    const amount   = Number(order.total);
    const currency = 'SAR';

    // 2. If no real API key is configured — use simulated/demo mode
    if (!config.apiKey || config.apiKey.length < 10) {
      logger.warn('[EPG] API key not configured — running in simulated mode');
      const simSessionId = `sim_${order.id}`;
      // In simulated mode the "payment page" is our own callback URL so the
      // user lands directly on the confirmation page without leaving the site.
      const simulatedUrl =
        `${params.successUrl}?session_id=${simSessionId}&order_id=${order.orderNumber}&result=paid`;

      return {
        orderId:     order.id,
        orderNumber: order.orderNumber,
        sessionId:   simSessionId,
        paymentUrl:  simulatedUrl,
        testMode:    true,
      };
    }

    // 3. Call the real EPG API
    const payload = {
      amount:      Math.round(amount * 100), // smallest currency unit (halalas)
      currency,
      order_id:    order.orderNumber,
      description: `Order ${order.orderNumber} – Shielder`,
      customer: {
        name:  params.customerName,
        phone: params.phoneNumber,
      },
      source:       { type: 'creditcard' },
      callback_url: params.successUrl,
      cancel_url:   params.failureUrl,
      metadata: {
        internal_order_id: order.id,
        user_id:           userId,
      },
    };

    try {
      const response = await fetch(`${config.baseUrl}/payments`, {
        method:  'POST',
        headers: {
          Authorization:  `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('[EPG] API error response:', errorBody);
        throw new BadRequestError('Payment gateway error. Please try again.');
      }

      const data: any = await response.json();
      const sessionId = data.id as string;

      // Store the EPG session ID so we can match the callback
      await prisma.order.update({
        where: { id: order.id },
        data: {
          notes: `EPG_SESSION:${sessionId}${params.notes ? ` | ${params.notes}` : ''}`,
        },
      });

      return {
        orderId:     order.id,
        orderNumber: order.orderNumber,
        sessionId,
        paymentUrl:  data.url ?? data.payment_url ?? data.source?.transaction_url,
        testMode:    config.testMode,
      };
    } catch (err: any) {
      if (err instanceof BadRequestError) throw err;
      logger.error('[EPG] initializePayment error:', err);
      throw new BadRequestError('Unable to connect to payment gateway. Please try again.');
    }
  }

  // ── Handle Callback / Redirect ─────────────────────────────────────────────

  /**
   * Process the query string that EPG appends to the callback URL.
   * Called when the customer is redirected back from the EPG hosted page.
   *
   * Common EPG query params: id, status, order_id, message
   */
  async handleCallback(query: Record<string, string>) {
    const sessionId = query.id || query.session_id || '';
    const orderRef  = query.order_id || '';
    const status    = (query.status || query.result || '').toLowerCase();

    // Locate the order by EPG session note OR by orderNumber
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: orderRef },
          ...(sessionId ? [{ notes: { contains: sessionId } }] : []),
        ],
      },
      include: { payments: true },
    });

    if (!order) {
      logger.warn('[EPG] callback: order not found', { query });
      return { success: false, orderId: null };
    }

    const isPaid   = ['paid', 'success', 'succeeded', 'captured'].includes(status);
    const isFailed = ['failed', 'cancelled', 'declined', 'rejected'].includes(status);

    if (isPaid && order.paymentStatus !== PaymentStatus.PAID) {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status:        OrderStatus.CONFIRMED,
          },
        }),
        prisma.payment.create({
          data: {
            orderId:       order.id,
            amount:        order.total,
            method:        PaymentMethod.CREDIT_CARD,
            status:        PaymentStatus.PAID,
            transactionId: sessionId || `epg_cb_${Date.now()}`,
            notes:         `EPG card payment via callback | result: ${status}`,
          },
        }),
      ]);
      logger.info(`[EPG] Order ${order.orderNumber} marked as PAID`);
    } else if (isFailed) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      logger.info(`[EPG] Order ${order.orderNumber} payment FAILED`);
    }

    return { success: isPaid, orderId: order.id, orderNumber: order.orderNumber };
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  /**
   * Handle server-to-server webhook notification from EPG.
   * Verifies the HMAC-SHA256 signature before processing.
   */
  async handleWebhook(payload: any, signatureHeader: string) {
    const config = await this.getConfig();

    // Verify signature if secret key is set
    if (config.secretKey && signatureHeader) {
      const expected = crypto
        .createHmac('sha256', config.secretKey)
        .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
        .digest('hex');

      if (expected !== signatureHeader) {
        logger.warn('[EPG] Webhook: invalid signature — ignoring');
        return { received: false, reason: 'invalid_signature' };
      }
    }

    const event  = payload?.type   || payload?.event || '';
    const data   = payload?.data   || payload;
    const status = (data?.status   || '').toLowerCase();

    if (
      event.includes('payment_paid') ||
      event.includes('payment.paid') ||
      status === 'paid'
    ) {
      await this.handleCallback({
        id:       data?.id || payload?.id || '',
        order_id: data?.order_id || data?.metadata?.order_id || '',
        status:   'paid',
      });
    }

    return { received: true };
  }
}

export const epgService = new EPGService();
