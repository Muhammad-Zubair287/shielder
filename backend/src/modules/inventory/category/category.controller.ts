import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';

export class CategoryController {
  /**
   * @swagger
   * /api/inventory/categories:
   *   post:
   *     summary: Create a new category
   *     tags: [Inventory - Categories]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
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
   *         description: Category created
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/categories:
   *   get:
   *     summary: List all categories
   *     tags: [Inventory - Categories]
   *     parameters:
   *       - in: query
   *         name: locale
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: List of categories
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = req.query.locale as string;
      const categories = await categoryService.list(locale);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/categories/{id}:
   *   put:
   *     summary: Update category
   *     tags: [Inventory - Categories]
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
   *               translations:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     locale: { type: string }
   *                     name: { type: string }
   *     responses:
   *       200:
   *         description: Category updated
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.update(String(req.params.id), req.body);
      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/categories/{id}:
   *   delete:
   *     summary: Delete category
   *     tags: [Inventory - Categories]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Category deleted
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await categoryService.delete(String(req.params.id));
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
