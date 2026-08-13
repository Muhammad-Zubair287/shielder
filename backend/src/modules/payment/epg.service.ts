/**
 * EPG (Electronic Payment Gateway) Service
 * Handles debit/credit card payments through the EPG payment gateway.
 *
 * Flow:
 *  1. Customer submits checkout → initializePayment() creates order in DB + EPG session
 *  2. Customer is redirected to EPG hosted payment page
 *  3. After payment, EPG redirects customer back to our callback URL
 *  4. EPG also sends a server-to-server webhook notification
 *  5. On verified paid + successful atomic stock deduction → order confirmed
 *  6. On verified paid + stock unavailable → gateway refund/void, order cancelled (not fulfillable)
 *
 * Admin configures API keys via Super Admin → Settings → Payment Settings.
 * Env var overrides: EPG_API_KEY, EPG_SECRET_KEY, EPG_BASE_URL
 */

import { prisma } from '../../config/database';
import { logger } from '../../common/logger/logger';
import { BadRequestError } from '../../common/errors/api.error';
import { PaymentStatus, PaymentMethod, OrderStatus, NotificationType, UserRole } from '@prisma/client';
import { OrderService } from '../order/order.service';
import NotificationService from '../notification/notification.service';
import { getPaymentGatewayProvider } from './providers/payment-provider.factory';
import { isMockEpgEnabled } from './providers/payment-provider.config';
import type { PaymentGatewayRefundResult } from './providers/payment-provider.types';
import { RealEtisalatEPGProvider } from './providers/real-etisalat-epg.provider';

// Re-export for backward compatibility with existing tests/imports
export type EPGGatewayRefundResult = PaymentGatewayRefundResult;

interface InitializeParams {
  items: Array<{ productId: string; quantity: number }>;
  customerName: string;
  phoneNumber: string;
  shippingAddress: string;
  notes?: string;
  deliveryType?: 'DELIVERY' | 'PICKUP';
  warehouseId?: string;
  successUrl: string;
  failureUrl: string;
}

const STOCK_SHORTAGE_NOTE = 'STOCK_UNAVAILABLE_AFTER_PAYMENT';
const STOCK_SHORTAGE_REFUND_NOTE = 'STOCK_SHORTAGE_AUTO_REFUND';
const STOCK_SHORTAGE_REFUND_FAILED_NOTE = 'STOCK_SHORTAGE_REFUND_FAILED';

// ── Service ───────────────────────────────────────────────────────────────────

export class EPGService {
  private readonly orderService = new OrderService();

  private getProvider() {
    return getPaymentGatewayProvider();
  }

  private extractSessionId(orderNotes?: string | null, fallbackSessionId?: string): string {
    if (fallbackSessionId?.trim()) return fallbackSessionId.trim();
    if (!orderNotes) return '';
    const match = orderNotes.match(/EPG_SESSION:([^\s|]+)/);
    return match?.[1]?.trim() || '';
  }

  private hasShortageHandlingMarker(notes?: string | null): boolean {
    if (!notes) return false;
    return (
      notes.includes(STOCK_SHORTAGE_NOTE) ||
      notes.includes(STOCK_SHORTAGE_REFUND_NOTE) ||
      notes.includes(STOCK_SHORTAGE_REFUND_FAILED_NOTE)
    );
  }

  private isFulfillablePaidStatus(status: OrderStatus): boolean {
    return status !== OrderStatus.CANCELLED && status !== OrderStatus.REFUNDED;
  }

  // ── Gateway refund / void ──────────────────────────────────────────────────

  /**
   * Refund or void a captured payment via the active gateway provider.
   */
  async refundCapturedPayment(params: {
    sessionId: string;
    amount: number;
    orderNumber?: string;
    reason?: string;
  }): Promise<EPGGatewayRefundResult> {
    const provider = this.getProvider();
    return provider.refundCapturedPayment(params);
  }

  // ── Initialize Payment ─────────────────────────────────────────────────────

