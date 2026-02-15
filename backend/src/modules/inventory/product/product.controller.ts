import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';

export class ProductController {
  /**
   * @swagger
   * /api/inventory/products:
   *   post:
   *     summary: Create a new product
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               categoryId: { type: string, format: uuid }
   *               subcategoryId: { type: string, format: uuid }
   *               brandId: { type: string, format: uuid }
   *               price: { type: number }
   *               stock: { type: number }
   *               translations:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     locale: { type: string }
   *                     name: { type: string }
   *                     description: { type: string }
   *     responses:
   *       201:
   *         description: Product created
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
   * /api/inventory/products:
   *   get:
   *     summary: List and filter products dynamically
   *     tags: [Inventory - Products]
   *     parameters:
   *       - in: query
   *         name: categoryId
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: subcategoryId
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: brandId
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: minPrice
   *         schema: { type: number }
   *       - in: query
   *         name: maxPrice
   *         schema: { type: number }
   *       - in: query
   *         name: inStock
   *         schema: { type: string, enum: [true, false] }
   *       - in: query
   *         name: spec_ram
   *         description: Dynamic spec filter (e.g., 8,16). You can use any spec key defined in the database.
   *         schema: { type: string }
   *       - in: query
   *         name: sort
   *         schema: { type: string, enum: [price_asc, price_desc, newest] }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: locale
   *         schema: { type: string, default: en }
   *     responses:
   *       200:
   *         description: Filtered products and available sidebar filters
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
        specs,
        sort: sort as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
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
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: locale
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Product details
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { locale } = req.query;
      const product = await productService.getById(String(req.params.id), locale as string);
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
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               price: { type: number }
   *               stock: { type: number }
   *               isActive: { type: boolean }
   *     responses:
   *       200:
   *         description: Product updated
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
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Product deleted
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.delete(String(req.params.id));
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Specifications
  /**
   * @swagger
   * /api/inventory/products/{id}/specifications:
   *   post:
   *     summary: Assign specifications to product
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               specifications:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     specificationId: { type: string, format: uuid }
   *                     value: { type: string }
   *     responses:
   *       200:
   *         description: Specs assigned
   */
  async assignSpecifications(req: Request, res: Response, next: NextFunction) {
    try {
      await productService.assignSpecifications(String(req.params.id), req.body.specifications);
      res.json({ success: true, message: 'Specifications assigned successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Attachments
  /**
   * @swagger
   * /api/inventory/products/{id}/attachments:
   *   post:
   *     summary: Add product attachment
   *     tags: [Inventory - Products]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               type: { type: string, enum: [IMAGE, DATASHEET, MANUAL, CERTIFICATE] }
   *               fileName: { type: string }
   *               fileUrl: { type: string }
   *               mimeType: { type: string }
   *               size: { type: number }
   *     responses:
   *       201:
   *         description: Attachment added
   */
  async addAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachment = await productService.addAttachment(String(req.params.id), req.body);
      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/products/{id}/attachments:
   *   get:
   *     summary: List product attachments
   *     tags: [Inventory - Products]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: List of attachments
   */
  async listAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const attachments = await productService.listAttachments(String(req.params.id));
      res.json({ success: true, data: attachments });
    } catch (error) {
      next(error);
    }
  }

  async getPending(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getPendingProducts();
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.approveProduct(req.params.id);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.rejectProduct(req.params.id);
      res.json({ success: true, data: product });
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
