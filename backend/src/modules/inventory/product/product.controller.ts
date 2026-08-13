/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import { ProductStatus } from '@prisma/client';
import {
  deleteProductImageByRef,
  resolvePublicProductImageUrl,
  storeProductImageFile,
} from '@/common/services/product-image.service';
import { deleteStoredRefIfUnused } from '@/common/storage/storage-image.helper';
import { emitToAll } from '@/modules/realtime/socket.service';
import { t } from '@/common/i18n';

const parseOptionalNumberQuery = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeProductResponse = (req: Request, product: any) => {
  if (!product) return product;

  const locale = (req as any).locale || 'en';
  const updatedAt = product.updatedAt || product.updated_at || product.createdAt || product.created_at;

  return {
    ...product,
    statusLabel: product.status ? t(`productStatus.${product.status}`, locale) : undefined,
    mainImage: resolvePublicProductImageUrl(req, product.mainImage, updatedAt),
    attachments: Array.isArray(product.attachments)
      ? product.attachments.map((attachment: any) => ({
          ...attachment,
          fileUrl: resolvePublicProductImageUrl(req, attachment.fileUrl, attachment.updatedAt || updatedAt),
        }))
      : product.attachments,
  };
};

export class ProductController {
  async getFilters(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = (req.query.locale as string) || (req.headers['accept-language'] as string) || 'en';
      const filters = await productService.getFiltersMetadata(locale);
      res.json({ success: true, data: filters });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products:
   *   post:
   *     summary: Create a new product
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.body);
      emitToAll('product:created', { id: product.id });
      res.status(201).json({ success: true, data: normalizeProductResponse(req, product) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/summary:
   *   get:
   *     summary: Get product summary stats for SuperAdmin
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await productService.getSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/management:
   *   get:
   *     summary: List and filter products for management (SuperAdmin)
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async listForManagement(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        categoryId: req.query.categoryId as string,
        subcategoryId: req.query.subcategoryId as string,
        brandId: req.query.brandId as string,
        supplierId: req.query.supplierId as string,
        status: req.query.status as ProductStatus,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        locale: (req.query.locale as string) || (req.headers['accept-language'] as string) || 'en',
      };
      
      const result = await productService.getProductsForManagement(filters);
      res.json({
        success: true,
        ...result,
        products: result.products.map((product) => normalizeProductResponse(req, product)),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products:
   *   get:
   *     summary: List and filter products dynamically (Public/User)
   *     tags: [Inventory - Products]
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        categoryId,
        subcategoryId,
        brandId,
        minPrice,
        maxPrice,
        inStock,
        sort,
        search,
        page,
        limit,
        locale,
        ...rest
      } = req.query;

      // Extract dynamic specs (spec_key=val1,val2)
      const specs: Record<string, string[]> = {};
      Object.entries(rest).forEach(([key, value]) => {
        if (key.startsWith('spec_')) {
          const specKey = key.replace('spec_', '');
          specs[specKey] = (value as string).split(',');
        }
      });

      const result = await productService.filterProducts({
        categoryId: categoryId as string,
        subcategoryId: subcategoryId as string,
        brandId: brandId as string,
        minPrice: parseOptionalNumberQuery(minPrice),
        maxPrice: parseOptionalNumberQuery(maxPrice),
        inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
        search: search as string,
        specs,
        sort: sort as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 12,
        locale: locale as string,
      });

      res.json({
        success: true,
        ...result,
        products: result.products.map((product) => normalizeProductResponse(req, product)),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/{id}:
   *   get:
   *     summary: Get product by ID
   *     tags: [Inventory - Products]
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = (req.query.locale as string) || (req.headers['accept-language'] as string) || 'en';
      const product = await productService.getById(String(req.params.id), locale);
      res.json({ success: true, data: normalizeProductResponse(req, product) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/pending:
   *   get:
   *     summary: List pending products for approval
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async getPending(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: ProductStatus.PENDING,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        locale: (req.query.locale as string) || (req.headers['accept-language'] as string) || 'en',
      };
      const result = await productService.getProductsForManagement(filters);
      res.json({
        success: true,
        ...result,
        products: result.products.map((product) => normalizeProductResponse(req, product)),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/{id}/approve:
   *   patch:
   *     summary: Approve product
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.approveProduct(String(req.params.id));
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async bulkUpload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: t('product.noFileUploaded', req.locale) });
      }
      const result = await productService.bulkUpload(req.file.buffer, req.file.mimetype);
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  async downloadTemplate(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await productService.generateTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=product_import_template.xlsx');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/{id}/reject:
   *   patch:
   *     summary: Reject product
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.rejectProduct(String(req.params.id));
      res.json({ success: true, data: normalizeProductResponse(req, product) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/{id}:
   *   put:
   *     summary: Update product
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.update(String(req.params.id), req.body);
      emitToAll('product:updated', { id: product.id });
      res.json({ success: true, data: normalizeProductResponse(req, product) });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/{id}:
   *   delete:
   *     summary: Delete product
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedId = String(req.params.id);
      await productService.delete(deletedId);
      emitToAll('product:deleted', { id: deletedId });
      res.json({ success: true, message: t('product.deleteSuccess', req.locale) });
    } catch (error) {
      next(error);
    }
  }

  async bulkDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.bulkDelete(req.body.ids || []);
      res.json({
        success: true,
        message: t('product.bulkDelete', req.locale),
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/{id}/images:
   *   post:
   *     summary: Upload / replace the main product image
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   */
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    let storedRef: string | null = null;
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: t('product.noImageFile', req.locale) });
        return;
      }

      const productId = String(req.params.id);
      const existing = await productService.getById(productId);
      const oldImageRef = existing?.mainImage || null;

      const storedImage = await storeProductImageFile(req.file, productId);
      storedRef = storedImage.path;

      const product = await productService.update(productId, {
        mainImage: storedRef,
        updatedAt: new Date(),
      });

      if (!product.mainImage) {
        if (storedRef) {
          await deleteProductImageByRef(storedRef);
        }
        res.status(500).json({
          success: false,
          message: t('product.dbUpdateFailed', req.locale),
        });
        return;
      }

      await deleteStoredRefIfUnused(oldImageRef);

      const versionedUrl = resolvePublicProductImageUrl(req, storedRef, product.updatedAt);

      res.json({
        success: true,
        data: {
          mainImage: versionedUrl,
          product: normalizeProductResponse(req, product),
        },
      });
    } catch (error) {
      if (storedRef) {
        await deleteProductImageByRef(storedRef);
      }
      next(error);
    }
  }

  // Specifications
  async assignSpecifications(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.assignSpecifications(String(req.params.id), req.body.specifications);
      res.json({ success: true, message: t('product.specificationsAssigned', req.locale) });
    } catch (error) {
      next(error);
    }
  }

  // Attachments
  async addAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachment = await productService.addAttachment(String(req.params.id), req.body);
      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      next(error);
    }
  }

  async listAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const attachments = await productService.listAttachments(String(req.params.id));
      res.json({ success: true, data: attachments });
    } catch (error) {
      next(error);
    }
  }

  async deleteAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.deleteAttachment(String(req.params.id), String(req.params.attachmentId));
      res.json({ success: true, message: t('product.attachmentDeleted', req.locale) });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