  /**
   * Create an order + gateway payment session via the active provider.
   * Does NOT reserve or deduct stock — createOrder only checks availability.
   */
  async initializePayment(userId: string, params: InitializeParams) {
    const provider = this.getProvider();

    const order = await this.orderService.createOrder({
      userId,
      items:           params.items,
      customerName:    params.customerName,
      phoneNumber:     params.phoneNumber,
      shippingAddress: params.shippingAddress,
      paymentMethod:   PaymentMethod.CREDIT_CARD,
      paymentStatus:   PaymentStatus.PENDING,
      notes:           params.notes,
      deliveryType:    params.deliveryType,
      warehouseId:     params.warehouseId,
    });

    const amount = Number(order.total);
    const currency = 'SAR';

    if (provider.requiresApiCredentials()) {
      const s = await prisma.systemSettings.findUnique({ where: { id: 'CURRENT' } });
      const apiKey = s?.paymentGatewayApiKey || process.env.EPG_API_KEY || '';
      if (!apiKey) {
        throw new BadRequestError('payment.gatewayUnavailable');
      }
    }

    try {
      const session = await provider.createPaymentSession({
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount,
        currency,
        customerName: params.customerName,
        phoneNumber: params.phoneNumber,
        successUrl: params.successUrl,
        failureUrl: params.failureUrl,
        userId,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          notes: `EPG_SESSION:${session.sessionId}${params.notes ? ` | ${params.notes}` : ''}`,
        },
      });

      logger.info('[EPG] Payment initialized', {
        provider: provider.mode,
        orderNumber: order.orderNumber,
        sessionId: session.sessionId,
        mock: isMockEpgEnabled(),
      });

      return {
        orderId:     order.id,
        orderNumber: order.orderNumber,
        sessionId:   session.sessionId,
        paymentUrl:  session.paymentUrl,
        testMode:    session.testMode,
        provider:    session.provider,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestError) throw err;
      logger.error('[EPG] initializePayment error:', err);
      throw new BadRequestError('payment.gatewayUnavailable');
    }
  }

  // ── Shortage auto-refund ───────────────────────────────────────────────────

  /**
   * Payment was captured by the gateway but atomic stock deduction failed.
   * Must reverse the capture via EPG and leave the order non-fulfillable.
   * Gateway call happens OUTSIDE the DB transaction.
   */
  private async handleStockShortageAfterPayment(params: {
    orderId: string;
    orderNumber: string;
    orderNotes?: string | null;
    amount: number;
    sessionId: string;
    failureMessage: string;
  }) {
    const sessionId = this.extractSessionId(params.orderNotes, params.sessionId);

    // External gateway operation — not inside a Prisma transaction.
    const gatewayRefund = await this.refundCapturedPayment({
      sessionId,
      amount: params.amount,
      orderNumber: params.orderNumber,
      reason: `Automatic refund: stock unavailable after payment for ${params.orderNumber}`,
    });

    await prisma.$transaction(async (tx) => {
      const locked = await tx.order.findUnique({ where: { id: params.orderId } });
      if (!locked) return;

      // Already fully handled (refunded or shortage path already ran)
      if (
        locked.paymentStatus === PaymentStatus.REFUNDED ||
        this.hasShortageHandlingMarker(locked.notes)
      ) {
        return;
      }

      // If another path already confirmed + deducted, do not cancel.
      if (
        locked.paymentStatus === PaymentStatus.PAID &&
        this.isFulfillablePaidStatus(locked.status) &&
        !this.hasShortageHandlingMarker(locked.notes)
      ) {
        // Check whether stock was actually deducted
        const deducted = await tx.stock_history.findFirst({
          where: { order_id: locked.id, type: 'ORDER_COMPLETED' },
          select: { id: true },
        });
        if (deducted) {
          return;
        }
      }

      const refundOk = gatewayRefund.success;
      const marker = refundOk ? STOCK_SHORTAGE_REFUND_NOTE : STOCK_SHORTAGE_REFUND_FAILED_NOTE;
      const detail = `${STOCK_SHORTAGE_NOTE}: ${params.failureMessage} | ${marker}` +
        (gatewayRefund.refundId ? ` | refundId=${gatewayRefund.refundId}` : '') +
        (gatewayRefund.reason ? ` | gateway=${gatewayRefund.reason}` : '');

      await tx.order.update({
        where: { id: locked.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: refundOk ? PaymentStatus.REFUNDED : PaymentStatus.PAID,
          notes: locked.notes ? `${locked.notes} | ${detail}` : detail,
        },
      });

      const existingPayment = await tx.payment.findFirst({
        where: { orderId: locked.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            orderId: locked.id,
            amount: params.amount,
            method: PaymentMethod.CREDIT_CARD,
            status: refundOk ? PaymentStatus.REFUNDED : PaymentStatus.PAID,
            transactionId: sessionId || `epg_shortage_${Date.now()}`,
            notes: refundOk
              ? `EPG auto-refund after stock shortage | ${params.failureMessage}`
              : `EPG payment captured but stock unavailable; gateway refund FAILED — manual refund required | ${params.failureMessage} | ${gatewayRefund.reason || ''}`,
          },
        });
      } else if (refundOk && existingPayment.status !== PaymentStatus.REFUNDED) {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            notes: `${existingPayment.notes || ''}\nAuto-refunded after stock shortage`.trim(),
          },
        });
      }
    });

    // Notify admins — especially if gateway refund failed (money still captured).
    NotificationService.notify({
      type: gatewayRefund.success ? NotificationType.REFUND_ISSUED : NotificationType.PAYMENT_FAILED,
      title: gatewayRefund.success
        ? 'Auto-refund: stock unavailable'
        : 'URGENT: payment captured, stock unavailable, refund failed',
      message: gatewayRefund.success
        ? `Order ${params.orderNumber} was auto-refunded because stock was purchased by another customer.`
        : `Order ${params.orderNumber}: payment captured but stock unavailable and EPG refund failed (${gatewayRefund.reason || 'unknown'}). Manual refund required.`,
      module: 'PAYMENT',
      roleTarget: UserRole.SUPER_ADMIN,
      relatedId: params.orderId,
    }).catch((err) => logger.error('[EPG] shortage notification failed', err));

    NotificationService.notify({
      type: gatewayRefund.success ? NotificationType.REFUND_ISSUED : NotificationType.PAYMENT_FAILED,
      title: gatewayRefund.success
        ? 'Auto-refund: stock unavailable'
        : 'URGENT: payment captured, stock unavailable, refund failed',
      message: gatewayRefund.success
        ? `Order ${params.orderNumber} was auto-refunded because stock was purchased by another customer.`
        : `Order ${params.orderNumber}: payment captured but stock unavailable and EPG refund failed. Manual refund required.`,
      module: 'PAYMENT',
      roleTarget: UserRole.ADMIN,
      relatedId: params.orderId,
    }).catch((err) => logger.error('[EPG] shortage admin notification failed', err));

    return gatewayRefund;
  }

  // ── Handle Callback / Redirect ─────────────────────────────────────────────

  /**
   * Process the query string that EPG appends to the callback URL.
   * Inventory rule: stock is deducted only after payment is verified as successful,
   * inside the same transaction as marking the order PAID. Duplicate callbacks are
   * idempotent. Stock shortage after capture triggers an actual EPG refund/void.
   */
  async handleCallback(query: Record<string, string>) {
    const sessionId = query.id || query.session_id || '';
    const orderRef  = query.order_id || '';
    const status    = (query.status || query.result || '').toLowerCase();

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

    if (isPaid) {
      // Already refunded / shortage-handled → never treat as successful fulfillment
      if (
        order.paymentStatus === PaymentStatus.REFUNDED ||
        this.hasShortageHandlingMarker(order.notes)
      ) {
        logger.info(`[EPG] Order ${order.orderNumber} already shortage-handled — skipping`);
        return {
          success: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: 'insufficient_stock_after_payment',
        };
      }

      // Idempotent successful fulfillment
      if (
        order.paymentStatus === PaymentStatus.PAID &&
        this.isFulfillablePaidStatus(order.status)
      ) {
        logger.info(`[EPG] Order ${order.orderNumber} already PAID — skipping duplicate callback`);
        return { success: true, orderId: order.id, orderNumber: order.orderNumber };
      }

      try {
        await prisma.$transaction(async (tx) => {
          const locked = await tx.order.findUnique({ where: { id: order.id } });
          if (!locked) return;

          if (
            locked.paymentStatus === PaymentStatus.PAID &&
            this.isFulfillablePaidStatus(locked.status)
          ) {
            return;
          }

          if (
            locked.paymentStatus === PaymentStatus.REFUNDED ||
            this.hasShortageHandlingMarker(locked.notes)
          ) {
            return;
          }

          // Atomic stock deduction (SQL WHERE quantity >= qty). Throws if unavailable.
          await this.orderService.deductInventoryAfterPaymentSuccess(
            order.id,
            'EPG_PAYMENT',
            tx,
          );

          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              status: OrderStatus.CONFIRMED,
            },
          });

          const existingPayment = await tx.payment.findFirst({
            where: {
              orderId: order.id,
              status: PaymentStatus.PAID,
            },
            select: { id: true },
          });

          if (!existingPayment) {
            await tx.payment.create({
              data: {
                orderId:       order.id,
                amount:        order.total,
                method:        PaymentMethod.CREDIT_CARD,
                status:        PaymentStatus.PAID,
                transactionId: sessionId || `epg_cb_${Date.now()}`,
                notes:         `EPG card payment via callback | result: ${status}`,
              },
            });
          }
        }, {
          timeout: 15000,
          maxWait: 5000,
        });

        // Re-read to confirm we did not lose a concurrent shortage handler
        const after = await prisma.order.findUnique({
          where: { id: order.id },
          select: { paymentStatus: true, status: true, notes: true },
        });

        if (
          after &&
          (after.paymentStatus === PaymentStatus.REFUNDED ||
            this.hasShortageHandlingMarker(after.notes) ||
            after.status === OrderStatus.CANCELLED)
        ) {
          return {
            success: false,
            orderId: order.id,
            orderNumber: order.orderNumber,
            reason: 'insufficient_stock_after_payment',
          };
        }

        logger.info(`[EPG] Order ${order.orderNumber} marked as PAID with stock deducted`);
        return { success: true, orderId: order.id, orderNumber: order.orderNumber };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`[EPG] Stock deduction failed after payment for ${order.orderNumber}: ${message}`);

        const gatewayRefund = await this.handleStockShortageAfterPayment({
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderNotes: order.notes,
          amount: Number(order.total),
          sessionId,
          failureMessage: message,
        });

        return {
          success: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason: 'insufficient_stock_after_payment',
          refunded: gatewayRefund.success,
          refundReason: gatewayRefund.reason,
        };
      }
    }

    if (isFailed) {
      const isCancelled = status === 'cancelled' || status === 'canceled';
      // Failed/cancelled payment must never deduct or reserve stock.
      if (
        order.paymentStatus !== PaymentStatus.PAID &&
        order.paymentStatus !== PaymentStatus.REFUNDED
      ) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: PaymentStatus.FAILED },
        });
      }
      logger.info(`[EPG] Order ${order.orderNumber} payment ${isCancelled ? 'CANCELLED' : 'FAILED'}`);
      return {
        success: false,
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: isCancelled ? 'cancelled' : 'failed',
      };
    }

    return { success: false, orderId: order.id, orderNumber: order.orderNumber };
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  /**
   * Handle server-to-server webhook notification from EPG.
   * Verifies the HMAC-SHA256 signature before processing.
   */
  async handleWebhook(payload: unknown, signatureHeader: string) {
    const provider = this.getProvider();

    let secretKey = '';
    if (provider instanceof RealEtisalatEPGProvider) {
      secretKey = await provider.getSecretKey();
    }

    if (!provider.verifyWebhookSignature({ payload, signatureHeader, secretKey })) {
      logger.warn('[EPG] Webhook: invalid signature — ignoring');
      return { received: false, reason: 'invalid_signature' };
    }

    const normalizedPayload: Record<string, unknown> =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const payloadData =
      normalizedPayload.data && typeof normalizedPayload.data === 'object'
        ? (normalizedPayload.data as Record<string, unknown>)
        : normalizedPayload;

    const event = String(normalizedPayload.type || normalizedPayload.event || '');
    const status = String(payloadData.status || '').toLowerCase();

    if (
      event.includes('payment_paid') ||
      event.includes('payment.paid') ||
      status === 'paid'
    ) {
      await this.handleCallback({
        id: String(payloadData.id || normalizedPayload.id || ''),
        order_id: String(
          payloadData.order_id ||
            (payloadData.metadata as { order_id?: string } | undefined)?.order_id ||
            ''
        ),
        status: 'paid',
      });
    }

    return { received: true };
  }
}

export const epgService = new EPGService();
