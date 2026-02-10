import { Request, Response, NextFunction } from 'express';
import { specificationService } from './specification.service';

export class SpecificationController {
  async createDefinition(req: Request, res: Response, next: NextFunction) {
    try {
      const definition = await specificationService.createDefinition(req.body);
      res.status(201).json({ success: true, data: definition });
    } catch (error) {
      next(error);
    }
  }

  async listDefinitions(req: Request, res: Response, next: NextFunction) {
    try {
      const { locale } = req.query;
      const definitions = await specificationService.listDefinitions(locale as string);
      res.json({ success: true, data: definitions });
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateDefinitions(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await specificationService.bulkCreateDefinitions(req.body);
      res.status(201).json({ success: true, count: results.length, data: results });
    } catch (error) {
      next(error);
    }
  }
}

export const specificationController = new SpecificationController();
