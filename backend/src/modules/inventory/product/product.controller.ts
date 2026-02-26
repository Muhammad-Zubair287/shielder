import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import { ProductStatus } from '@prisma/client';

export class ProductController {
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
      res.status(201).json({ success: true, data: product });
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
      res.json({ success: true, ...result });
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
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
        search: search as string,
        specs,
        sort: sort as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 12,
        locale: locale as string,
      });

      res.json({ success: true, ...result });
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
      res.json({ success: true, data: product });
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
      res.json({ success: true, ...result });
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
        return res.status(400).json({ success: false, message: 'Please upload a file' });
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
      res.json({ success: true, data: product });
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
      res.json({ success: true, data: product });
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
      await productService.delete(String(req.params.id));
      res.json({ success: true, message: 'Product deleted successfully' });
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
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No image file provided' });
        return;
      }
      const imageUrl = `/uploads/products/${req.file.filename}`;
      const product = await productService.update(String(req.params.id), { mainImage: imageUrl });
      res.json({ success: true, data: { mainImage: imageUrl, product } });
    } catch (error) {
      next(error);
    }
  }

  // Specifications
  async assignSpecifications(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.assignSpecifications(String(req.params.id), req.body.specifications);
      res.json({ success: true, message: 'Specifications assigned successfully' });
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
      res.json({ success: true, message: 'Attachment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
