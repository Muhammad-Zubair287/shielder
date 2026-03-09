import { prisma } from '@/config/database';
import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import crypto from 'crypto';
// @ts-ignore
import { OrderStatus, PaymentStatus, StockChangeType, Prisma, NotificationType, UserRole } from '@prisma/client';
import NotificationService from '@/modules/notification/notification.service';
import { StockAlertService } from '../inventory/stock-alert/stock-alert.service';

export class OrderService {
  /**
   * Load order-related system settings from DB (with safe defaults)
   */
  private async getOrderSettings() {
    try {
      const s = await (prisma as any).systemSettings.findUnique({ where: { id: 'CURRENT' } });
      return {
        defaultOrderStatus: (s?.defaultOrderStatus as OrderStatus) ?? OrderStatus.PENDING,
        allowOrderCancellation: s?.allowOrderCancellation ?? true,
        autoCompleteOrderAfterPayment: s?.autoCompleteOrderAfterPayment ?? true,
        paymentMethodsEnabled: Array.isArray(s?.paymentMethodsEnabled) ? s.paymentMethodsEnabled as string[] : null,
      };
    } catch {
      return {
        defaultOrderStatus: OrderStatus.PENDING,
        allowOrderCancellation: true,
        autoCompleteOrderAfterPayment: true,
        paymentMethodsEnabled: null,
      };
    }
  }

