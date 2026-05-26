/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Customer Quotation Controller
 * Self-service, instant quotation generation by authenticated customers.
 * No admin approval required.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/global';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/api.error';
import { Prisma } from '@prisma/client';
import { QuotationStatus, QuotationActivityType, NotificationType, UserRole } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { customerQuotationRepository } from './customer-quotation.repository';
import NotificationService from '../notification/notification.service';
import { CustomerQuotationBasketService } from '../customer-quotation-basket/customer-quotation-basket.service';

type RequestedQuotationItem = {
  productId: string;
  quantity: number;
};

type ResolvedQuotationItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateQuotationNumber(): string {
  const year = new Date().getFullYear();
  const seq  = Math.floor(Math.random() * 90000) + 10000;
  return `CQ-${year}-${seq}`;
}

function validateVAT(vat: string): boolean {
  // Saudi VAT: 15 digits
  return /^\d{10,20}$/.test(vat.replace(/\s|-/g, ''));
}

// ── Controller ────────────────────────────────────────────────────────────────

export class CustomerQuotationController {
  private static getRequestOrigin(req: AuthRequest): string {
    const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
    const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
    const isProduction = process.env.NODE_ENV === 'production';
    const protocol = isProduction ? 'https' : (forwardedProto || req.protocol);
    const host = forwardedHost || req.get('host');

    return host ? `${protocol}://${host}` : '';
  }

  private static resolvePublicImageUrl(req: AuthRequest, imagePath?: string | null): string | null {
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
      const origin = this.getRequestOrigin(req);
      return origin ? `${origin}${pathPart}` : pathPart;
    }

