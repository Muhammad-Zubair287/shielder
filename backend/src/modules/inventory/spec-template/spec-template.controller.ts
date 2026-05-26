/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

import { Request, Response, NextFunction } from 'express';
import { specTemplateService } from './spec-template.service';

export class SpecTemplateController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await specTemplateService.create(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async getByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = (req.params.categoryId || req.query.categoryId) as string;
      const { subcategoryId } = req.query;
      
      if (!categoryId) {
        res.status(400).json({ success: false, message: 'categoryId is required' });
        return;
      }

      const templates = await specTemplateService.getByCategory(categoryId, subcategoryId as string);
      res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await specTemplateService.delete(String(req.params.id));
      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const specTemplateController = new SpecTemplateController();
