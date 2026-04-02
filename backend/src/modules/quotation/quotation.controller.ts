/**
 * Quotation Controller
 */

import { Request, Response } from 'express';
import { Prisma, QuotationStatus } from '@prisma/client';
import { quotationService } from './quotation.service';
import { asyncHandler } from '@/common/middleware/error.middleware';
import { AuthRequest } from '@/types/global';

export class QuotationController {

    /**
     * @swagger
     * /api/quotations:
     *   get:
     *     summary: List all quotations with filters and pagination (Super Admin)
     *     tags: [Quotations]
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
     *         name: dateFrom
     *         schema: { type: string, format: date }
     *       - in: query
     *         name: dateTo
     *         schema: { type: string, format: date }
     *     responses:
     *       200:
     *         description: Paginated quotation list
     */
    getAll = asyncHandler(async (req: Request, res: Response) => {
        const asString = (value: unknown): string | undefined => {
            if (typeof value === 'string') return value;
            if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
            return undefined;
        };

        const { page = 1, limit = 10, search, status, dateFrom, dateTo, sortBy, sortOrder } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const normalizedStatusRaw = asString(status);
        const normalizedStatus = normalizedStatusRaw && Object.values(QuotationStatus).includes(normalizedStatusRaw as QuotationStatus)
            ? (normalizedStatusRaw as QuotationStatus)
            : undefined;

        const normalizedSortBy = asString(sortBy) as keyof Prisma.QuotationOrderByWithRelationInput | undefined;
        const normalizedSortOrderRaw = asString(sortOrder);
        const normalizedSortOrder = normalizedSortOrderRaw === 'asc' || normalizedSortOrderRaw === 'desc'
            ? normalizedSortOrderRaw
            : undefined;

        const result = await quotationService.getQuotations(
            {
                search: asString(search),
                status: normalizedStatus,
                dateFrom: asString(dateFrom),
                dateTo: asString(dateTo),
                sortBy: normalizedSortBy,
                sortOrder: normalizedSortOrder,
            },
            { skip, limit: Number(limit) }
        );
        res.json({ success: true, data: result });
    });

    /**
     * @swagger
     * /api/quotations:
     *   post:
     *     summary: Create a new quotation (Super Admin)
     *     tags: [Quotations]
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
     *               expiryDate: { type: string, format: date }
     *               notes: { type: string }
     *               items:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     productId: { type: string }
     *                     quantity: { type: integer }
     *                     unitPrice: { type: number }
     *     responses:
     *       201:
     *         description: Quotation created
     */
    create = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const quotation = await quotationService.createQuotation(req.body, userId);
        res.status(201).json({ success: true, data: quotation });
    });

    /**
     * @swagger
     * /api/quotations/{id}:
     *   get:
     *     summary: Get single quotation by ID (Super Admin)
     *     tags: [Quotations]
     *     security: [{ bearerAuth: [] }]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200:
     *         description: Quotation details
     *       404:
     *         description: Not found
     */
    getById = asyncHandler(async (req: Request, res: Response) => {
        const quotation = await quotationService.getQuotationById(req.params.id as string);
        res.json({ success: true, data: quotation });
    });

    /**
     * @swagger
     * /api/quotations/{id}:
     *   put:
     *     summary: Update a quotation (Super Admin)
     *     tags: [Quotations]
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
     *     responses:
     *       200:
     *         description: Quotation updated
     */
    update = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const quotation = await quotationService.updateQuotation(req.params.id as string, req.body, userId);
        res.json({ success: true, data: quotation });
    });

    /**
     * @swagger
     * /api/quotations/{id}:
     *   delete:
     *     summary: Delete a quotation (Super Admin)
     *     tags: [Quotations]
     *     security: [{ bearerAuth: [] }]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200:
     *         description: Quotation deleted
     */
    delete = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const result = await quotationService.deleteQuotation(req.params.id as string, userId);
        res.json({ success: true, data: result });
    });

    /**
     * @swagger
     * /api/quotations/{id}/send:
     *   post:
     *     summary: Send quotation to customer
     *     tags: [Quotations]
     *     security: [{ bearerAuth: [] }]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200:
     *         description: Quotation sent
     */
    send = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const quotation = await quotationService.sendQuotation(req.params.id as string, userId);
        res.json({ success: true, data: quotation, message: 'Quotation sent successfully.' });
    });

    /**
     * @swagger
     * /api/quotations/{id}/approve:
     *   post:
     *     summary: Approve a quotation
     *     tags: [Quotations]
     *     security: [{ bearerAuth: [] }]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       200:
     *         description: Quotation approved
     */
    approve = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const quotation = await quotationService.approveQuotation(req.params.id as string, userId);
        res.json({ success: true, data: quotation, message: 'Quotation approved.' });
    });

    /**
     * @swagger
     * /api/quotations/{id}/reject:
     *   post:
     *     summary: Reject a quotation with a reason
     *     tags: [Quotations]
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
     *             required: [reason]
     *             properties:
     *               reason: { type: string }
     *     responses:
     *       200:
     *         description: Quotation rejected
     */
    reject = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const { reason } = req.body;
        const quotation = await quotationService.rejectQuotation(req.params.id as string, reason, userId);
        res.json({ success: true, data: quotation, message: 'Quotation rejected.' });
    });

    /**
     * @swagger
     * /api/quotations/{id}/convert:
     *   post:
     *     summary: Convert an approved quotation to an order
     *     tags: [Quotations]
     *     security: [{ bearerAuth: [] }]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema: { type: string }
     *     responses:
     *       201:
     *         description: Quotation converted to order
     */
    convertToOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const result = await quotationService.convertToOrder(req.params.id as string, userId);
        res.status(201).json({ success: true, data: result, message: 'Quotation converted to order successfully.' });
    });

    /**
     * @swagger
     * /api/quotations/{id}/reactivate:
     *   post:
     *     summary: Reactivate an expired quotation
     *     tags: [Quotations]
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
     *               expiryDate: { type: string, format: date }
     *     responses:
     *       200:
     *         description: Quotation reactivated
     */
    reactivate = asyncHandler(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.id;
        const { expiryDate } = req.body;
        const quotation = await quotationService.reactivateExpired(req.params.id as string, expiryDate, userId);
        res.json({ success: true, data: quotation, message: 'Quotation reactivated successfully.' });
    });

    /**
     * @swagger
     * /api/quotations/analytics:
     *   get:
     *     summary: Get quotation analytics and conversion stats (Super Admin)
     *     tags: [Quotations]
     *     security: [{ bearerAuth: [] }]
     *     responses:
     *       200:
     *         description: Quotation analytics
     */
    getAnalytics = asyncHandler(async (_req: Request, res: Response) => {
        const analytics = await quotationService.getAnalytics();
        res.json({ success: true, data: analytics });
    });

    /**
     * @swagger
     * /api/quotations/expire-stale:
     *   post:
     *     summary: Expire all stale/overdue quotations (cron trigger)
     *     tags: [Quotations]
     *     security: [{ bearerAuth: [] }]
     *     responses:
     *       200:
     *         description: Stale quotations expired
     */
    expireStale = asyncHandler(async (_req: Request, res: Response) => {
        const result = await quotationService.expireStaleQuotations();
        res.json({ success: true, data: result, message: `${result.expired} quotations expired.` });
    });
}

export const quotationController = new QuotationController();
