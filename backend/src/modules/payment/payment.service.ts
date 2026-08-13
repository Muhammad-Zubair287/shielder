import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError, ConflictError } from '../../common/errors/api.error';
import { PaymentStatus, PaymentMethod, OrderStatus, NotificationType, UserRole } from '@prisma/client';
import { AuditService } from '../../common/services/audit.service';
import { createPaginatedResponse, PaginationParams } from '../../common/utils/pagination';
import NotificationService from '../notification/notification.service';
import SettingsService from '../settings/settings.service';
import { orderService } from '../order/order.service';
import { epgService } from './epg.service';
import { logger } from '../../common/logger/logger';

export class PaymentService {
  private async getCurrency(): Promise<string> {
    return SettingsService.getCurrency();
  }

  private async normalizePayment<T extends Record<string, any>>(payment: T): Promise<T & { currency: string }> {
    const currency = await this.getCurrency();
    return {
      ...payment,
      currency,
    };
  }

  /**
   * Get Payment dashboard stats
   */
  async getPaymentStats() {
    const currency = await this.getCurrency();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalRevenue, todayRevenue, pendingPayments, failedPayments] = await Promise.all([
      // Total Revenue: Sum of all PAID payments minus REFUNDED amounts
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true }
      }),
      // Today's Revenue
      prisma.payment.aggregate({
        where: { 
          status: PaymentStatus.PAID,
          createdAt: { gte: today }
        },
        _sum: { amount: true }
      }),
      // Pending Payments count
      prisma.payment.count({
        where: { status: PaymentStatus.PENDING }
      }),
      // Failed Payments count
      prisma.payment.count({
        where: { status: PaymentStatus.FAILED }
      })
    ]);

    // Note: In a real system, we'd also subtract refunded amounts from total revenue.
    // For now, these aggregates give a good starting point.
    const refunds = await prisma.payment.aggregate({
      where: { status: PaymentStatus.REFUNDED },
      _sum: { amount: true }
    });

    const netTotalRevenue = (Number(totalRevenue._sum.amount) || 0) - (Number(refunds._sum.amount) || 0);
    const netTodayRevenue = Number(todayRevenue._sum.amount) || 0;

    return {
      totalRevenue: netTotalRevenue,
      todayRevenue: netTodayRevenue,
      pendingPayments,
      failedPayments,
      currency
    };
  }

  /**
   * Get all payments with filters and pagination
   */
  async getAllPayments(filters: any, pagination: PaginationParams) {
    const { search, status, method, dateFrom, dateTo } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customerName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status) where.status = status;
    if (method) where.method = method;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const total = await prisma.payment.count({ where });

    const payments = await prisma.payment.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: {
        order: {
          select: {
            orderNumber: true,
            customerName: true,
            total: true
          }
        },
        recorder: {
          select: {
            profile: {
              select: { fullName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const currency = await this.getCurrency();
    return {
      ...createPaginatedResponse(payments, total, pagination.page, pagination.limit),
      currency,
      data: await Promise.all(payments.map((payment) => this.normalizePayment(payment))),
    };
  }

  /**
   * Get payment details by ID
   */
  async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    translations: { where: { locale: 'en' } }
                  }
                }
              }
            }
          }
        },
        recorder: {
          select: {
            email: true,
            profile: { select: { fullName: true } }
          }
        }
      }
    });

    if (!payment) {
      throw new NotFoundError('payment.notFound');
    }

    return this.normalizePayment(payment);
  }

  /**
   * Record a manual payment
   * 
   * Business Rules:
   * 1. Only ONE PAID payment is allowed per order.
   * 2. Amount must be a valid positive number.
   * 3. Payment cannot exceed remaining order balance.
   * 
   * Validation Layers:
   * - Input validation (Joi schema)
   * - Service-level type safety checks
   * - Database constraints (unique index)
   * - Transaction atomicity
   */
  async recordPayment(data: {
    orderId: string;
    amount: number;
    method: PaymentMethod;
    transactionId?: string;
    notes?: string;
    recordedBy: string;
  }) {
    // ============================================
    // VALIDATION LAYER 1: Type Safety Checks
    // ============================================
    
    // Validate amount is a proper number
    if (typeof data.amount !== 'number') {
      throw new BadRequestError('payment.amountInvalid');
    }

    // Check for NaN
    if (isNaN(data.amount)) {
      throw new BadRequestError('payment.amountNotNumber');
    }

    // Check for Infinity
    if (!isFinite(data.amount)) {
      throw new BadRequestError('payment.amountNotFinite');
    }

    // Check amount is positive
    if (data.amount <= 0) {
      throw new BadRequestError('payment.amountMustBePositive');
    }

    // Validate orderId is a valid UUID
    if (!data.orderId || typeof data.orderId !== 'string') {
      throw new BadRequestError('payment.orderIdInvalid');
    }

    // ============================================
    // VALIDATION LAYER 2: Order Existence
    // ============================================
    
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { payments: true }
    });

    if (!order) {
      throw new NotFoundError('payment.orderNotFound');
    }

    // ============================================
    // VALIDATION LAYER 3: Business Logic
    // ============================================
    
    // CRITICAL: Prevent duplicate PAID payments for the same order
    // Check if a PAID payment already exists for this order
    const existingPaidPayment = order.payments.find(p => p.status === PaymentStatus.PAID);
    if (existingPaidPayment) {
      throw new ConflictError('payment.alreadyRecorded');
    }

    // Prevent overpayment
    const alreadyPaid = order.payments
      .filter(p => p.status === PaymentStatus.PAID || p.status === PaymentStatus.PARTIALLY_PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    const orderTotal = Number(order.total);
    
    // Type safety: ensure order.total is valid
    if (isNaN(orderTotal) || !isFinite(orderTotal)) {
      throw new BadRequestError('payment.orderInvalidTotal');
    }
    
    const remainingBalance = orderTotal - alreadyPaid;

    if (data.amount > remainingBalance + 0.01) { // 0.01 for floating point safety
      throw new BadRequestError('payment.exceedsRemaining');
    }

    // Double Payment Prevention via Transaction ID (idempotency)
    // Supports retry scenarios - same transaction ID should return existing payment
    if (data.transactionId) {
      const existing = await prisma.payment.findUnique({
        where: { transactionId: data.transactionId }
      });
      if (existing) {
        throw new ConflictError('payment.transactionIdExists');
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 4. Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId: data.orderId,
          amount: data.amount,
          method: data.method,
          status: PaymentStatus.PAID, // Manual records are usually marked paid immediately
          transactionId: data.transactionId,
          notes: data.notes,
          recordedBy: data.recordedBy
        }
      });

      // 5. Update Order Status
      const newTotalPaid = alreadyPaid + data.amount;
      let newPaymentStatus: PaymentStatus = order.paymentStatus;
      let newOrderStatus: OrderStatus = order.status;

      if (newTotalPaid >= Number(order.total) - 0.01) {
        newPaymentStatus = PaymentStatus.PAID;
        // If order was pending, move to confirmed or processing
        if (order.status === OrderStatus.PENDING) {
          newOrderStatus = OrderStatus.PROCESSING;
        } else if (order.status === OrderStatus.READY_FOR_PICKUP) {
          newOrderStatus = OrderStatus.CONFIRMED;
        }

        // Verified full payment → deduct stock once (idempotent).
        await orderService.deductInventoryAfterPaymentSuccess(
          data.orderId,
          data.recordedBy || 'ADMIN_PAYMENT',
          tx,
        );
      } else if (newTotalPaid > 0) {
        newPaymentStatus = PaymentStatus.PARTIALLY_PAID;
      }

      await tx.order.update({
        where: { id: data.orderId },
        data: {
          paymentStatus: newPaymentStatus,
          status: newOrderStatus
        }
      });

      // 6. Audit Log
      await AuditService.log({
        userId: data.recordedBy,
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        changes: { amount: data.amount, method: data.method, orderId: data.orderId }
      });

      // 7. Trigger Notifications
      await NotificationService.notify({
        type: NotificationType.PAYMENT_SUCCESSFUL,
        title: 'Payment Received',
        message: `Payment of SAR ${data.amount} received for order ${order.orderNumber}.`,
        module: 'PAYMENT',
        roleTarget: UserRole.SUPER_ADMIN,
        relatedId: payment.id,
        triggeredById: data.recordedBy
      });

      await NotificationService.notify({
        type: NotificationType.PAYMENT_SUCCESSFUL,
        title: 'Payment Confirmed',
        message: `Your payment of SAR ${data.amount} for order ${order.orderNumber} has been received.`,
        module: 'PAYMENT',
        userId: order.userId,
        relatedId: payment.id,
        triggeredById: data.recordedBy
      });

      return this.normalizePayment(payment);
    });
  }

  /**
   * Process a refund.
   * For EPG card payments, attempts an actual gateway refund/void before updating DB state.
   */
  async processRefund(paymentId: string, userId: string, notes?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) {
      throw new NotFoundError('payment.notFound');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestError('payment.alreadyRefunded');
    }

    // Card / online gateway: reverse at EPG before local state change (gateway cannot join DB tx).
    // Only when this payment was actually captured through EPG (session id present).
    const isGatewayPayment =
      payment.method === PaymentMethod.CREDIT_CARD ||
      payment.method === PaymentMethod.DEBIT_CARD ||
      payment.method === PaymentMethod.ONLINE_GATEWAY;

    const epgSessionId =
      (payment.order.notes?.match(/EPG_SESSION:([^\s|]+)/)?.[1] ?? '') ||
      (payment.notes?.includes('EPG') ? (payment.transactionId || '') : '') ||
      '';

    if (isGatewayPayment && epgSessionId) {
      const gatewayResult = await epgService.refundCapturedPayment({
        sessionId: epgSessionId,
        amount: Number(payment.amount),
        orderNumber: payment.order.orderNumber,
        reason: notes || 'Admin-initiated refund',
      });

      if (!gatewayResult.success) {
        logger.error('[Payment] EPG refund failed before local refund', {
          reason: gatewayResult.reason,
          refundId: gatewayResult.refundId,
        });
        throw new BadRequestError('payment.gatewayRefundFailed');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.REFUNDED,
          notes: notes ? `${payment.notes || ''}\nRefund Note: ${notes}` : payment.notes
        }
      });

      const allPayments = await tx.payment.findMany({
        where: { orderId: payment.orderId }
      });

      const totalPaidAfterRefund = allPayments
        .filter(p => p.status === PaymentStatus.PAID)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      let newPaymentStatus: PaymentStatus = PaymentStatus.REFUNDED;
      if (totalPaidAfterRefund > 0) {
        newPaymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
      }

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: newPaymentStatus,
          status: OrderStatus.REFUNDED
        }
      });

      // Restore inventory once if it was deducted for this order (idempotent).
      if (newPaymentStatus === PaymentStatus.REFUNDED) {
        await orderService.restoreInventoryForOrder(payment.orderId, userId, tx);
      }

      await AuditService.log({
        userId,
        action: 'PAYMENT_REFUNDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        changes: { prevStatus: payment.status, newStatus: PaymentStatus.REFUNDED }
      });

      await NotificationService.notify({
        type: NotificationType.REFUND_ISSUED,
        title: 'Refund Processed',
        message: `A refund of SAR ${payment.amount} for order ${payment.order.orderNumber} has been processed.`,
        module: 'PAYMENT',
        userId: payment.order.userId,
        relatedId: payment.id,
        triggeredById: userId
      });

      return this.normalizePayment(updatedPayment);
    });
  }
}
