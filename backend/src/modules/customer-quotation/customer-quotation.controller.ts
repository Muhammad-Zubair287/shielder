/**
 * Customer Quotation Controller
 * Self-service, instant quotation generation by authenticated customers.
 * No admin approval required.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/global';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/api.error';
// @ts-ignore
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';

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
   *             required: [companyName, vatNumber, address, products]
   *             properties:
   *               companyName: { type: string }
   *               vatNumber: { type: string, description: 10-20 digit Saudi VAT number }
   *               address: { type: string }
   *               products:
   *                 type: array
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

      const { companyName, vatNumber, address, products } = req.body;

      // ── Validate inputs ────────────────────────────────────────────────────

      if (!companyName?.trim()) throw new BadRequestError('Company name is required');
      if (!vatNumber?.trim())   throw new BadRequestError('VAT number is required');
      if (!validateVAT(vatNumber)) throw new BadRequestError('VAT number format is invalid (10–20 digits)');
      if (!address?.trim())     throw new BadRequestError('Address is required');
      if (!Array.isArray(products) || products.length === 0)
        throw new BadRequestError('At least one product is required');

      // ── Fetch real prices & validate products ──────────────────────────────

      let subtotal = new Prisma.Decimal(0);
      const resolvedItems: any[] = [];

      for (const item of products) {
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
          product.translations.find((t: any) => t.locale === lang) ||
          product.translations.find((t: any) => t.locale === 'en') ||
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

      const quotation = await prisma.quotation.create({
        data: {
          quotationNumber,
          customerName:    req.user!.email,
          customerEmail:   req.user!.email,
          companyName:     companyName.trim(),
          customerAddress: address.trim(),
          subtotal,
          discount:        new Prisma.Decimal(0),
          tax:             new Prisma.Decimal(0),
          total,
          quotationDate:   new Date(),
          expiryDate,
          createdById:     userId,
          notes:           `VAT: ${vatNumber.trim()}`,
          items: { create: resolvedItems },
          activities: {
            create: {
              action:      'CREATED' as any,
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
                  attachments: { where: { type: 'IMAGE' }, take: 1 },
                },
              },
            },
          },
        },
      });

      // Enrich items with thumbnail
      const enrichedItems = quotation.items.map((item: any) => ({
        ...item,
        thumbnail: item.product.attachments?.[0]?.fileUrl || (item.product as any).mainImage || null,
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

      const quotation: any = await prisma.quotation.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  attachments: { where: { type: 'IMAGE' }, take: 1 },
                },
              },
            },
          },
        },
      });

      if (!quotation) throw new NotFoundError('Quotation not found');
      if (quotation.createdById !== userId) throw new NotFoundError('Quotation not found');

      const lang = req.user!.preferredLanguage || req.locale || 'en';
      const enrichedItems = (quotation.items as any[]).map((item: any) => {
        const translation =
          item.product.translations.find((t: any) => t.locale === lang) ||
          item.product.translations.find((t: any) => t.locale === 'en') ||
          item.product.translations[0];
        return {
          ...item,
          productName: translation?.name || item.productName,
          thumbnail:   item.product.attachments?.[0]?.fileUrl || (item.product as any).mainImage || null,
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

      const quotation: any = await prisma.quotation.findUnique({
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

      const topY = 110;
      doc.fillColor('#374151').font('Helvetica').fontSize(9);

      // Left: company info
      doc
        .font('Helvetica-Bold').fillColor('#0D1637').fontSize(11)
        .text(quotation.companyName || '', MARGIN, topY)
        .font('Helvetica').fillColor('#6B7280').fontSize(9)
        .text(`VAT: ${vatNumber}`, MARGIN, topY + 18)
        .text(quotation.customerAddress || '', MARGIN, topY + 32)
        .text(quotation.customerEmail, MARGIN, topY + 46);

      // Right: quotation details
      doc
        .font('Helvetica-Bold').fillColor('#0D1637').fontSize(9)
        .text('Quotation No:', PAGE_WIDTH - MARGIN - 200, topY, { width: 200, align: 'right' })
        .font('Helvetica').fillColor('#374151')
        .text(quotation.quotationNumber, PAGE_WIDTH - MARGIN - 200, topY + 14, { width: 200, align: 'right' })
        .font('Helvetica-Bold').fillColor('#0D1637')
        .text('Date:', PAGE_WIDTH - MARGIN - 200, topY + 32, { width: 200, align: 'right' })
        .font('Helvetica').fillColor('#374151')
        .text(new Date(quotation.quotationDate).toLocaleDateString('en-GB'), PAGE_WIDTH - MARGIN - 200, topY + 46, { width: 200, align: 'right' })
        .font('Helvetica-Bold').fillColor('#0D1637')
        .text('Valid Until:', PAGE_WIDTH - MARGIN - 200, topY + 64, { width: 200, align: 'right' })
        .font('Helvetica').fillColor('#374151')
        .text(new Date(quotation.expiryDate).toLocaleDateString('en-GB'), PAGE_WIDTH - MARGIN - 200, topY + 78, { width: 200, align: 'right' });

      // ── Divider ────────────────────────────────────────────────────────────

      const divY = topY + 100;
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
      for (const item of (quotation.items as any[])) {
        const rowHeight = 28;

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
          .text(item.productName, colName + 4, rowY + 6, { width: COL_WIDTH * 0.52 });

        doc
          .fillColor('#374151')
          .font('Helvetica')
          .fontSize(9)
          .text(String(item.quantity), colQty, rowY + 6, { width: 60, align: 'center' })
          .text(`SAR ${Number(item.unitPrice).toFixed(2)}`, colPrice, rowY + 6, { width: 70, align: 'right' })
          .text(`SAR ${Number(item.totalPrice).toFixed(2)}`, colTotal, rowY + 6, { width: 70, align: 'right' });

        rowY += rowHeight;
      }

      // ── Totals ─────────────────────────────────────────────────────────────

      const totalsTop = rowY + 20;

      // Draw totals box
      doc
        .fillColor('#F9FAFB')
        .rect(PAGE_WIDTH - MARGIN - 220, totalsTop, 220, 90)
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

      totRow('Subtotal:', `SAR ${Number(quotation.subtotal).toFixed(2)}`, false, 10);
      totRow('Shipping:', 'Free', false, 28);
      doc.strokeColor('#E5E7EB').lineWidth(0.5)
        .moveTo(tL, totalsTop + 50).lineTo(tR, totalsTop + 50).stroke();
      totRow('TOTAL:', `SAR ${Number(quotation.total).toFixed(2)}`, true, 60);

      // ── Footer ─────────────────────────────────────────────────────────────

      const footerY = doc.page.height - 70;
      doc
        .strokeColor('#E5E7EB').lineWidth(1)
        .moveTo(MARGIN, footerY).lineTo(PAGE_WIDTH - MARGIN, footerY).stroke();

      doc
        .fillColor('#9CA3AF').font('Helvetica').fontSize(8)
        .text('This quotation is valid for 30 days from the date of issue.', MARGIN, footerY + 10)
        .text('Shielder Industrial Filters | Saudi Arabia', MARGIN, footerY + 24)
        .text(`Generated: ${new Date().toLocaleString()}`, PAGE_WIDTH - MARGIN - 200, footerY + 24, { width: 200, align: 'right' });

      doc.end();
    } catch (err) {
      next(err);
    }
  }
}
