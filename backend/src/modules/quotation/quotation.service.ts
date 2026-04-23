/**
 * Quotation Service
 * Full lifecycle management: Draft → Sent → Approved → Converted
 */

import { prisma } from '@/config/database';
import { BadRequestError, NotFoundError } from '@/common/errors/api.error';
import { QuotationStatus, QuotationActivityType, NotificationType, UserRole, Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import NotificationService from '@/modules/notification/notification.service';
import { QuotationItem } from './quotation.types';

type QuotationListFilters = {
    search?: string;
    status?: QuotationStatus;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: keyof Prisma.QuotationOrderByWithRelationInput;
    sortOrder?: Prisma.SortOrder;
};

type QuotationPagination = {
    skip: number;
    limit: number;
};

type CreateQuotationItemInput = {
    productId: string;
    quantity: number;
    discount?: number;
};

type CreateQuotationInput = {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerAddress?: string;
    companyName?: string;
    items: CreateQuotationItemInput[];
    discount?: number;
    taxRate?: number;
    notes?: string;
    terms?: string;
    userMessage?: string;
    adminReply?: string;
    quotationDate?: string;
    expiryDate: string;
};

type UpdateQuotationInput = Partial<CreateQuotationInput>;

export class QuotationService {

    /**
     * Generate unique quotation number: QT-YYYY-NNNN
     */
    private async generateQuotationNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `QT-${year}-`;

        const last = await prisma.quotation.findFirst({
            where: { quotationNumber: { startsWith: prefix } },
            orderBy: { quotationNumber: 'desc' },
            select: { quotationNumber: true }
        });

        let seq = 1;
        if (last) {
            const parts = last.quotationNumber.split('-');
            seq = parseInt(parts[parts.length - 1], 10) + 1;
        }

        return `${prefix}${String(seq).padStart(4, '0')}`;
    }

    /**
     * Create a new quotation
     */
    async createQuotation(data: CreateQuotationInput, userId: string) {
            const { customerName, customerEmail, customerPhone, customerAddress, companyName,
            items, discount = 0, taxRate = 0, notes, terms, userMessage, adminReply, quotationDate, expiryDate } = data;

        if (!items || items.length === 0) {
            throw new BadRequestError('Quotation must have at least one product.');
        }
        if (!expiryDate) {
            throw new BadRequestError('Expiry date is required.');
        }

        // Validate products and compute per-item totals
            const resolvedItems: QuotationItem[] = [];
        let subtotal = new Prisma.Decimal(0);

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId },
                select: { id: true, price: true, translations: { where: { locale: 'en' }, select: { name: true } } }
            });
            if (!product) throw new NotFoundError(`Product ${item.productId} not found`);

            const productName = product.translations[0]?.name || 'Product';
            const unitPrice = new Prisma.Decimal(product.price);
            const itemDiscount = new Prisma.Decimal(item.discount || 0);
            const qty = item.quantity;
            const lineTotal = unitPrice.mul(qty).sub(itemDiscount);

            resolvedItems.push({
                productId: item.productId,
                productName,
                quantity: qty,
                unitPrice,
                discount: itemDiscount,
                totalPrice: lineTotal
            });

            subtotal = subtotal.add(lineTotal);
        }

        const overallDiscount = new Prisma.Decimal(discount);
        const taxableAmount = subtotal.sub(overallDiscount);
        const tax = taxableAmount.mul(new Prisma.Decimal(taxRate).div(100));
        const total = taxableAmount.add(tax);

        const quotationNumber = await this.generateQuotationNumber();

        const quotation = await prisma.quotation.create({
            data: {
                quotationNumber,
                customerName,
                customerEmail,
                customerPhone,
                customerAddress,
                companyName,
                subtotal,
                discount: overallDiscount,
                tax,
                total,
                notes,
                terms,
                userMessage,
                adminReply,
                status: adminReply ? QuotationStatus.REPLIED : QuotationStatus.DRAFT,
                quotationDate: quotationDate ? new Date(quotationDate) : new Date(),
                expiryDate: new Date(expiryDate),
                createdById: userId,
                items: { create: resolvedItems },
                activities: {
                    create: {
                        action: QuotationActivityType.CREATED,
                        performedBy: userId,
                        note: 'Quotation created'
                    }
                }
            },
            include: { items: true, activities: true, createdBy: { select: { email: true, profile: { select: { fullName: true } } } } }
        });

        // Notify super admin for large quotations (>= 10,000)
        if (total.gte(10000)) {
            await NotificationService.notify({
                type: NotificationType.QUOTATION_CREATED,
                title: 'Large Quotation Created',
                message: `Quotation ${quotationNumber} for ${customerName} totaling $${total.toFixed(2)} has been created.`,
                module: 'QUOTATION',
                roleTarget: UserRole.SUPER_ADMIN,
                relatedId: quotation.id,
                triggeredById: userId
            });
        }

        return quotation;
    }

    /**
     * Get paginated list of quotations
     */
    async getQuotations(filters: QuotationListFilters, pagination: QuotationPagination) {
        const { search, status, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
        const { skip, limit } = pagination;

        const where: Prisma.QuotationWhereInput = {};

        if (search) {
            where.OR = [
                { quotationNumber: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerEmail: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status) where.status = status;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) where.createdAt.lte = new Date(dateTo);
        }

        const [total, quotations] = await Promise.all([
            prisma.quotation.count({ where }),
            prisma.quotation.findMany({
                where,
                include: {
                    createdBy: { select: { email: true, profile: { select: { fullName: true } } } },
                    _count: { select: { items: true } }
                },
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder }
            })
        ]);

        return {
            quotations,
            pagination: {
                total,
                page: Math.floor(skip / limit) + 1,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get single quotation by ID
     */
    async getQuotationById(id: string) {
        const quotation = await prisma.quotation.findUnique({
            where: { id },
            include: {
                items: { include: { product: { include: { translations: true } } } },
                activities: { orderBy: { createdAt: 'desc' } },
                createdBy: { select: { email: true, profile: { select: { fullName: true } } } },
                convertedOrder: { select: { orderNumber: true, id: true } }
            }
        });
        if (!quotation) throw new NotFoundError('Quotation not found');
        return quotation;
    }

    /**
     * Update quotation (only DRAFT or SENT)
     */
    async updateQuotation(id: string, data: UpdateQuotationInput, userId: string) {
        const quotation = await prisma.quotation.findUnique({ where: { id } });
        if (!quotation) throw new NotFoundError('Quotation not found');

        if (!['DRAFT', 'SENT'].includes(quotation.status)) {
            throw new BadRequestError(`Cannot edit a quotation with status: ${quotation.status}`);
        }

        const { items, discount = 0, taxRate = 0, ...rest } = data;

        let updateData: Prisma.QuotationUpdateInput = { ...rest, updatedAt: new Date() };

        if (items && items.length > 0) {
            let subtotal = new Prisma.Decimal(0);
            const resolvedItems: QuotationItem[] = [];

            for (const item of items) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: { id: true, price: true, translations: { where: { locale: 'en' }, select: { name: true } } }
                });
                if (!product) throw new NotFoundError(`Product ${item.productId} not found`);
                const productName = product.translations[0]?.name || 'Product';
                const unitPrice = new Prisma.Decimal(product.price);
                const itemDiscount = new Prisma.Decimal(item.discount || 0);
                const lineTotal = unitPrice.mul(item.quantity).sub(itemDiscount);
                resolvedItems.push({ productId: item.productId, productName, quantity: item.quantity, unitPrice, discount: itemDiscount, totalPrice: lineTotal });
                subtotal = subtotal.add(lineTotal);
            }

            const overallDiscount = new Prisma.Decimal(discount);
            const taxableAmount = subtotal.sub(overallDiscount);
            const tax = taxableAmount.mul(new Prisma.Decimal(taxRate).div(100));
            const total = taxableAmount.add(tax);

            updateData = { ...updateData, subtotal, discount: overallDiscount, tax, total };

            // Delete old items and recreate
            await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
            await prisma.quotationItem.createMany({ data: resolvedItems.map(i => ({ ...i, quotationId: id })) });
        }

        if (rest.expiryDate) updateData.expiryDate = new Date(rest.expiryDate);
        if (rest.quotationDate) updateData.quotationDate = new Date(rest.quotationDate);

        if (typeof rest.adminReply === 'string' && rest.adminReply.trim() && quotation.status !== QuotationStatus.APPROVED && quotation.status !== QuotationStatus.REJECTED && quotation.status !== QuotationStatus.CONVERTED) {
            updateData.status = QuotationStatus.REPLIED;
        }

        const updated = await prisma.quotation.update({
            where: { id },
            data: updateData,
            include: { items: true }
        });

        await prisma.quotationActivity.create({
            data: { quotationId: id, action: QuotationActivityType.EDITED, performedBy: userId, note: 'Quotation updated' }
        });

        return updated;
    }

    /**
     * Delete quotation (Super Admin only, soft via activity log marker)
     */
    async deleteQuotation(id: string, userId: string) {
        const quotation = await prisma.quotation.findUnique({ where: { id } });
        if (!quotation) throw new NotFoundError('Quotation not found');
        if (quotation.status === 'CONVERTED') {
            throw new BadRequestError('Cannot delete a converted quotation.');
        }

        await prisma.quotationActivity.create({
            data: { quotationId: id, action: QuotationActivityType.DELETED, performedBy: userId, note: 'Quotation deleted by Super Admin' }
        });

        await prisma.quotation.delete({ where: { id } });
        return { success: true, message: 'Quotation deleted successfully.' };
    }

    /**
     * Send quotation to customer
     */
    async sendQuotation(id: string, userId: string, adminReply?: string) {
        const quotation = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
        if (!quotation) throw new NotFoundError('Quotation not found');

        if (!['DRAFT', 'SENT', 'PENDING', 'VIEWED'].includes(quotation.status)) {
            throw new BadRequestError(`Cannot send a quotation with status: ${quotation.status}`);
        }

        const normalizedReply = adminReply?.trim() || quotation.adminReply || null;

        const updated = await prisma.quotation.update({
            where: { id },
            data: {
                status: normalizedReply ? QuotationStatus.REPLIED : QuotationStatus.SENT,
                adminReply: normalizedReply,
            }
        });

        await prisma.quotationActivity.create({
            data: {
                quotationId: id,
                action: QuotationActivityType.SENT,
                performedBy: userId,
                note: normalizedReply ? `In-app reply posted for ${quotation.customerEmail}` : `Sent in-app to ${quotation.customerEmail}`,
            }
        });

        return updated;
    }

    /**
     * Approve quotation
     */
    async approveQuotation(id: string, userId: string) {
        const quotation = await prisma.quotation.findUnique({ where: { id } });
        if (!quotation) throw new NotFoundError('Quotation not found');
        if (quotation.status !== 'SENT' && quotation.status !== 'VIEWED') {
            throw new BadRequestError('Only Sent or Viewed quotations can be approved.');
        }

        const updated = await prisma.quotation.update({
            where: { id },
            data: { status: QuotationStatus.APPROVED }
        });

        await prisma.quotationActivity.create({
            data: { quotationId: id, action: QuotationActivityType.APPROVED, performedBy: userId }
        });

        await NotificationService.notify({
            type: NotificationType.QUOTATION_APPROVED,
            title: 'Quotation Approved',
            message: `Quotation ${quotation.quotationNumber} from ${quotation.customerName} has been approved.`,
            module: 'QUOTATION',
            roleTarget: UserRole.SUPER_ADMIN,
            relatedId: id,
            triggeredById: userId
        });

        return updated;
    }

    /**
     * Reject quotation
     */
    async rejectQuotation(id: string, reason: string, userId: string) {
        const quotation = await prisma.quotation.findUnique({ where: { id } });
        if (!quotation) throw new NotFoundError('Quotation not found');
        if (!['SENT', 'VIEWED', 'APPROVED'].includes(quotation.status)) {
            throw new BadRequestError('Quotation cannot be rejected in its current state.');
        }

        const updated = await prisma.quotation.update({
            where: { id },
            data: { status: QuotationStatus.REJECTED }
        });

        await prisma.quotationActivity.create({
            data: { quotationId: id, action: QuotationActivityType.REJECTED, performedBy: userId, note: reason || 'Rejected by Super Admin' }
        });

        return updated;
    }

    /**
     * Convert approved quotation to order (atomic transaction)
     */
    async convertToOrder(id: string, userId: string) {
        const quotation = await prisma.quotation.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!quotation) throw new NotFoundError('Quotation not found');
        if (quotation.status !== 'APPROVED') {
            throw new BadRequestError('Only Approved quotations can be converted to orders.');
        }
        if (quotation.convertedOrderId) {
            throw new BadRequestError('This quotation has already been converted to an order.');
        }

        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    userId,
                    customerName: quotation.customerName,
                    phoneNumber: quotation.customerPhone,
                    shippingAddress: quotation.customerAddress,
                    subtotal: quotation.subtotal,
                    tax: quotation.tax,
                    total: quotation.total,
                    notes: `Converted from Quotation ${quotation.quotationNumber}. ${quotation.notes || ''}`.trim(),
                    status: OrderStatus.CONFIRMED,
                    paymentStatus: PaymentStatus.UNPAID,
                    paymentMethod: 'CASH',
                    orderItems: {
                        create: quotation.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice
                        }))
                    }
                }
            });

            await tx.quotation.update({
                where: { id },
                data: { status: QuotationStatus.CONVERTED, convertedOrderId: newOrder.id }
            });

            return newOrder;
        });

        await prisma.quotationActivity.create({
            data: { quotationId: id, action: QuotationActivityType.CONVERTED, performedBy: userId, note: `Converted to Order ${orderNumber}` }
        });

        return { quotation: { ...quotation, status: 'CONVERTED', convertedOrderId: order.id }, order };
    }

    /**
     * Reactivate an expired quotation (Super Admin)
     */
    async reactivateExpired(id: string, newExpiryDate: string, userId: string) {
        const quotation = await prisma.quotation.findUnique({ where: { id } });
        if (!quotation) throw new NotFoundError('Quotation not found');
        if (quotation.status !== 'EXPIRED') {
            throw new BadRequestError('Only expired quotations can be reactivated.');
        }
        if (!newExpiryDate) throw new BadRequestError('New expiry date is required.');

        const updated = await prisma.quotation.update({
            where: { id },
            data: { status: QuotationStatus.DRAFT, expiryDate: new Date(newExpiryDate) }
        });

        await prisma.quotationActivity.create({
            data: { quotationId: id, action: QuotationActivityType.REACTIVATED, performedBy: userId, note: `Reactivated with new expiry: ${newExpiryDate}` }
        });

        return updated;
    }

    /**
     * Batch expire stale quotations (for cron job)
     */
    async expireStaleQuotations() {
        const now = new Date();
        const stale = await prisma.quotation.findMany({
            where: {
                status: { in: [QuotationStatus.DRAFT, QuotationStatus.SENT, QuotationStatus.VIEWED] },
                expiryDate: { lt: now }
            },
            select: { id: true, quotationNumber: true, customerName: true }
        });

        for (const q of stale) {
            await prisma.quotation.update({ where: { id: q.id }, data: { status: QuotationStatus.EXPIRED } });
            await prisma.quotationActivity.create({
                data: { quotationId: q.id, action: QuotationActivityType.EXPIRED, performedBy: 'SYSTEM', note: 'Automatically expired by system' }
            });
            await NotificationService.notify({
                type: NotificationType.QUOTATION_EXPIRED,
                title: 'Quotation Expired',
                message: `Quotation ${q.quotationNumber} for ${q.customerName} has expired.`,
                module: 'QUOTATION',
                roleTarget: UserRole.SUPER_ADMIN,
                relatedId: q.id,
                force: true
            });
        }

        return { expired: stale.length };
    }

    /**
     * Analytics & Reporting
     */
    async getAnalytics() {
        const [total, draft, sent, viewed, approved, rejected, converted, expired] = await Promise.all([
            prisma.quotation.count(),
            prisma.quotation.count({ where: { status: 'DRAFT' } }),
            prisma.quotation.count({ where: { status: 'SENT' } }),
            prisma.quotation.count({ where: { status: 'VIEWED' } }),
            prisma.quotation.count({ where: { status: 'APPROVED' } }),
            prisma.quotation.count({ where: { status: 'REJECTED' } }),
            prisma.quotation.count({ where: { status: 'CONVERTED' } }),
            prisma.quotation.count({ where: { status: 'EXPIRED' } }),
        ]);

        const revenueResult = await prisma.quotation.aggregate({
            where: { status: 'CONVERTED' },
            _sum: { total: true }
        });
        const revenue = Number(revenueResult._sum.total || 0);
        const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';

        // Monthly breakdown (last 6 months)
        const months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            return {
                label: d.toLocaleString('default', { month: 'short' }),
                year: d.getFullYear(),
                start: new Date(d.getFullYear(), d.getMonth(), 1),
                end: new Date(d.getFullYear(), d.getMonth() + 1, 0)
            };
        }).reverse();

        const monthly = await Promise.all(months.map(async m => {
            const [count, rev] = await Promise.all([
                prisma.quotation.count({ where: { createdAt: { gte: m.start, lte: m.end } } }),
                prisma.quotation.aggregate({ where: { status: 'CONVERTED', createdAt: { gte: m.start, lte: m.end } }, _sum: { total: true } })
            ]);
            return { month: m.label, quotations: count, revenue: Number(rev._sum.total || 0) };
        }));

        return { total, draft, sent, viewed, approved, rejected, converted, expired, revenue, conversionRate, monthly };
    }

    /**
     * Get quotations for a customer by their email (for frontend)
     */
    async getMyQuotations(customerEmail: string, pagination: QuotationPagination, filters?: { status?: QuotationStatus }) {
        const { skip, limit } = pagination;

        const where: Prisma.QuotationWhereInput = {
            customerEmail: customerEmail.toLowerCase()
        };

        if (filters?.status) {
            where.status = filters.status;
        }

        const [total, quotations] = await Promise.all([
            prisma.quotation.count({ where }),
            prisma.quotation.findMany({
                where,
                include: {
                    items: {
                        select: {
                            id: true,
                            productName: true,
                            quantity: true,
                            unitPrice: true,
                            totalPrice: true
                        }
                    },
                    _count: { select: { items: true } }
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return {
            data: quotations,
            pagination: {
                total,
                page: Math.floor(skip / limit) + 1,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

export const quotationService = new QuotationService();
