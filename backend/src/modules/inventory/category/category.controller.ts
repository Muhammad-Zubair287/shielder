import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';

export class CategoryController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = req.query.locale as string;
      const categories = await categoryService.list(locale);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.update(String(req.params.id), req.body);
      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

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
