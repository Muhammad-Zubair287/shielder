import { Request, Response, NextFunction } from 'express';
import { subcategoryService } from './subcategory.service';

export class SubcategoryController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const subcategory = await subcategoryService.create(req.body);
      res.status(201).json({ success: true, data: subcategory });
    } catch (error) {
      next(error);
    }
  }

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

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const subcategory = await subcategoryService.update(req.params.id, req.body);
      res.json({ success: true, data: subcategory });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await subcategoryService.delete(req.params.id);
      res.json({ success: true, message: 'Subcategory deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const subcategoryController = new SubcategoryController();