  /**
   * Create a new order with stock deduction
   */
  async createOrder(data: any) {
    const { userId, items, ...orderData } = data;

    // Read configured default order status
    const { defaultOrderStatus, paymentMethodsEnabled } = await this.getOrderSettings();

    // Validate payment method is enabled
    const chosenMethod = orderData.paymentMethod || 'CASH';
    if (paymentMethodsEnabled && paymentMethodsEnabled.length > 0 && !paymentMethodsEnabled.includes(chosenMethod)) {
      throw new BadRequestError(`Payment method "${chosenMethod}" is not currently enabled. Allowed: ${paymentMethodsEnabled.join(', ')}`);
    }

    // Generate a human-readable order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await prisma.$transaction(async (tx: any) => {
      // 1. Prepare order items and check basic existence
      const orderItemsData = [];
      
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, price: true, translations: { where: { locale: 'en' }, select: { name: true } } }
        });

        if (!product) {
          throw new NotFoundError(`Product with ID ${item.productId} not found`);
        }

        // Handle variant if provided
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId }
          });
          if (!variant) throw new NotFoundError(`Variant with ID ${item.variantId} not found`);
        }

        orderItemsData.push({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice: new Prisma.Decimal(product.price).mul(item.quantity)
        });
      }

      // 2. Calculate financial details
      const subtotal = orderItemsData.reduce((acc, item) => acc.add(item.totalPrice), new Prisma.Decimal(0));
      const taxRate = 0.1; // 10% tax for example, or get from config
      const tax = subtotal.mul(taxRate);
      const total = subtotal.add(tax);

      // 4. Create the order
      const result = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal,
          tax,
          total,
          customerName: orderData.customerName || 'Guest Customer',
          phoneNumber: orderData.phoneNumber,
          shippingAddress: orderData.shippingAddress,
          paymentMethod: orderData.paymentMethod || 'CASH',
          paymentStatus: orderData.paymentStatus || PaymentStatus.PENDING,
          status: orderData.status || defaultOrderStatus,
          notes: orderData.notes,
          orderItems: {
            create: orderItemsData
          }
        },
        include: {
          orderItems: true
        }
      });

      return result;
    });

    // 5. Trigger Notifications
    await NotificationService.notify({
      type: NotificationType.ORDER_CREATED,
      title: 'New Order Created',
      message: `A new order ${order.orderNumber} has been placed. Total: SAR ${order.total}`,
      module: 'ORDER',
      roleTarget: UserRole.SUPER_ADMIN,
      relatedId: order.id
    });

    return order;
  }

  /**
   * Get all orders with filtering and pagination
   */
  async getOrders(filters: any, pagination: any) {
    const { skip, limit } = pagination;
    const { search, status, paymentStatus, dateFrom, dateTo, sortBy, sortOrder } = filters;

    const where: Prisma.OrderWhereInput = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          users: {
            select: {
              email: true,
              profile: {
                select: {
                  fullName: true
                }
              }
            }
          },
          payments: {
            select: {
              amount: true,
              status: true
            }
          },
          _count: {
            select: { orderItems: true }
          }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      })
    ]);

    return {
      orders,
      pagination: {
        total,
        page: Math.floor(skip / limit) + 1,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single order by ID
   */
  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                translations: true,
                specifications: true
              }
            }
          }
        },
        users: {
          include: {
            profile: true
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  /**
   * Update order status with stock management
   */
  async updateOrderStatus(id: string, data: { status?: OrderStatus, paymentStatus?: PaymentStatus, performedBy?: string }) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { 
        orderItems: { 
          include: { 
            product: { 
              include: { 
                translations: { 
                  where: { locale: 'en' } 
                } 
              } 
            }, 
            variant: true 
          } 
        } 
      }
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Enforce order settings from system configuration
    const { allowOrderCancellation, autoCompleteOrderAfterPayment } = await this.getOrderSettings();

    // Block cancellation if the setting is disabled
    if (data.status === OrderStatus.CANCELLED && !allowOrderCancellation) {
      throw new BadRequestError('Order cancellation is currently disabled by your administrator.');
    }

    // Auto-complete order when payment is received (if setting is enabled)
    if (
      data.paymentStatus === PaymentStatus.PAID &&
      autoCompleteOrderAfterPayment &&
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      data.status = OrderStatus.DELIVERED;
    }

    const previousStatus = order.status;
    const newStatus = data.status;
    const performedBy = data.performedBy || 'System/Admin';

    const updatedOrder = await prisma.$transaction(async (tx: any) => {
      // 1. Handle "Completed" (DELIVERED) logic
      if (newStatus === OrderStatus.DELIVERED && previousStatus !== OrderStatus.DELIVERED) {
        for (const item of order.orderItems) {
          // Check Stock (Normal Product or Variant)
          if (item.variantId && item.variant) {
            if (item.variant.stock < item.quantity) {
              throw new BadRequestError(`Insufficient stock for variant "${item.variant.name}". Cannot complete this order.`);
            }
          } else {
            if (item.product.stock < item.quantity) {
              const productName = item.product.translations[0]?.name || 'Product';
              throw new BadRequestError(`Insufficient stock for "${productName}". Cannot complete this order.`);
            }
          }

          // Deduct Stock
          if (item.variantId) {
            await tx.product_variants.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } }
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            });
          }

          // Maintain Stock Log
          const productName = item.product.translations[0]?.name || 'Product';
          await tx.stock_history.create({
            data: {
              id: crypto.randomUUID(),
              product_id: item.productId,
              product_name: item.variantId ? `${productName} (${item.variant?.name})` : productName,
              order_id: order.id,
              quantity: -item.quantity,
              type: StockChangeType.ORDER_COMPLETED,
              performed_by: performedBy,
              note: `Order ${order.orderNumber} marked as Completed`
            }
          });

          // Trigger Low Stock Alert
          await StockAlertService.checkAndNotify(item.productId);
        }
      }

      // 2. Handle "Cancelled" Restoration (only if it was previously COMPLETED/DELIVERED)
      if (newStatus === OrderStatus.CANCELLED && previousStatus === OrderStatus.DELIVERED) {
        for (const item of order.orderItems) {
          // Restore Stock
          if (item.variantId) {
            await tx.product_variants.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } }
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });
          }

          // Log Action
          const productName = item.product.translations[0]?.name || 'Product';
          await tx.stock_history.create({
            data: {
              id: crypto.randomUUID(),
              product_id: item.productId,
              product_name: item.variantId ? `${productName} (${item.variant?.name})` : productName,
              order_id: order.id,
              quantity: item.quantity,
              type: StockChangeType.ORDER_CANCELLED,
              performed_by: performedBy,
              note: `Order ${order.orderNumber} cancelled. Stock restored.`
            }
          });
        }
      }

      // 3. Update Order Status
      return await tx.order.update({
        where: { id },
        data: {
          status: data.status || order.status,
          paymentStatus: data.paymentStatus || order.paymentStatus,
          updatedAt: new Date()
        }
      });
    });

    // 4. Send Status Change Notification
    if (newStatus && newStatus !== previousStatus) {
      // Notify User
      await NotificationService.notify({
        type: NotificationType.ORDER_COMPLETED, // General type for status updates for now
        title: `Order Status Updated`,
        message: `Your order ${order.orderNumber} is now ${newStatus}.`,
        module: 'ORDER',
        userId: order.userId,
        relatedId: order.id
      });

      // Notify Admin if it's completed
      if (newStatus === OrderStatus.DELIVERED) {
        await NotificationService.notify({
          type: NotificationType.ORDER_COMPLETED,
          title: 'Order Delivered',
          message: `Order ${order.orderNumber} has been successfully delivered and completed.`,
          module: 'ORDER',
          roleTarget: UserRole.SUPER_ADMIN,
          relatedId: order.id
        });
      }
    }

    return updatedOrder;
  }

  /**
   * Get orders for the authenticated customer (customer self-service)
   */
  async getMyOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = { userId };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  translations: { where: { locale: 'en' }, select: { name: true } },
                  attachments:  { where: { type: 'IMAGE' }, take: 1, select: { fileUrl: true } },
                },
              },
            },
          },
          payments: { select: { amount: true, status: true, method: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get summary for dashboard
   */
  async getOrderSummary() {
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders
    };
  }
}

export const orderService = new OrderService();
