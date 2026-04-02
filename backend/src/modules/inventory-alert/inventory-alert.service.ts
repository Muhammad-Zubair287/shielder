/**
 * Inventory Alert Service
 * Handles alert creation, updates, and stock monitoring
 */

import { prisma } from '@/config/database';
import { NotFoundError, BadRequestError } from '@/common/errors/api.error';
import { logger } from '@/common/logger/logger';

type AlertStatusValue = 'ACTIVE' | 'INACTIVE' | 'TRIGGERED';

export class InventoryAlertService {
  /**
   * Create an inventory alert for a product
   * One alert per product maximum
   */
  static async createAlert(productId: string, threshold: number) {
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Check if alert already exists for product
    const existingAlert = await prisma.inventoryAlert.findUnique({
      where: { productId },
      select: { id: true },
    });

    if (existingAlert) {
      throw new BadRequestError('Alert already exists for this product');
    }

    // Create alert
    const alert = await prisma.inventoryAlert.create({
      data: {
        productId,
        threshold,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        productId: true,
        threshold: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info(`Inventory alert created: ${alert.id} for product ${productId}`);

    return alert;
  }

  /**
   * Update an inventory alert
   */
  static async updateAlert(alertId: string, threshold?: number, status?: string) {
    const alert = await prisma.inventoryAlert.findUnique({
      where: { id: alertId },
      select: { id: true },
    });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    const data: { threshold?: number; status?: AlertStatusValue } = {};
    if (threshold !== undefined) data.threshold = threshold;
    if (status && ['ACTIVE', 'INACTIVE', 'TRIGGERED'].includes(status)) {
      data.status = status as AlertStatusValue;
    }

    const updated = await prisma.inventoryAlert.update({
      where: { id: alertId },
      data,
      select: {
        id: true,
        productId: true,
        threshold: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info(`Inventory alert updated: ${alertId}`);

    return updated;
  }

  /**
   * List inventory alerts with optional filtering
   */
  static async listAlerts(status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: { status?: AlertStatusValue } = {};

    if (status && ['ACTIVE', 'INACTIVE', 'TRIGGERED'].includes(status)) {
      where.status = status as AlertStatusValue;
    }

    const alerts = await prisma.inventoryAlert.findMany({
      where,
      select: {
        id: true,
        productId: true,
        threshold: true,
        status: true,
        lastTriggeredAt: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            stock: true,
            sku: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.inventoryAlert.count({ where });

    return {
      alerts: alerts.map(a => ({
        id: a.id,
        productId: a.productId,
        productSku: a.product?.sku,
        currentStock: a.product?.stock,
        threshold: a.threshold,
        status: a.status,
        belowThreshold: (a.product?.stock ?? 0) < a.threshold,
        lastTriggeredAt: a.lastTriggeredAt,
        createdAt: a.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check and trigger alerts for products below threshold
   * Called periodically or after inventory updates
   */
  static async checkAndTriggerAlerts() {
    const alerts = await prisma.inventoryAlert.findMany({
      where: { status: 'ACTIVE' },
      include: {
        product: { select: { id: true, stock: true, sku: true } },
      },
    });

    const triggered: string[] = [];

    for (const alert of alerts) {
      if ((alert.product?.stock ?? 0) < alert.threshold) {
        // Update alert status to TRIGGERED
        await prisma.inventoryAlert.update({
          where: { id: alert.id },
          data: {
            status: 'TRIGGERED',
            lastTriggeredAt: new Date(),
          },
        });

        triggered.push(alert.id);
        logger.warn(
          `Inventory alert triggered: Product ${alert.product?.sku} (Stock: ${alert.product?.stock}, Threshold: ${alert.threshold})`
        );
      }
    }

    return triggered;
  }

  /**
   * Delete an inventory alert
   */
  static async deleteAlert(alertId: string) {
    const alert = await prisma.inventoryAlert.findUnique({
      where: { id: alertId },
      select: { id: true },
    });

    if (!alert) {
      throw new NotFoundError('Alert not found');
    }

    await prisma.inventoryAlert.delete({ where: { id: alertId } });

    logger.info(`Inventory alert deleted: ${alertId}`);

    return { success: true };
  }
}
