import { Request, Response, NextFunction } from 'express';
import { subcategoryService } from './subcategory.service';

export class SubcategoryController {
  /**
   * @swagger
   * /api/inventory/subcategories:
   *   post:
   *     summary: Create a new subcategory
   *     tags: [Inventory - Subcategories]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [categoryId]
   *             properties:
   *               categoryId: { type: string, format: uuid }
   *               translations:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     locale: { type: string }
   *                     name: { type: string }
   *     responses:
   *       201:
   *         description: Subcategory created
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const subcategory = await subcategoryService.create(req.body);
      res.status(201).json({ success: true, data: subcategory });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/subcategories:
   *   get:
   *     summary: List subcategories
   *     tags: [Inventory - Subcategories]
   *     parameters:
   *       - in: query
   *         name: categoryId
   *         description: Filter by parent category
   *         schema: { type: string, format: uuid }
   *       - in: query
   *         name: locale
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: List of subcategories
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId, locale } = req.query;
      const subcategories = await subcategoryService.list(
        categoryId as string,
        locale as string
      );
      res.json({ success: true, data: subcategories });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/subcategories/{id}:
   *   put:
   *     summary: Update subcategory
   *     tags: [Inventory - Subcategories]
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
   *         description: Subcategory updated
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const subcategory = await subcategoryService.update(req.params.id as string, req.body);
      res.json({ success: true, data: subcategory });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/subcategories/{id}:
   *   delete:
   *     summary: Delete subcategory
   *     tags: [Inventory - Subcategories]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Subcategory deleted
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await subcategoryService.delete(req.params.id as string);
      res.json({ success: true, message: 'Subcategory deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const subcategoryController = new SubcategoryController();
