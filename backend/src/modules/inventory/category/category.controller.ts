/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';
import { getPaginationParams } from '@/common/utils/pagination';
import { emitToAll } from '@/modules/realtime/socket.service';
import { t } from '@/common/i18n';

export class CategoryController {
  /**
   * @swagger
   * /api/inventory/categories:
   *   post:
   *     summary: Create a new category
   *     tags: [Inventory - Categories]
   *     security: [{ bearerAuth: [] }]
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        image: req.file ? `/uploads/categories/${req.file.filename}` : undefined,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        // Bilingual fields forwarded as-is
        nameEn: req.body.nameEn,
        descriptionEn: req.body.descriptionEn,
        nameAr: req.body.nameAr,
        descriptionAr: req.body.descriptionAr,
      };
      const category = await categoryService.create(data, req.locale);
      emitToAll('category:created', { id: category.id });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/categories:
   *   get:
   *     summary: List all categories with filters and pagination
   *     tags: [Inventory - Categories]
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = {
        search: req.query.search as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      };
      const result = await categoryService.list(filters, pagination, req.locale);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/categories/summary:
   *   get:
   *     summary: Get categories summary
   *     tags: [Inventory - Categories]
   */
  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await categoryService.getSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/categories/{id}:
   *   get:
   *     summary: Get category by ID
   *     tags: [Inventory - Categories]
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.getById(String(req.params.id), req.locale);
      res.json({ success: true, data: category });
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
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = {
        ...req.body,
        image: req.file ? `/uploads/categories/${req.file.filename}` : undefined,
        isActive: req.body.isActive !== undefined ? (req.body.isActive === 'true' || req.body.isActive === true) : undefined,
        // Bilingual fields
        nameEn: req.body.nameEn,
        descriptionEn: req.body.descriptionEn,
        nameAr: req.body.nameAr,
        descriptionAr: req.body.descriptionAr,
      };
      const category = await categoryService.update(String(req.params.id), data, req.locale);
      emitToAll('category:updated', { id: category.id });
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
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedId = String(req.params.id);
      await categoryService.delete(deletedId);
      emitToAll('category:deleted', { id: deletedId });
      res.json({ success: true, message: t('category.deleteSuccess', req.locale) });
    } catch (error) {
      next(error);
    }
  }

  async bulkDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoryService.bulkDelete(req.body.ids || []);
      res.json({
        success: true,
        message: t('category.bulkDelete', req.locale),
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();

