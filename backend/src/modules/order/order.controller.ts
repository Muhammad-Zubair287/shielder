import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { getPaginationParams } from '../../common/utils/pagination';

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
      const order = await orderService.createOrder(req.body);
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order,
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
        message: 'Orders retrieved successfully',
        ...result,
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
  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id as string);
      res.json({
        success: true,
        message: 'Order retrieved successfully',
        data: order,
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
  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const performedBy = user ? `${user.role}: ${user.email}` : 'Unknown Admin';
      const order = await orderService.updateOrderStatus(id as string, { ...req.body, performedBy });
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order,
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
  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await orderService.getOrderSummary();
      res.json({
        success: true,
        message: 'Order summary retrieved successfully',
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
  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id as string;
      const page   = parseInt(req.query.page  as string || '1',  10);
      const limit  = parseInt(req.query.limit as string || '10', 10);
      const result = await orderService.getMyOrders(userId, page, limit);
      res.json({
        success: true,
        message: 'Orders retrieved successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
