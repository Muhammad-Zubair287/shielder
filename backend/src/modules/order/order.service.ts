import { prisma } from '@/config/database';
import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import crypto from 'crypto';
import { OrderStatus, PaymentStatus, StockChangeType, Prisma, NotificationType, UserRole } from '@prisma/client';
import NotificationService from '@/modules/notification/notification.service';
import { StockAlertService } from '../inventory/stock-alert/stock-alert.service';
import { inventoryService } from '../inventory/inventory.service';
import { inventoryRepository } from '../inventory/inventory.repository';
import { orderRepository } from './order.repository';
import redisCacheService from '@/common/services/redis-cache.service';
import { CACHE_KEYS } from '@/common/constants/cache-keys';
import SettingsService from '../settings/settings.service';

type OrderItemInput = {
  productId: string;
  quantity: number;
  variantId?: string | null;
};

type CreateOrderInput = {
  userId: string;
  items: OrderItemInput[];
  customerName?: string;
  phoneNumber?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  status?: OrderStatus;
  notes?: string;
  deliveryType?: 'DELIVERY' | 'PICKUP';
  warehouseId?: string;
};

type OrderFilters = {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: keyof Prisma.OrderOrderByWithRelationInput;
  sortOrder?: Prisma.SortOrder;
};

type PaginationInput = {
  skip: number;
  limit: number;
};

type PublicImageAttachment = {
  fileUrl: string;
  url: string;
};

type AuthenticatedUser = {
  userId: string;
  role: UserRole;
  email?: string;
};

export class OrderService {
  private validatePaymentStatusTransition(current: PaymentStatus, next: PaymentStatus) {
    if (current === next) return;

    if (current === PaymentStatus.PAID && next === PaymentStatus.UNPAID) {
      throw new BadRequestError('Payment status cannot be changed once marked as PAID');
    }
  }

