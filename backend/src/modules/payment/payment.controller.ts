/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { PaginationParams } from '../../common/utils/pagination';
import { t } from '@/common/i18n';

const paymentService = new PaymentService();

export class PaymentController {
  /**
   * @swagger
   * /api/payments/stats:
   *   get:
   *     summary: Get payment dashboard summary cards
   *     tags: [Payments]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Payment statistics
   */
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await paymentService.getPaymentStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/payments:
   *   get:
   *     summary: List all payments with filtering
   *     tags: [Payments]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: status
   *         schema: { type: string }
   *       - in: query
   *         name: method
   *         schema: { type: string }
   *       - in: query
   *         name: dateFrom
   *         schema: { type: string, format: date }
   *       - in: query
   *         name: dateTo
   *         schema: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Paginated payment list
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        method: req.query.method,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };

      const pagination: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        skip: (parseInt(req.query.page as string || '1') - 1) * (parseInt(req.query.limit as string || '10')),
      };

      const result = await paymentService.getAllPayments(filters, pagination);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/payments/{id}:
   *   get:
   *     summary: Get single payment details
   *     tags: [Payments]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Payment details
   *       404:
   *         description: Payment not found
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const payment = await paymentService.getPaymentById(id as string);
      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/payments:
   *   post:
   *     summary: Record a manual payment (Admin/SuperAdmin)
   *     tags: [Payments]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [orderId, amount, method]
   *             properties:
   *               orderId: { type: string }
   *               amount: { type: number }
   *               method: { type: string, enum: [CASH, BANK_TRANSFER, CREDIT_CARD, OTHER] }
   *               notes: { type: string }
   *     responses:
   *       201:
   *         description: Payment recorded
   */
  async record(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const payment = await paymentService.recordPayment({
        ...req.body,
        recordedBy: userId,
      });

      res.status(201).json({
        success: true,
        message: t('payment.recorded', req.locale),
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/payments/{id}/refund:
   *   post:
   *     summary: Process a refund for a payment (Admin/SuperAdmin)
   *     tags: [Payments]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               notes: { type: string }
   *     responses:
   *       200:
   *         description: Refund processed
   */
  async refund(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const payment = await paymentService.processRefund(
        id as string,
        userId,
        req.body.notes
      );

      res.status(200).json({
        success: true,
        message: t('payment.refunded', req.locale),
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}