    return imagePath;
  }

  /**
   * @swagger
   * /api/customer-quotations/generate:
   *   post:
   *     summary: Instantly generate a quotation from selected products
   *     tags: [Customer Quotations]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
  *             required: [companyName, vatNumber]
   *             properties:
   *               companyName: { type: string }
   *               vatNumber: { type: string, description: 10-20 digit Saudi VAT number }
  *               address: { type: string, description: Preferred shipping/location address }
  *               notes: { type: string, description: Legacy mobile fallback for address/notes }
   *               products:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     productId: { type: string }
   *                     quantity: { type: integer, minimum: 1 }
  *               items:
  *                 type: array
  *                 description: Legacy mobile alias for products
  *                 items:
  *                   type: object
  *                   properties:
  *                     productId: { type: string }
  *                     quantity: { type: integer, minimum: 1 }
   *     responses:
   *       201:
   *         description: Quotation generated successfully
   *       400:
   *         description: Validation error
   */
  static async generate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const lang   = req.user!.preferredLanguage || req.locale || 'en';

      const { companyName, vatNumber, address, products, items, notes } = req.body;
      
      // Try to load from request body first, then from DB basket
      let requestedItems =
        Array.isArray(products) && products.length > 0
          ? products
          : (Array.isArray(items) && items.length > 0 ? items : null);

      // If no items in request body, try to fetch from database basket
      if (!requestedItems || requestedItems.length === 0) {
        try {
          requestedItems = await CustomerQuotationBasketService.getBasketItemsForQuotation(userId);
        } catch (err) {
          throw new BadRequestError('No products provided and quotation basket is empty');
        }
      }

      const normalizedAddress =
        typeof address === 'string' && address.trim()
          ? address.trim()
          : (typeof notes === 'string' ? notes.trim() : '');

      // ── Validate inputs ────────────────────────────────────────────────────

      if (!companyName?.trim()) throw new BadRequestError('Company name is required');
      if (!vatNumber?.trim())   throw new BadRequestError('VAT number is required');
      if (!validateVAT(vatNumber)) throw new BadRequestError('VAT number format is invalid (10–20 digits)');
      if (!normalizedAddress)   throw new BadRequestError('Address is required');
      if (!Array.isArray(requestedItems) || requestedItems.length === 0)
        throw new BadRequestError('At least one product is required');

      // ── Fetch real prices & validate products ──────────────────────────────

      let subtotal = new Prisma.Decimal(0);
      const resolvedItems: ResolvedQuotationItem[] = [];

      for (const item of requestedItems as RequestedQuotationItem[]) {
        const qty = Number(item.quantity) || 1;
        if (qty < 1) throw new BadRequestError('Quantity must be at least 1');

        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            translations: true,
          },
        });
        if (!product) throw new NotFoundError(`Product not found: ${item.productId}`);
        if (!product.isActive) throw new BadRequestError(`Product is no longer available: ${item.productId}`);

        const translation =
          product.translations.find((t) => t.locale === lang) ||
          product.translations.find((t) => t.locale === 'en') ||
          product.translations[0];

        const productName = translation?.name || 'Product';
        const unitPrice   = new Prisma.Decimal(product.price);
        const lineTotal   = unitPrice.mul(qty);

        resolvedItems.push({
          productId:   product.id,
          productName,
          quantity:    qty,
          unitPrice,
          discount:    new Prisma.Decimal(0),
          totalPrice:  lineTotal,
        });

        subtotal = subtotal.add(lineTotal);
      }

      const SHIPPING = new Prisma.Decimal(0); // free shipping; adjust as needed
      const total    = subtotal.add(SHIPPING);

      // ── Unique quotation number ─────────────────────────────────────────────

      let quotationNumber = generateQuotationNumber();
      // Ensure uniqueness
      for (let i = 0; i < 5; i++) {
        const exists = await prisma.quotation.findFirst({ where: { quotationNumber } });
        if (!exists) break;
        quotationNumber = generateQuotationNumber();
      }

      // Expiry: 30 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // ── Persist ────────────────────────────────────────────────────────────

      const sanitizedNotes = typeof notes === 'string' ? notes.trim() : '';

      const quotation = await prisma.quotation.create({
        data: {
          quotationNumber,
          status: QuotationStatus.PENDING,
          customerName:    req.user!.email,
          customerEmail:   req.user!.email,
          companyName:     companyName.trim(),
          customerAddress: normalizedAddress,
          userMessage:     sanitizedNotes || null,
          subtotal,
          discount:        new Prisma.Decimal(0),
          tax:             new Prisma.Decimal(0),
          total,
          quotationDate:   new Date(),
          expiryDate,
          createdById:     userId,
          notes:           sanitizedNotes
            ? `VAT: ${vatNumber.trim()} | Note: ${sanitizedNotes}`
            : `VAT: ${vatNumber.trim()}`,
          items: { create: resolvedItems },
          activities: {
            create: {
              action:      QuotationActivityType.CREATED,
              performedBy: userId,
              note:        'Customer self-generated quotation',
            },
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  attachments: { where: { type: 'IMAGE' }, orderBy: { createdAt: 'desc' }, take: 1 },
                },
              },
            },
          },
        },
      });

      // ── Clear quotation basket after successful generation ──────────────────
      try {
        await CustomerQuotationBasketService.clearBasket(userId);
      } catch (err) {
        // Silently ignore basket clearing errors - quotation was created successfully
        console.warn('[CustomerQuotation] Failed to clear basket after generation:', err);
      }

      // Notify admins so customer self-service quotations are visible operationally.
      void NotificationService.notify({
        type: NotificationType.QUOTATION_CREATED,
        title: 'New Customer Quotation',
        message: `Customer ${req.user!.email} generated quotation ${quotation.quotationNumber}.`,
        module: 'QUOTATION',
        roleTarget: UserRole.ADMIN,
        relatedId: quotation.id,
        triggeredById: userId,
      }).catch((err) => console.error('[CustomerQuotation] admin notification failed:', err));

      void NotificationService.notify({
        type: NotificationType.QUOTATION_CREATED,
        title: 'New Customer Quotation',
        message: `Customer ${req.user!.email} generated quotation ${quotation.quotationNumber}.`,
        module: 'QUOTATION',
        roleTarget: UserRole.SUPER_ADMIN,
        relatedId: quotation.id,
        triggeredById: userId,
      }).catch((err) => console.error('[CustomerQuotation] super-admin notification failed:', err));

      // Enrich items with thumbnail
      const enrichedItems = quotation.items.map((item) => ({
        ...item,
        thumbnail: CustomerQuotationController.resolvePublicImageUrl(
          req,
          item.product.mainImage || item.product.attachments?.[0]?.fileUrl || null
        ),
      }));

      res.status(201).json({
        success: true,
        data: {
          ...quotation,
          vatNumber: vatNumber.trim(),
          shipping:  Number(SHIPPING),
          items:     enrichedItems,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/customer-quotations/{id}:
   *   get:
   *     summary: Get a customer quotation by ID (owner only)
   *     tags: [Customer Quotations]
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
  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id     = req.params.id as string;

      const quotation = await customerQuotationRepository.findByIdWithItems(id);

      if (!quotation) throw new NotFoundError('Quotation not found');
      if (quotation.createdById !== userId) throw new NotFoundError('Quotation not found');

      const lang = req.user!.preferredLanguage || req.locale || 'en';
      const enrichedItems = quotation.items.map((item) => {
        const translation =
          item.product.translations.find((t) => t.locale === lang) ||
          item.product.translations.find((t) => t.locale === 'en') ||
          item.product.translations[0];
        return {
          ...item,
          productName: translation?.name || item.productName,
          thumbnail: CustomerQuotationController.resolvePublicImageUrl(
            req,
            item.product.mainImage || item.product.attachments?.[0]?.fileUrl || null
          ),
        };
      });

      // Extract vatNumber from notes
      const vatNumber = quotation.notes?.replace('VAT: ', '') || '';

      res.json({
        success: true,
        data: {
          ...quotation,
          vatNumber,
          shipping: 0,
          items: enrichedItems,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/customer-quotations/{id}/pdf:
   *   get:
   *     summary: Download quotation as PDF (owner only)
   *     tags: [Customer Quotations]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: PDF file stream
   *         content:
   *           application/pdf:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Not found
   */
  static async downloadPDF(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id     = req.params.id as string;

      const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
      });

      if (!quotation) throw new NotFoundError('Quotation not found');
      if (quotation.createdById !== userId) throw new NotFoundError('Quotation not found');

      const vatNumber = quotation.notes?.replace('VAT: ', '') || '';

      // ── Build PDF ──────────────────────────────────────────────────────────

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `quotation-${quotation.quotationNumber}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      doc.pipe(res);

      const PAGE_WIDTH = doc.page.width;
      const MARGIN     = 50;
      const COL_WIDTH  = PAGE_WIDTH - MARGIN * 2;
      const LEFT_META_WIDTH = 260;
      const PRODUCT_NAME_WIDTH = COL_WIDTH * 0.52;

      // ── Header ─────────────────────────────────────────────────────────────

      doc.fillColor('#0D1637').rect(0, 0, PAGE_WIDTH, 90).fill();
      doc
        .fillColor('#FFFFFF')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('SHIELDER', MARGIN, 28)
        .fontSize(10)
        .font('Helvetica')
        .text('Industrial Filters Digital Platform', MARGIN, 56);

      doc
        .fillColor('#F97316')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('QUOTATION', PAGE_WIDTH - MARGIN - 120, 32, { width: 120, align: 'right' });

      doc.moveDown(4);

      // ── Quotation meta ─────────────────────────────────────────────────────

      const topY = 108;
      doc.fillColor('#374151').font('Helvetica').fontSize(9);

      // Left: company info
      doc
        .font('Helvetica-Bold').fillColor('#0D1637').fontSize(11)
        .text(quotation.companyName || '', MARGIN, topY, { width: LEFT_META_WIDTH, ellipsis: true, lineBreak: false });

      doc
        .font('Helvetica').fillColor('#6B7280').fontSize(9)
        .text(`VAT: ${vatNumber}`, MARGIN, topY + 16, { width: LEFT_META_WIDTH, ellipsis: true, lineBreak: false });

      doc
        .text(quotation.customerAddress || '', MARGIN, topY + 28, { width: LEFT_META_WIDTH, ellipsis: true, lineBreak: false });

      doc
        .text(quotation.customerEmail, MARGIN, topY + 40, { width: LEFT_META_WIDTH, ellipsis: true, lineBreak: false });

      // Right: quotation details
      doc
        .font('Helvetica-Bold').fillColor('#0D1637').fontSize(9)
        .text('Quotation No:', PAGE_WIDTH - MARGIN - 200, topY, { width: 200, align: 'right' })
        .font('Helvetica').fillColor('#374151')
        .text(quotation.quotationNumber, PAGE_WIDTH - MARGIN - 200, topY + 12, { width: 200, align: 'right' })
        .font('Helvetica-Bold').fillColor('#0D1637')
        .text('Date:', PAGE_WIDTH - MARGIN - 200, topY + 28, { width: 200, align: 'right' })
        .font('Helvetica').fillColor('#374151')
        .text(new Date(quotation.quotationDate).toLocaleDateString('en-GB'), PAGE_WIDTH - MARGIN - 200, topY + 40, { width: 200, align: 'right' });

      doc
        .font('Helvetica-Bold').fillColor('#0D1637').fontSize(9)
        .text('Valid Until:', PAGE_WIDTH - MARGIN - 200, topY + 56, { width: 200, align: 'right' })
        .font('Helvetica').fillColor('#374151')
        .text(new Date(quotation.expiryDate).toLocaleDateString('en-GB'), PAGE_WIDTH - MARGIN - 200, topY + 68, { width: 200, align: 'right' });

      // ── Divider ────────────────────────────────────────────────────────────

      const divY = topY + 86;
      doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(MARGIN, divY).lineTo(PAGE_WIDTH - MARGIN, divY).stroke();

      // ── Table header ───────────────────────────────────────────────────────

      const tableTop  = divY + 16;
      const colName   = MARGIN;
      const colQty    = MARGIN + COL_WIDTH * 0.55;
      const colPrice  = MARGIN + COL_WIDTH * 0.70;
      const colTotal  = MARGIN + COL_WIDTH * 0.84;

      doc
        .fillColor('#F3F4F6')
        .rect(MARGIN, tableTop, COL_WIDTH, 22)
        .fill();

      doc
        .fillColor('#374151')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('PRODUCT', colName + 4, tableTop + 6)
        .text('QTY', colQty, tableTop + 6, { width: 60, align: 'center' })
        .text('UNIT PRICE', colPrice, tableTop + 6, { width: 70, align: 'right' })
        .text('TOTAL', colTotal, tableTop + 6, { width: 70, align: 'right' });

      // ── Table rows ─────────────────────────────────────────────────────────

      let rowY = tableTop + 28;
      const rowHeight = 24; // Reduced from 28 for better page fit
      for (const item of quotation.items) {
        doc
          .fillColor('#F9FAFB')
          .rect(MARGIN, rowY - 4, COL_WIDTH, rowHeight)
          .fill();

        doc
          .strokeColor('#F3F4F6').lineWidth(0.5)
          .moveTo(MARGIN, rowY + rowHeight - 4)
          .lineTo(PAGE_WIDTH - MARGIN, rowY + rowHeight - 4)
          .stroke();

        doc
          .fillColor('#111827')
          .font('Helvetica-Bold')
          .fontSize(9)
          .text(item.productName, colName + 4, rowY + 4, { width: PRODUCT_NAME_WIDTH, ellipsis: true, lineBreak: false });

        doc
          .fillColor('#374151')
          .font('Helvetica')
          .fontSize(9)
          .text(String(item.quantity), colQty, rowY + 4, { width: 60, align: 'center' })
          .text(`SAR ${Number(item.unitPrice).toFixed(2)}`, colPrice, rowY + 4, { width: 70, align: 'right' })
          .text(`SAR ${Number(item.totalPrice).toFixed(2)}`, colTotal, rowY + 4, { width: 70, align: 'right' });

        rowY += rowHeight;
      }

      // ── Totals ─────────────────────────────────────────────────────────────

      const USABLE_HEIGHT = doc.page.height - MARGIN * 2; // Usable area with margins
      const FOOTER_SPACE = 50; // Space reserved for footer
      const TOTALS_BOX_HEIGHT = 75; // Reduced from 90
      const totalsTop = rowY + 16;

      // Check if totals box would overflow; if so, adjust spacing
      const maxContentY = USABLE_HEIGHT - FOOTER_SPACE;
      const totalsBoxEnd = totalsTop + TOTALS_BOX_HEIGHT;

      if (totalsBoxEnd > maxContentY) {
        // Reduce spacing before totals if needed to keep on page
        const adjustedTotalsTop = Math.max(rowY + 10, maxContentY - TOTALS_BOX_HEIGHT);
        // Draw totals box
        doc
          .fillColor('#F9FAFB')
          .rect(PAGE_WIDTH - MARGIN - 220, adjustedTotalsTop, 220, TOTALS_BOX_HEIGHT)
          .fill();

        const tL = PAGE_WIDTH - MARGIN - 215;
        const tR = PAGE_WIDTH - MARGIN - 5;

        const totRow = (label: string, value: string, bold = false, y = 0) => {
          doc
            .fillColor('#374151')
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(bold ? 10 : 9)
            .text(label, tL, adjustedTotalsTop + y)
            .text(value, tL, adjustedTotalsTop + y, { width: 210, align: 'right' });
        };

        totRow('Subtotal:', `SAR ${Number(quotation.subtotal).toFixed(2)}`, false, 8);
        totRow('Shipping:', 'Free', false, 24);
        doc.strokeColor('#E5E7EB').lineWidth(0.5)
          .moveTo(tL, adjustedTotalsTop + 44).lineTo(tR, adjustedTotalsTop + 44).stroke();
        totRow('TOTAL:', `SAR ${Number(quotation.total).toFixed(2)}`, true, 54);
      } else {
        // Normal layout - totals fit on page
        doc
          .fillColor('#F9FAFB')
          .rect(PAGE_WIDTH - MARGIN - 220, totalsTop, 220, TOTALS_BOX_HEIGHT)
          .fill();

        const tL = PAGE_WIDTH - MARGIN - 215;
        const tR = PAGE_WIDTH - MARGIN - 5;

        const totRow = (label: string, value: string, bold = false, y = 0) => {
          doc
            .fillColor('#374151')
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(bold ? 10 : 9)
            .text(label, tL, totalsTop + y)
            .text(value, tL, totalsTop + y, { width: 210, align: 'right' });
        };

        totRow('Subtotal:', `SAR ${Number(quotation.subtotal).toFixed(2)}`, false, 8);
        totRow('Shipping:', 'Free', false, 24);
        doc.strokeColor('#E5E7EB').lineWidth(0.5)
          .moveTo(tL, totalsTop + 44).lineTo(tR, totalsTop + 44).stroke();
        totRow('TOTAL:', `SAR ${Number(quotation.total).toFixed(2)}`, true, 54);
      }

      // ── Footer ─────────────────────────────────────────────────────────────

      // Position footer at reserved space from bottom, with minimum position to avoid overlap
      const footerY = Math.min(USABLE_HEIGHT - 40, doc.page.height - 65);
      doc
        .strokeColor('#E5E7EB').lineWidth(1)
        .moveTo(MARGIN, footerY).lineTo(PAGE_WIDTH - MARGIN, footerY).stroke();

      doc
        .fillColor('#9CA3AF').font('Helvetica').fontSize(8)
        .text('This quotation is valid for 30 days from the date of issue.', MARGIN, footerY + 8)
        .text('Shielder Industrial Filters | Saudi Arabia', MARGIN, footerY + 20)
        .text(`Generated: ${new Date().toLocaleString()}`, PAGE_WIDTH - MARGIN - 200, footerY + 20, { width: 200, align: 'right' });

      doc.end();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer accepts their quotation.
   * Allowed from SENT or VIEWED states.
   */
  static async accept(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;

      const quotation = await prisma.quotation.findUnique({ where: { id } });
      if (!quotation || quotation.createdById !== userId) {
        throw new NotFoundError('Quotation not found');
      }

      if (quotation.status !== QuotationStatus.SENT && quotation.status !== QuotationStatus.VIEWED) {
        throw new BadRequestError('Quotation cannot be accepted in its current status');
      }

      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.APPROVED,
          activities: {
            create: {
              action: QuotationActivityType.APPROVED,
              performedBy: userId,
              note: 'Customer accepted quotation',
            },
          },
        },
      });

      void NotificationService.notify({
        type: NotificationType.QUOTATION_APPROVED,
        title: 'Customer Accepted Quotation',
        message: `Customer ${req.user!.email} accepted quotation ${quotation.quotationNumber}.`,
        module: 'QUOTATION',
        roleTarget: UserRole.ADMIN,
        relatedId: updated.id,
        triggeredById: userId,
      }).catch((err) => console.error('[CustomerQuotation] admin accept notification failed:', err));

      void NotificationService.notify({
        type: NotificationType.QUOTATION_APPROVED,
        title: 'Customer Accepted Quotation',
        message: `Customer ${req.user!.email} accepted quotation ${quotation.quotationNumber}.`,
        module: 'QUOTATION',
        roleTarget: UserRole.SUPER_ADMIN,
        relatedId: updated.id,
        triggeredById: userId,
      }).catch((err) => console.error('[CustomerQuotation] super-admin accept notification failed:', err));

      res.json({
        success: true,
        data: updated,
        message: 'Quotation accepted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Customer rejects their quotation.
   * Allowed from SENT or VIEWED states.
   */
  static async reject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

      const quotation = await prisma.quotation.findUnique({ where: { id } });
      if (!quotation || quotation.createdById !== userId) {
        throw new NotFoundError('Quotation not found');
      }

      if (quotation.status !== QuotationStatus.SENT && quotation.status !== QuotationStatus.VIEWED) {
        throw new BadRequestError('Quotation cannot be rejected in its current status');
      }

      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.REJECTED,
          activities: {
            create: {
              action: QuotationActivityType.REJECTED,
              performedBy: userId,
              note: reason || 'Customer rejected quotation',
            },
          },
        },
      });

      const rejectReason = reason ? ` Reason: ${reason}` : '';

      void NotificationService.notify({
        type: NotificationType.SYSTEM_ALERT,
        title: 'Customer Rejected Quotation',
        message: `Customer ${req.user!.email} rejected quotation ${quotation.quotationNumber}.${rejectReason}`,
        module: 'QUOTATION',
        roleTarget: UserRole.ADMIN,
        relatedId: updated.id,
        triggeredById: userId,
      }).catch((err) => console.error('[CustomerQuotation] admin reject notification failed:', err));

      void NotificationService.notify({
        type: NotificationType.SYSTEM_ALERT,
        title: 'Customer Rejected Quotation',
        message: `Customer ${req.user!.email} rejected quotation ${quotation.quotationNumber}.${rejectReason}`,
        module: 'QUOTATION',
        roleTarget: UserRole.SUPER_ADMIN,
        relatedId: updated.id,
        triggeredById: userId,
      }).catch((err) => console.error('[CustomerQuotation] super-admin reject notification failed:', err));

      res.json({
        success: true,
        data: updated,
        message: 'Quotation rejected successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