  private validateStatusTransition(current: OrderStatus, next: OrderStatus, deliveryType: 'DELIVERY' | 'PICKUP') {
    if (current === next) return;

    const deliveryTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.READY_FOR_PICKUP]: [],
    };

    const pickupTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [],
      [OrderStatus.DELIVERED]: [],
    };

    const transitions = deliveryType === 'PICKUP' ? pickupTransitions : deliveryTransitions;
    const allowed = transitions[current] || [];

    if (!allowed.includes(next)) {
      throw new BadRequestError(`Invalid status transition from ${current} to ${next}`);
    }
  }

  private async invalidateDashboardCaches() {
    await Promise.all([
      redisCacheService.del(CACHE_KEYS.SUPERADMIN_DASHBOARD_SUMMARY),
      redisCacheService.del(CACHE_KEYS.SUPERADMIN_MONTHLY_ANALYTICS),
    ]);
  }

  private static resolvePublicImageUrl(imagePath?: string | null): string | null {
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
      return pathPart;
    }

    return imagePath;
  }

  private async resolveOrderWarehouseId(
    deliveryType: 'DELIVERY' | 'PICKUP',
    pickupWarehouseId?: string,
  ): Promise<string> {
    return inventoryService.resolveWarehouseForOrder(deliveryType, pickupWarehouseId);
  }

  /**
   * Checkout / order-create stock gate only — never reserves or deducts.
   */
  private async assertInventoryAvailableForItem(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    orderedQuantity: number,
  ) {
    const quantityToCheck = Math.max(0, Math.trunc(orderedQuantity));
    if (quantityToCheck <= 0) {
      throw new BadRequestError('Invalid order quantity');
    }

    await tx.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId,
          warehouseId,
        },
      },
      create: {
        productId,
        warehouseId,
        quantity: 0,
        reservedQuantity: 0,
      },
      update: {},
    });

    await inventoryService.assertAvailableStock(productId, warehouseId, quantityToCheck, tx);
  }

  private async hasStockHistoryEntry(
    tx: Prisma.TransactionClient,
    orderId: string,
    type: StockChangeType,
  ): Promise<boolean> {
    const existing = await tx.stock_history.findFirst({
      where: { order_id: orderId, type },
      select: { id: true },
    });
    return Boolean(existing);
  }

  /**
   * Deduct inventory after verified payment success.
   * Idempotent via stock_history ORDER_COMPLETED rows for this order.
   * Does NOT touch reservedQuantity for normal checkout (legacy reservations are cleared in SQL).
   */
  async deductInventoryAfterPaymentSuccess(
    orderId: string,
    performedBy: string,
    externalTx?: Prisma.TransactionClient,
  ): Promise<'deducted' | 'already_deducted'> {
    const run = async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  translations: { where: { locale: 'en' } },
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      if (await this.hasStockHistoryEntry(tx, order.id, StockChangeType.ORDER_COMPLETED)) {
        return 'already_deducted' as const;
      }

      const orderWarehouseId = await this.resolveOrderWarehouseId(
        order.deliveryType as 'DELIVERY' | 'PICKUP',
        order.warehouseId ?? undefined,
      );

      for (const item of order.orderItems) {
        if (item.variantId && item.variant && item.variant.stock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for variant "${item.variant.name}". Cannot confirm payment inventory.`,
          );
        }

        await inventoryService.deductStockOnPayment(item.productId, orderWarehouseId, item.quantity, tx);

        const productUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (productUpdate.count === 0) {
          const productName = item.product.translations[0]?.name || 'Product';
          throw new BadRequestError(
            `Insufficient stock for "${productName}". Cannot confirm payment inventory.`,
          );
        }

        if (item.variantId) {
          await tx.product_variants.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }

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
            note: `Order ${order.orderNumber} payment verified — stock deducted`,
          },
        });

        await StockAlertService.checkAndNotify(item.productId);
      }

      return 'deducted' as const;
    };

    if (externalTx) {
      return run(externalTx);
    }

    return prisma.$transaction((tx) => run(tx), {
      timeout: 15000,
      maxWait: 5000,
    });
  }

  /**
   * Restore inventory once when cancelling/refunding an order that already had stock deducted.
   * Idempotent via stock_history ORDER_CANCELLED rows.
   */
  private async restoreInventoryIfDeducted(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      orderNumber: string;
      deliveryType: string;
      warehouseId: string | null;
      orderItems: Array<{
        productId: string;
        quantity: number;
        variantId: string | null;
        product: { translations: Array<{ name: string }> };
        variant: { name: string } | null;
      }>;
    },
    performedBy: string,
  ): Promise<'restored' | 'already_restored' | 'not_deducted'> {
    const wasDeducted = await this.hasStockHistoryEntry(tx, order.id, StockChangeType.ORDER_COMPLETED);
    if (!wasDeducted) {
      // Best-effort release of any legacy reservation from the old reserve-on-checkout model.
      const orderWarehouseId = await this.resolveOrderWarehouseId(
        order.deliveryType as 'DELIVERY' | 'PICKUP',
        order.warehouseId ?? undefined,
      );
      for (const item of order.orderItems) {
        await inventoryRepository.releaseReservedStock(
          item.productId,
          orderWarehouseId,
          item.quantity,
          tx,
        );
      }
      return 'not_deducted';
    }

    if (await this.hasStockHistoryEntry(tx, order.id, StockChangeType.ORDER_CANCELLED)) {
      return 'already_restored';
    }

    const orderWarehouseId = await this.resolveOrderWarehouseId(
      order.deliveryType as 'DELIVERY' | 'PICKUP',
      order.warehouseId ?? undefined,
    );

    for (const item of order.orderItems) {
      await inventoryService.increaseStock(item.productId, orderWarehouseId, item.quantity, tx);

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });

      if (item.variantId) {
        await tx.product_variants.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }

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
          note: `Order ${order.orderNumber} cancelled/refunded. Stock restored.`,
        },
      });
    }

    return 'restored';
  }

  private static normalizeAttachments(product: any) {
    const attachments = Array.isArray(product?.attachments) ? product.attachments : [];

    return attachments.map((attachment: any) => {
      const fileUrl = OrderService.resolvePublicImageUrl(attachment?.fileUrl ?? attachment?.url ?? null) || '';
      return {
        ...attachment,
        fileUrl,
        url: fileUrl,
      } satisfies PublicImageAttachment;
    });
  }

  private static normalizeOrderItem(item: any) {
    const product = item?.product;
    if (!product) return item;

    return {
      ...item,
      product: {
        ...product,
        mainImage: OrderService.resolvePublicImageUrl(product.mainImage),
        thumbnail: OrderService.resolvePublicImageUrl(
          product.attachments?.[0]?.fileUrl || product.attachments?.[0]?.url || product.mainImage || null
        ),
        attachments: OrderService.normalizeAttachments(product),
      },
    };
  }

  private static normalizeOrder(order: any, currency: string) {
    if (!order) return order;

    return {
      ...order,
      currency,
      orderItems: Array.isArray(order.orderItems)
        ? order.orderItems.map((item: any) => OrderService.normalizeOrderItem(item))
        : order.orderItems,
    };
  }

  /**
   * Load order-related system settings from DB (with safe defaults)
   */
  private async getOrderSettings() {
    try {
      const s = await prisma.systemSettings.findUnique({ where: { id: 'CURRENT' } });
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
   * Create a new order with stock availability check (no reservation / no deduction).
   */
  async createOrder(data: CreateOrderInput) {
    const { userId, items, deliveryType: requestedDeliveryType, warehouseId, ...orderData } = data;

    // Apply safe defaults: DELIVERY is default if not specified
    const deliveryType = requestedDeliveryType || 'DELIVERY';

    // Resolve the single authoritative warehouse (pickup location / delivery inventory source).
    // Client warehouseId is never trusted for inventory assignment.
    const authoritativeWarehouseId = await this.resolveOrderWarehouseId(deliveryType, warehouseId);
    let pickupWarehouseSummary: string | undefined = undefined;
    let validatedWarehouseId: string | undefined = undefined;

    if (deliveryType === 'PICKUP') {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: authoritativeWarehouseId },
        select: { id: true, isActive: true, name: true },
      });

      if (!warehouse) {
        throw new NotFoundError('Pickup warehouse not found');
      }

      if (!warehouse.isActive) {
        throw new BadRequestError(`Warehouse "${warehouse.name}" is not active`);
      }

      validatedWarehouseId = warehouse.id;
      pickupWarehouseSummary = warehouse.name;
    }
    // For DELIVERY: order.warehouseId remains undefined; inventory still uses main warehouse.

    // Read configured default order status
    const { defaultOrderStatus, paymentMethodsEnabled } = await this.getOrderSettings();

    // Validate payment method is enabled
    const chosenMethod = orderData.paymentMethod || 'CASH';
    if (paymentMethodsEnabled && paymentMethodsEnabled.length > 0 && !paymentMethodsEnabled.includes(chosenMethod)) {
      throw new BadRequestError(`Payment method "${chosenMethod}" is not currently enabled. Allowed: ${paymentMethodsEnabled.join(', ')}`);
    }

    // Generate a human-readable order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const stockWarehouseId = authoritativeWarehouseId;
      const initialStatus = orderData.status || (deliveryType === 'PICKUP'
        ? OrderStatus.READY_FOR_PICKUP
        : OrderStatus.PENDING);

      // 1. Prepare order items — check availability, never reserve/deduct
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
          const variant = await tx.product_variants.findUnique({
            where: { id: item.variantId }
          });
          if (!variant) throw new NotFoundError(`Variant with ID ${item.variantId} not found`);
          if (variant.stock < item.quantity) {
            throw new BadRequestError(`Insufficient stock for variant "${variant.name}"`);
          }
        }

        await this.assertInventoryAvailableForItem(tx, item.productId, stockWarehouseId, item.quantity);

        orderItemsData.push({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice: new Prisma.Decimal(product.price).mul(item.quantity)
        });
      }

      // 2. Calculate financial details server-side (never trust client totals)
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
          status: initialStatus || defaultOrderStatus,
          notes: orderData.notes,
          deliveryType,
          warehouseId: validatedWarehouseId || undefined,
          orderItems: {
            create: orderItemsData
          }
        },
        include: {
          orderItems: true
        }
      });

      return result;
    }, {
      timeout: 15000,
      maxWait: 5000,
    });

    // 5. Trigger Notifications (fire-and-forget — never block the order response)
    const pickupSuffix = deliveryType === 'PICKUP'
      ? ` Pickup warehouse: ${pickupWarehouseSummary || validatedWarehouseId || 'N/A'}.`
      : '';

    NotificationService.notify({
      type: NotificationType.ORDER_CREATED,
      title: 'New Order Created',
      message: `A new order ${order.orderNumber} has been placed. Total: SAR ${order.total}.${pickupSuffix}`,
      module: 'ORDER',
      roleTarget: UserRole.SUPER_ADMIN,
      relatedId: order.id
    }).catch((err) => console.error('[Order] createOrder notification failed:', err));

    NotificationService.notify({
      type: NotificationType.ORDER_CREATED,
      title: 'New Order Created',
      message: `A new order ${order.orderNumber} has been placed. Total: SAR ${order.total}.${pickupSuffix}`,
      module: 'ORDER',
      roleTarget: UserRole.ADMIN,
      relatedId: order.id,
    }).catch((err) => console.error('[Order] createOrder admin notification failed:', err));

    await this.invalidateDashboardCaches();

    return order;
  }

  /**
   * Get all orders with filtering and pagination
   */
  async getOrders(filters: OrderFilters, pagination: PaginationInput) {
    const { skip, limit } = pagination;
    const { search, status, paymentStatus, dateFrom, dateTo, sortBy, sortOrder } = filters;
     const currency = await SettingsService.getCurrency();

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

    const sortField: keyof Prisma.OrderOrderByWithRelationInput = sortBy ?? 'createdAt';
    const resolvedSortOrder: Prisma.SortOrder = sortOrder ?? 'desc';
    const orderBy = {
      [sortField as string]: resolvedSortOrder,
    } as Prisma.OrderOrderByWithRelationInput;

    const [total, orders] = await Promise.all([
      orderRepository.count(where),
      orderRepository.list(where, skip, limit, orderBy),
    ]);

    return {
       orders: orders.map((order) => OrderService.normalizeOrder(order, currency)),
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
   * Enforces ownership check: customers can only access their own orders
   * Admin/Super Admin can access any order
   */
  async getOrderById(id: string, user?: AuthenticatedUser) {
    const order = await orderRepository.findByIdWithDetails(id);
     const currency = await SettingsService.getCurrency();

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Ownership check: customer can only access their own orders
    // Admin/Super Admin bypass this check
    if (user && user.role === UserRole.USER && order.userId !== user.userId) {
      const linkedQuotation = user.email
        ? await prisma.quotation.findFirst({
            where: {
              convertedOrderId: id,
              customerEmail: { equals: user.email, mode: 'insensitive' },
            },
            select: { id: true },
          })
        : null;

      if (!linkedQuotation) {
        throw new NotFoundError('Order not found'); // Return 404 to avoid leaking existence
      }
    }

     return OrderService.normalizeOrder(order, currency);
  }

  /**
   * Update order status. Inventory deduction happens only on verified payment success,
   * never on DELIVERED / COMPLETED / READY_FOR_PICKUP transitions.
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
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.CANCELLED
    ) {
      data.status = order.deliveryType === 'PICKUP' ? OrderStatus.READY_FOR_PICKUP : OrderStatus.DELIVERED;
    }

    const previousStatus = order.status;
    const previousPaymentStatus = order.paymentStatus;
    const newStatus = data.status;
    const performedBy = data.performedBy || 'System/Admin';

    if (newStatus) {
      this.validateStatusTransition(previousStatus, newStatus, order.deliveryType as 'DELIVERY' | 'PICKUP');
    }

    if (data.paymentStatus) {
      this.validatePaymentStatusTransition(order.paymentStatus, data.paymentStatus);
    }

    const updatedOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const becomingPaid =
        data.paymentStatus === PaymentStatus.PAID && previousPaymentStatus !== PaymentStatus.PAID;

      // Verified payment success → deduct stock once (idempotent).
      if (becomingPaid) {
        await this.deductInventoryAfterPaymentSuccess(order.id, performedBy, tx);
      }

      // Cancellation / refund: restore only if stock was actually deducted for this order.
      if (newStatus === OrderStatus.CANCELLED || newStatus === OrderStatus.REFUNDED) {
        await this.restoreInventoryIfDeducted(tx, order, performedBy);
      }

      // DELIVERED / COMPLETED / READY_FOR_PICKUP must never deduct stock again.
      return await tx.order.update({
        where: { id },
        data: {
          status: data.status || order.status,
          paymentStatus: data.paymentStatus || order.paymentStatus,
          updatedAt: new Date()
        }
      });
    });

    // 4. Send Status Change Notification (fire-and-forget)
    if (newStatus && newStatus !== previousStatus) {
      NotificationService.notify({
        type: NotificationType.ORDER_COMPLETED,
        title: `Order Status Updated`,
        message: `Your order ${order.orderNumber} is now ${newStatus}.`,
        module: 'ORDER',
        userId: order.userId,
        relatedId: order.id
      }).catch((err) => console.error('[Order] updateStatus user notification failed:', err));

      if (newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.COMPLETED) {
        NotificationService.notify({
          type: NotificationType.ORDER_COMPLETED,
          title: 'Order Delivered',
          message: `Order ${order.orderNumber} has been successfully completed.`,
          module: 'ORDER',
          roleTarget: UserRole.SUPER_ADMIN,
          relatedId: order.id
        }).catch((err) => console.error('[Order] updateStatus admin notification failed:', err));
      }
    }

    await this.invalidateDashboardCaches();

    return updatedOrder;
  }

  /**
   * Public entry for cancel/refund paths that bypass updateOrderStatus.
   * Restores stock once if it was deducted for this order.
   */
  async restoreInventoryForOrder(
    orderId: string,
    performedBy: string,
    externalTx?: Prisma.TransactionClient,
  ): Promise<'restored' | 'already_restored' | 'not_deducted'> {
    const run = async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  translations: { where: { locale: 'en' } },
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      return this.restoreInventoryIfDeducted(tx, order, performedBy);
    };

    if (externalTx) {
      return run(externalTx);
    }

    return prisma.$transaction((tx) => run(tx), {
      timeout: 15000,
      maxWait: 5000,
    });
  }

  /**
   * Get orders for the authenticated customer (customer self-service)
   */
  async getMyOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
     const currency = await SettingsService.getCurrency();
    const where: Prisma.OrderWhereInput = { userId };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          warehouse: {
            select: {
              name: true,
              address: true,
              city: true,
              country: true,
            },
          },
          orderItems: {
            include: {
              product: {
                include: {
                  translations: { select: { locale: true, name: true } },
                  attachments:  { where: { type: 'IMAGE' }, orderBy: { createdAt: 'desc' }, take: 1, select: { fileUrl: true } },
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
       orders: orders.map((order) => OrderService.normalizeOrder(order, currency)),
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
