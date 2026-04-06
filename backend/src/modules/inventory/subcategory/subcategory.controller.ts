import { Request, Response, NextFunction } from 'express';
import { subcategoryService } from './subcategory.service';
import { getPaginationParams } from '@/common/utils/pagination';

export class SubcategoryController {
  /**
   * @swagger
   * /api/inventory/subcategories:
   *   post:
   *     summary: Create a new subcategory
   *     tags: [Inventory - Subcategories]
   *     security: [{ bearerAuth: [] }]
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const image = req.file ? `/uploads/categories/${req.file.filename}` : undefined;
      const subcategory = await subcategoryService.create({
        ...req.body,
        image,
        isActive: req.body.isActive === 'true' || req.body.isActive === true,
        nameEn: req.body.nameEn,
        descriptionEn: req.body.descriptionEn,
        nameAr: req.body.nameAr,
        descriptionAr: req.body.descriptionAr,
      }, req.locale);
      res.status(201).json({ success: true, data: subcategory });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/subcategories:
   *   get:
   *     summary: List subcategories with pagination and search
   *     tags: [Inventory - Subcategories]
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = {
        search: req.query.search as string,
        categoryId: req.query.categoryId as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
      };
      const locale = (req.query.locale as string) || req.locale || 'en';
      
      const result = await subcategoryService.list(filters, pagination, locale);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/subcategories/summary:
   *   get:
   *     summary: Get subcategory summary stats
   *     tags: [Inventory - Subcategories]
   */
  async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await subcategoryService.getSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/inventory/subcategories/{id}:
   *   get:
   *     summary: Get subcategory by ID
   *     tags: [Inventory - Subcategories]
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = (req.query.locale as string) || req.locale || 'en';
      const subcategory = await subcategoryService.getById(String(req.params.id), locale);
      res.json({ success: true, data: subcategory });
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
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const image = req.file ? `/uploads/categories/${req.file.filename}` : undefined;
      const subcategory = await subcategoryService.update(String(req.params.id), {
        ...req.body,
        image,
        isActive: req.body.isActive !== undefined ? (req.body.isActive === 'true' || req.body.isActive === true) : undefined,
        nameEn: req.body.nameEn,
        descriptionEn: req.body.descriptionEn,
        nameAr: req.body.nameAr,
        descriptionAr: req.body.descriptionAr,
      }, req.locale);
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
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await subcategoryService.delete(String(req.params.id));
      res.json({ success: true, message: 'Subcategory deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async bulkDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await subcategoryService.bulkDelete(req.body.ids || []);
      res.json({
        success: true,
        message: 'Bulk delete completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const subcategoryController = new SubcategoryController();
