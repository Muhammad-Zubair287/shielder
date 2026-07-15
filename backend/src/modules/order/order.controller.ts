/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { getPaginationParams } from '../../common/utils/pagination';
import { AuthRequest } from '@/types/global';
import { BadRequestError } from '../../common/errors/api.error';
import { PaymentStatus } from '@prisma/client';
import { emitToUser, emitToRole } from '../realtime/socket.service';
import { t } from '@/common/i18n';

const getRequestOrigin = (req: Request): string => {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const isProduction = process.env.NODE_ENV === 'production';
  const protocol = isProduction ? 'https' : (forwardedProto || req.protocol);
  const host = forwardedHost || req.get('host');

  return host ? `${protocol}://${host}` : '';
};

const resolvePublicImageUrl = (req: Request, imagePath?: string | null): string | null => {
  if (!imagePath) return null;

  if (/^(https?:\/\/|data:|blob:)/i.test(imagePath)) {
    return imagePath;
  }

  const normalized = imagePath.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  const pathPart = normalized.startsWith('/') ? normalized : `/${normalized}`;

  if (
    normalized.startsWith('images/') ||
    normalized.startsWith('uploads/') ||
    pathPart.startsWith('/images/') ||
    pathPart.startsWith('/uploads/')
  ) {
    const origin = getRequestOrigin(req);
    return origin ? `${origin}${pathPart}` : pathPart;
  }

  return imagePath;
};

const normalizeOrder = (req: Request, order: any) => {
  if (!order) return order;

  const locale = (req as any).locale || 'en';

  const orderItems = Array.isArray(order.orderItems)
    ? order.orderItems.map((item: any) => {
        const product = item.product ? {
          ...item.product,
          mainImage: resolvePublicImageUrl(req, item.product.mainImage),
          thumbnail: resolvePublicImageUrl(
            req,
            item.product.mainImage || item.product.attachments?.[0]?.fileUrl || item.product.attachments?.[0]?.url || null
          ),
          attachments: Array.isArray(item.product.attachments)
            ? item.product.attachments.map((attachment: any) => {
                const fileUrl = resolvePublicImageUrl(req, attachment.fileUrl || attachment.url || null);
                return {
                  ...attachment,
                  fileUrl,
                  url: fileUrl,
                };
              })
            : item.product.attachments,
        } : item.product;

        return {
          ...item,
          product,
        };
      })
    : order.orderItems;

  return {
    ...order,
    orderId: order.id,
    orderType: order.deliveryType,
    statusLabel: order.status ? t(`orderStatus.${order.status}`, locale) : undefined,
    paymentStatusLabel: order.paymentStatus ? t(`paymentStatus.${order.paymentStatus}`, locale) : undefined,
    deliveryTypeLabel: order.deliveryType ? t(`deliveryType.${order.deliveryType}`, locale) : undefined,
    warehouse: order.deliveryType === 'PICKUP' && order.warehouse ? {
      name: order.warehouse.name,
      address: order.warehouse.address,
      city: order.warehouse.city,
      country: order.warehouse.country,
    } : undefined,
    orderItems,
    user: order.users ?? undefined,
  };
};

const validatePaymentStatusTransition = (current: PaymentStatus, next: PaymentStatus, locale: string) => {
  if (current === PaymentStatus.PAID && next === PaymentStatus.UNPAID) {
    throw new BadRequestError(t('order.paymentStatusLocked', locale));
  }
};

export class OrderController {
  /**
   * @swagger
   * /api/orders:
   *   post:
   *     summary: Create a new order
   *     tags: [Orders]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [customerId, items]
   *             properties:
   *               customerId: { type: string }
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     productId: { type: string }
   *                     quantity: { type: integer }
   *     responses:
   *       201:
   *         description: Order created
   */
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthRequest;

      // userId is never accepted from the request body — always resolved from the JWT.
      const payload = {
        ...req.body,
        userId: authReq.user!.id,
      };

      const order = await orderService.createOrder(payload);
      const normalized = normalizeOrder(req, order);
      const ownerId: string = (order as any).userId || payload.userId;
      if (ownerId) emitToUser(ownerId, 'order:created', normalized);
      emitToRole('ADMIN', 'order:created', normalized);
      emitToRole('SUPER_ADMIN', 'order:created', normalized);
      res.status(201).json({
        success: true,
        message: t('order.createSuccess', req.locale),
        data: normalized,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/orders:
   *   get:
   *     summary: List orders with filters (Admin)
   *     tags: [Orders]
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
   *     responses:
   *       200:
   *         description: Paginated order list
   */
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = req.query;
      const result = await orderService.getOrders(filters, pagination);
      res.json({
        success: true,
        message: t('order.listSuccess', req.locale),
        orders: result.orders.map((order) => normalizeOrder(req, order)),
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/orders/{id}:
   *   get:
   *     summary: Get single order details
   *     tags: [Orders]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Order details
   *       404:
   *         description: Order not found
   */
  async getOrderById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id as string, req.user);
      res.json({
        success: true,
        message: t('order.getSuccess', req.locale),
        data: normalizeOrder(req, order),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/orders/{id}/status:
   *   patch:
   *     summary: Update order or payment status (Admin)
   *     tags: [Orders]
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
   *               status: { type: string, enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED] }
   *               paymentStatus: { type: string, enum: [PENDING, PAID, REFUNDED, PARTIAL] }
   *     responses:
   *       200:
   *         description: Order status updated
   */
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const performedBy = req.user ? `${req.user.role}: ${req.user.email}` : 'Unknown Admin';

      if (req.body?.paymentStatus) {
        const currentOrder = await orderService.getOrderById(id as string, req.user);
        validatePaymentStatusTransition(currentOrder.paymentStatus, req.body.paymentStatus, req.locale);
      }

      const order = await orderService.updateOrderStatus(id as string, { ...req.body, performedBy });
      const normalized = normalizeOrder(req, order);
      const ownerId: string = (order as any).userId;
      if (ownerId) emitToUser(ownerId, 'order:updated', normalized);
      emitToRole('ADMIN', 'order:updated', normalized);
      emitToRole('SUPER_ADMIN', 'order:updated', normalized);
      res.json({
        success: true,
        message: t('order.updateSuccess', req.locale),
        data: normalized,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/orders/summary:
   *   get:
   *     summary: Get order totals for dashboard summary cards (Admin)
   *     tags: [Orders]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Order summary statistics
   */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await orderService.getOrderSummary();
      res.json({
        success: true,
        message: t('order.summarySuccess', req.locale),
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders/my
   * Authenticated customer fetches their own orders.
   */
  async getMyOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id as string;
      const page   = parseInt(req.query.page  as string || '1',  10);
      const limit  = parseInt(req.query.limit as string || '10', 10);
      const result = await orderService.getMyOrders(userId, page, limit);
      res.json({
        success: true,
        message: t('order.listSuccess', req.locale),
        orders: result.orders.map((order) => normalizeOrder(req, order)),
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
